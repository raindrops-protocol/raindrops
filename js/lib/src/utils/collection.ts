import { TOKEN_METADATA_PROGRAM_ID } from "../constants/programIds";
import {
  getProgramAccounts,
  MAX_NAME_LENGTH,
  MAX_URI_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_CREATOR_LEN,
} from "./candyMachine";
import { decodeMetadata } from "./tokenMetadata/schema";

export async function getAccountsByCollectionAddress(collection, connection) {
  let metadataAccounts = [];
  for (
    let numberOfCreators = 5;
    numberOfCreators > 0 && metadataAccounts.length == 0;
    numberOfCreators--
  ) {
    metadataAccounts = await getProgramAccounts(
      connection,
      TOKEN_METADATA_PROGRAM_ID.toBase58(),
      {
        filters: [
          {
            memcmp: {
              offset:
                1 + // key
                32 + // update auth
                32 + // mint
                4 + // name string length
                MAX_NAME_LENGTH + // name
                4 + // uri string length
                MAX_URI_LENGTH + // uri*
                4 + // symbol string length
                MAX_SYMBOL_LENGTH + // symbol
                2 + // seller fee basis points
                1 + // whether or not there is a creators vec
                4 + // creators vec length
                numberOfCreators * MAX_CREATOR_LEN +
                1 + // primary sale happened
                1 + // is mutable
                2 + // edition nonce + option
                1 + // token standard (not present)
                1 + // whether or not there is a collection
                1, // verified
              bytes: collection,
            },
          },
        ],
      }
    );
    if (metadataAccounts.length == 0) {
      console.log(
        "Found no collection when assuming creators =",
        numberOfCreators,
        ". Trying with creators = ",
        numberOfCreators - 1,
        "next."
      );
    } else {
      console.log("Found mints for collection", collection);
    }
  }
  const decodedAccounts = [];
  for (let i = 0; i < metadataAccounts.length; i++) {
    const e = metadataAccounts[i];
    const decoded = await decodeMetadata(e.account.data);
    const accountPubkey = e.pubkey;
    const store = [decoded, accountPubkey];
    decodedAccounts.push(store);
  }
  return decodedAccounts;
}
