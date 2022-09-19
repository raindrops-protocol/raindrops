import { ShdwDrive, ShadowFile } from "@shadow-drive/sdk";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";

import log from "loglevel";

const SHADOW_BASE_URL = "https://shdw-drive.genesysgo.net";
const SHADOW_URI_NOT_EXISTS_MESSAGE: string = `undefined (reading 'owner-account-pubkey')`;

import fs from "fs";

export const uploadFile = async (
  shadowWallet: string,
  shadowAccountId: string,
  buffer: Buffer,
  name: string,
  conn: Connection
) => {
  const decodedKey = new Uint8Array(
    JSON.parse(fs.readFileSync(shadowWallet).toString())
  );

  const keypair = Keypair.fromSecretKey(decodedKey);
  const wallet = new anchor.Wallet(keypair);
  let drive: any, shadow: any;
  try {
    drive = await new ShdwDrive(conn, wallet).init();
  } catch (err: any) {
    throw new Error(
      `There was an error initializing the Shadow Drive: ${err.message}`
    );
  }

  try {
    shadow = await drive.getStorageAccounts("v2");
  } catch (err: any) {
    throw new Error(
      `There was an error getting the default storage account (${err.message})`
    );
  }
  const shadowAccount = shadow.find((thisAcct: any) => {
    let sAcctId = thisAcct.account.identifier;
    if (sAcctId === shadowAccountId) {
      return thisAcct;
    }
  });

  if (!shadowAccount) {
    throw new Error(
      `Could not find the ${shadowAccountId} Shadow Account.  Make sure you have the correct wallet.`
    );
  }
  const pngShadowFile: ShadowFile = {
    name,
    file: buffer,
  };
  // Edit or Upload the image to Shadow Drive
  const pngFileEditResult = await drive
    .editFile(
      shadowAccount.publicKey,
      `${SHADOW_BASE_URL}/${shadowAccount.publicKey.toString()}/${name}`,
      pngShadowFile,
      "v2"
    )
    .catch(async (err: any) => {
      //This is a bit hacky.  Basically, the URI doesn't exist, but this is expected for a new image.
      //Parse the error for "undefined (reading 'owner-account-pubkey')".
      //If this exists, use uploadFile to get it up there.
      const { message, stack } = err;
      if (message.includes(SHADOW_URI_NOT_EXISTS_MESSAGE)) {
        const pngFileUploadResult = await drive.uploadFile(
          shadowAccount.publicKey,
          pngShadowFile,
          "v2"
        );
        if (pngFileUploadResult && pngFileUploadResult.finalized_locations) {
          log.info(
            "info",
            `Image file for ${name} is created.  File location is ${pngFileUploadResult.finalized_locations[0]}`
          );
        } else {
          throw new Error(`Could not upload ${pngShadowFile.name}`);
        }
      } else {
        log.info(`${name} upload had an error.  Time to crash!`);
        throw err;
      }
    });
  // If the pngURI has been set, it's a newly uploaded file.
  // If not, check to see if it was edited.  If it was, set the pngURI
  // If neither case works, then there was an error (should have been caught above.)
  if (pngFileEditResult && pngFileEditResult.finalized_location) {
    log.info(
      "info",
      `Image file for ${name} is updated.  File location is ${pngFileEditResult.finalized_location}`
    );
  }
};
