import { Connection } from "@raindrop-studios/sol-kit";
import { AccountInfo } from "@solana/spl-token";
import {
  TOKEN_METADATA_PROGRAM_ID,
  CANDY_MACHINE_PROGRAM_V2_ID,
} from "../constants/programIds";
import { decodeMetadata } from "./tokenMetadata/schema";
import { web3 } from "@project-serum/anchor";
export const MAX_NAME_LENGTH = 32;
export const MAX_URI_LENGTH = 200;
export const MAX_SYMBOL_LENGTH = 10;
export const MAX_CREATOR_LEN = 32 + 1 + 1;
export const MAX_CREATOR_LIMIT = 5;

export const getCandyMachineCreator = async (
  candyMachine: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [Buffer.from("candy_machine"), candyMachine.toBuffer()],
    CANDY_MACHINE_PROGRAM_V2_ID
  );
};

export async function getAccountsByFirstCreatorAddress(
  creatorAddress,
  connection
) {
  const metadataAccounts = await getProgramAccounts(
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
              0 * MAX_CREATOR_LEN,
            bytes: creatorAddress,
          },
        },
      ],
    }
  );
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

export type AccountAndPubkey = {
  pubkey: string;
  account: web3.AccountInfo<Buffer>;
};

export async function getProgramAccounts(
  connection: web3.Connection,
  programId: string,
  configOrCommitment?: any
): Promise<Array<AccountAndPubkey>> {
  const extra: any = {};
  let commitment;
  //let encoding;

  if (configOrCommitment) {
    if (typeof configOrCommitment === "string") {
      commitment = configOrCommitment;
    } else {
      commitment = configOrCommitment.commitment;
      //encoding = configOrCommitment.encoding;

      if (configOrCommitment.dataSlice) {
        extra.dataSlice = configOrCommitment.dataSlice;
      }

      if (configOrCommitment.filters) {
        extra.filters = configOrCommitment.filters;
      }
    }
  }

  const args = connection._buildArgs([programId], commitment, "base64", extra);
  const unsafeRes = await (connection as any)._rpcRequest(
    "getProgramAccounts",
    args
  );
  console.log(unsafeRes);
  const data = (
    unsafeRes.result as Array<{
      account: web3.AccountInfo<[string, string]>;
      pubkey: string;
    }>
  ).map((item) => {
    return {
      account: {
        // TODO: possible delay parsing could be added here
        data: Buffer.from(item.account.data[0], "base64"),
        executable: item.account.executable,
        lamports: item.account.lamports,
        // TODO: maybe we can do it in lazy way? or just use string
        owner: item.account.owner,
      } as web3.AccountInfo<Buffer>,
      pubkey: item.pubkey,
    };
  });

  return data;
}
