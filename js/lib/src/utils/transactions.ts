import { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import { web3 } from "@project-serum/anchor";
import log from "loglevel";

export const DEFAULT_TIMEOUT = 15000;

export const getUnixTs = () => {
  return new Date().getTime() / 1000;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BlockhashAndFeeCalculator {
  blockhash: web3.Blockhash;
  feeCalculator: web3.FeeCalculator;
}

export const sendTransactionWithRetryWithKeypair = async (
  connection: web3.Connection,
  wallet: web3.Keypair,
  instructions: web3.TransactionInstruction[],
  signers: web3.Keypair[],
  commitment: web3.Commitment = "singleGossip",
  includesFeePayer: boolean = false,
  block?: BlockhashAndFeeCalculator,
  beforeSend?: () => void
) => {
  const transaction = new web3.Transaction();
  instructions.forEach((instruction) => transaction.add(instruction));
  transaction.recentBlockhash = (
    block || (await connection.getRecentBlockhash(commitment))
  ).blockhash;

  if (includesFeePayer) {
    transaction.setSigners(...signers.map((s) => s.publicKey));
  } else {
    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      ...signers.map((s) => s.publicKey)
    );
  }

  if (signers.length > 0) {
    transaction.sign(...[wallet, ...signers]);
  } else {
    transaction.sign(wallet);
  }

  if (beforeSend) {
    beforeSend();
  }

  const { txid, slot } = await sendSignedTransaction({
    connection,
    signedTransaction: transaction,
  });

  return { txid, slot };
};

export async function sendTransactionWithRetry(
  connection: web3.Connection,
  wallet: Wallet,
  instructions: Array<web3.TransactionInstruction>,
  signers: Array<web3.Keypair>,
  commitment: web3.Commitment = "singleGossip"
): Promise<string | { txid: string; slot: number }> {
  const transaction = new web3.Transaction();
  instructions.forEach((instruction) => transaction.add(instruction));
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash(commitment)
  ).blockhash;

  transaction.feePayer = wallet.publicKey;

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }

  wallet.signTransaction(transaction);

  return sendSignedTransaction({
    connection,
    signedTransaction: transaction,
  });
}

export async function sendSignedTransaction({
  signedTransaction,
  connection,
  timeout = DEFAULT_TIMEOUT,
}: {
  signedTransaction: web3.Transaction;
  connection: web3.Connection;
  sendingMessage?: string;
  sentMessage?: string;
  successMessage?: string;
  timeout?: number;
}): Promise<{ txid: string; slot: number }> {
  const rawTransaction = signedTransaction.serialize();
  const startTime = getUnixTs();
  let slot = 0;
  const txid: web3.TransactionSignature = await connection.sendRawTransaction(
    rawTransaction,
    {
      skipPreflight: true,
    }
  );

  log.debug("Started awaiting confirmation for", txid);

  let done = false;
  (async () => {
    while (!done && getUnixTs() - startTime < timeout) {
      connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
      });
      await sleep(500);
    }
  })();
  try {
    const confirmation = await awaitTransactionSignatureConfirmation(
      txid,
      timeout,
      connection,
      "confirmed",
      true
    );

    if (!confirmation)
      throw new Error("Timed out awaiting confirmation on transaction");

    if (confirmation.err) {
      log.error(confirmation.err);
      throw new Error("Transaction failed: Custom instruction error");
    }

    slot = confirmation?.slot || 0;
  } catch (err) {
    log.error("Timeout Error caught", err);
    if (err.timeout) {
      throw new Error("Timed out awaiting confirmation on transaction");
    }
    let simulateResult: web3.SimulatedTransactionResponse | null = null;
    try {
      simulateResult = (
        await simulateTransaction(connection, signedTransaction, "single")
      ).value;
    } catch (e) {
      log.error("Simulate Transaction error", e);
    }
    if (simulateResult && simulateResult.err) {
      if (simulateResult.logs) {
        for (let i = simulateResult.logs.length - 1; i >= 0; --i) {
          const line = simulateResult.logs[i];
          if (line.startsWith("Program log: ")) {
            throw new Error(
              "Transaction failed: " + line.slice("Program log: ".length)
            );
          }
        }
      }
      throw new Error(JSON.stringify(simulateResult.err));
    }
    log.error("Got this far.");
    // throw new Error('Transaction failed');
  } finally {
    done = true;
  }

  log.debug("Latency (ms)", txid, getUnixTs() - startTime);
  return { txid, slot };
}

async function simulateTransaction(
  connection: web3.Connection,
  transaction: web3.Transaction,
  commitment: web3.Commitment
): Promise<web3.RpcResponseAndContext<web3.SimulatedTransactionResponse>> {
  // @ts-ignore
  transaction.recentBlockhash = await connection._recentBlockhash(
    // @ts-ignore
    connection._disableBlockhashCaching
  );

  const signData = transaction.serializeMessage();
  // @ts-ignore
  const wireTransaction = transaction._serialize(signData);
  const encodedTransaction = wireTransaction.toString("base64");
  const config: any = { encoding: "base64", commitment };
  const args = [encodedTransaction, config];

  // @ts-ignore
  const res = await connection._rpcRequest("simulateTransaction", args);
  if (res.error) {
    throw new Error("failed to simulate transaction: " + res.error.message);
  }
  return res.result;
}

async function awaitTransactionSignatureConfirmation(
  txid: web3.TransactionSignature,
  timeout: number,
  connection: web3.Connection,
  commitment: web3.Commitment = "recent",
  queryStatus = false
): Promise<web3.SignatureStatus | null | void> {
  let done = false;
  let status: web3.SignatureStatus | null | void = {
    slot: 0,
    confirmations: 0,
    err: null,
  };
  let subId = 0;
  // eslint-disable-next-line no-async-promise-executor
  status = await new Promise(async (resolve, reject) => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      log.warn("Rejecting for timeout...");
      reject({ timeout: true });
    }, timeout);
    try {
      subId = connection.onSignature(
        txid,
        (result, context) => {
          done = true;
          status = {
            err: result.err,
            slot: context.slot,
            confirmations: 0,
          };
          if (result.err) {
            log.warn("Rejected via websocket", result.err);
            reject(status);
          } else {
            log.debug("Resolved via websocket", result);
            resolve(status);
          }
        },
        commitment
      );
    } catch (e) {
      done = true;
      log.error("WS error in setup", txid, e);
    }
    while (!done && queryStatus) {
      // eslint-disable-next-line no-loop-func
      (async () => {
        try {
          const signatureStatuses = await connection.getSignatureStatuses([
            txid,
          ]);
          status = signatureStatuses && signatureStatuses.value[0];
          if (!done) {
            if (!status) {
              log.debug("REST null result for", txid, status);
            } else if (status.err) {
              log.error("REST error for", txid, status);
              done = true;
              reject(status.err);
            } else if (!status.confirmations) {
              log.debug("REST no confirmations for", txid, status);
            } else {
              log.debug("REST confirmation for", txid, status);
              done = true;
              resolve(status);
            }
          }
        } catch (e) {
          if (!done) {
            log.error("REST connection error: txid", txid, e);
          }
        }
      })();
      await sleep(2000);
    }
  });

  //@ts-ignore
  if (connection._subscriptionsByHash[subId])
    connection.removeSignatureListener(subId);
  done = true;
  log.debug("Returning status", status);
  return status;
}
