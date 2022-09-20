import { WebBundlr } from "@bundlr-network/client";
import { sendSignedTransaction } from "@raindrop-studios/sol-kit/dist/src/transaction";
import {
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SignatureStatus,
  SystemProgram,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import nacl from "tweetnacl";

export const uploadFileToArweave = async ({
  connection,
  file,
  name,
  user,
}: {
  connection: Connection;
  user: Keypair;
  file: Buffer;
  name: string;
}) => {
  const funderKeypair = Keypair.generate();
  const bundlr = new WebBundlr("https://node1.bundlr.network", "solana", {
    publicKey: funderKeypair.publicKey,
    sendTransaction: async (data: Transaction) => {
      data.signatures.push({
        publicKey: funderKeypair.publicKey,
        signature: null,
      });

      // @ts-ignore
      data.recentBlockhash = await connection._recentBlockhash(
        // @ts-ignore
        connection._disableBlockhashCaching
      );

      data.partialSign(funderKeypair);

      const { txid, slot } = await sendSignedTransaction({
        connection,
        signedTransaction: data,
      });

      await awaitTransactionSignatureConfirmation(
        txid,
        60000,
        connection,
        "max",
        true
      );
      console.log("Uploaded", txid);
      return txid;
    },
    signMessage: async (data: Uint8Array): Promise<Uint8Array> => {
      return nacl.sign.detached(data, funderKeypair.secretKey);
    },
  });
  await bundlr.ready();

  const imgSize = Buffer.byteLength(file);
  console.log("img size bytes:", imgSize);

  const imgUploadPrice = await bundlr.getPrice(imgSize);
  console.log("img upload cost:", imgUploadPrice.toNumber());

  console.log("Funding...");

  const sendFundsToKeypairTx = new Transaction();
  sendFundsToKeypairTx.instructions.push(
    SystemProgram.transfer({
      toPubkey: funderKeypair.publicKey,
      fromPubkey: new PublicKey(user),
      lamports: 2 * imgUploadPrice.toNumber(),
    })
  );
  sendFundsToKeypairTx.feePayer = new PublicKey(user);
  // @ts-ignore
  sendFundsToKeypairTx.recentBlockhash = await connection._recentBlockhash(
    // @ts-ignore
    connection._disableBlockhashCaching
  );
  sendFundsToKeypairTx.signatures.push({
    publicKey: new PublicKey(user),
    signature: null,
  });

  sendFundsToKeypairTx.partialSign(user);

  const { txid, slot } = await sendSignedTransaction({
    connection,
    signedTransaction: sendFundsToKeypairTx,
  });

  await awaitTransactionSignatureConfirmation(
    txid,
    60000,
    connection,
    "max",
    true
  );

  try {
    let response = await bundlr.fund(2 * imgUploadPrice.toNumber());
    console.log(response);
  } catch (e) {
    console.log("Funding call failed, trying anyway");
    console.error(e);
  }

  for (let i = 0; i < 6; i++) {
    const currentBundlrBal = await bundlr.getLoadedBalance();
    console.log("current bal:", currentBundlrBal.toNumber());
    if (currentBundlrBal.toNumber() > imgUploadPrice.toNumber()) break;
    else {
      console.log("Sleeping on funder being funded");
      await sleep(5000);
    }
  }

  const imgUploadResp = await bundlr.uploader.upload(
    file,
    //@ts-ignore
    [{ name: "Content-Type", value: "image/" + fileType }]
  );
  console.log(imgUploadResp);

  return "https://arweave.net/" + imgUploadResp.data.id;
};

export async function awaitTransactionSignatureConfirmation(
  txid: TransactionSignature,
  timeout: number,
  connection: Connection,
  commitment: Commitment = "recent",
  queryStatus = false
): Promise<SignatureStatus | null | void> {
  let done = false;
  let status: SignatureStatus | null | void = {
    slot: 0,
    confirmations: 0,
    err: null,
  };
  let subId = 0;
  status = await new Promise(async (resolve, reject) => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      console.log("Rejecting for timeout...");
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
            console.log("Rejected via websocket", result.err);
            reject(status);
          } else {
            console.log("Resolved via websocket", result);
            resolve(status);
          }
        },
        commitment
      );
    } catch (e) {
      done = true;
      console.error("WS error in setup", txid, e);
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
              console.log("REST null result for", txid, status);
            } else if (status.err) {
              console.log("REST error for", txid, status);
              done = true;
              reject(status.err);
            } else if (!status.confirmations) {
              console.log("REST no confirmations for", txid, status);
            } else {
              console.log("REST confirmation for", txid, status);
              done = true;
              resolve(status);
            }
          }
        } catch (e) {
          if (!done) {
            console.log("REST connection error: txid", txid, e);
          }
        }
      })();
      await sleep(2000);
    }
  });

  if (
    //@ts-ignore
    connection._subscriptionsByHash &&
    //@ts-ignore
    connection._subscriptionsByHash[subId]
  ) {
    connection.removeSignatureListener(subId);
  }
  if (
    //@ts-ignore
    connection._signatureSubscriptions &&
    //@ts-ignore
    connection._signatureSubscriptions[subId]
  ) {
    connection.removeSignatureListener(subId);
  }

  done = true;
  console.log("Returning status", status);
  return status;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
