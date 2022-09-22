import { WebBundlr } from "@bundlr-network/client";
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
import { Utils, Constants } from "@raindrops-protocol/raindrops";
const { Transactions } = Utils;
const { sendSignedTransaction } = Transactions;

export const uploadFileToArweave = async ({
  connection,
  file,
  name,
  user,
  creators,
}: {
  connection: Connection;
  creators: { address: string; share: number }[];
  user: Keypair;
  file: Buffer;
  name: string;
}) => {
  const bundlr = new WebBundlr("https://node1.bundlr.network", "solana", {
    publicKey: user.publicKey,
    sendTransaction: async (data: Transaction) => {
      data.signatures.push({
        publicKey: user.publicKey,
        signature: null,
      });

      data.recentBlockhash = (
        await connection.getLatestBlockhash("single")
      ).blockhash;

      data.partialSign(user);

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
      return nacl.sign.detached(data, user.secretKey);
    },
  });
  await bundlr.ready();

  const imgSize = Buffer.byteLength(file);
  console.log("img size bytes:", imgSize);

  const imgUploadPrice = await bundlr.getPrice(imgSize);
  console.log("img upload cost:", imgUploadPrice.toNumber());

  const metadata = {
    name,
    symbol: "",
    description: "",
    seller_fee_basis_points: 0,
    image:
      "https://arweave.net/dummy122334444555512232311221-dummy122334444555512232311221",
    animation_url: null,
    external_url: null,
    properties: {
      files: [
        {
          uri: "https://arweave.net/dummy122334444555512232311221-dummy122334444555512232311221",
          type: "image/png",
        },
      ],
      creators,
    },
  };
  const metaSize = Buffer.byteLength(JSON.stringify(metadata));
  console.log("md size bytes:", metaSize);
  const metaUploadPrice = await bundlr.getPrice(metaSize);
  console.log("md upload cost:", metaUploadPrice.toNumber());

  console.log("Funding...");

  try {
    let response = await bundlr.fund(
      2 * imgUploadPrice.plus(metaUploadPrice).toNumber()
    );
    console.log(response);
  } catch (e) {
    console.log("Funding call failed, trying anyway");
    console.error(e);
  }

  for (let i = 0; i < 6; i++) {
    const currentBundlrBal = await bundlr.getLoadedBalance();
    console.log("current bal:", currentBundlrBal.toNumber());
    if (
      currentBundlrBal.toNumber() >
      imgUploadPrice.plus(metaUploadPrice).toNumber()
    )
      break;
    else {
      console.log("Sleeping on funder being funded");
      await sleep(5000);
    }
  }

  const imgUploadResp = await bundlr.uploader.upload(file, {
    tags: [{ name: "Content-Type", value: "image/png" }],
  });
  console.log(imgUploadResp);

  metadata.image = "https://arweave.net/" + imgUploadResp.data.id + "?ext=png";
  metadata.properties.files[0].uri =
    "https://arweave.net/" + imgUploadResp.data.id + "?ext=png";

  const metaUploadResp = await bundlr.uploader.upload(
    Buffer.from(JSON.stringify(metadata)),
    { tags: [{ name: "Content-Type", value: "text/json" }] }
  );
  console.log(metaUploadResp);
  return "https://arweave.net/" + metaUploadResp.data.id;
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
