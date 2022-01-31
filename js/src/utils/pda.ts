import { web3, BN } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  ITEM_ID,
  TOKEN_METADATA_PROGRAM_ID,
} from "../constants/programIds";
import { PREFIX as ITEM_PREFIX } from "../constants/item";

export const getAtaForMint = async (
  mint: web3.PublicKey,
  wallet: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  );
};

export const getItemPDA = async (
  mint: web3.PublicKey,
  index: BN
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [Buffer.from(ITEM_PREFIX), mint.toBuffer(), index.toBuffer("le", 8)],
    ITEM_ID
  );
};

export const getCraftItemCounter = async (args: {
  itemClassMint: web3.PublicKey;
  newItemMint: web3.PublicKey;
  craftItemMint: web3.PublicKey;
  componentScope: String;
  craftItemIndex: BN;
  craftEscrowIndex: BN;
  classIndex: BN;
}): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(ITEM_PREFIX),
      args.itemClassMint.toBuffer(),
      args.classIndex.toBuffer("le", 8),
      args.newItemMint.toBuffer(),
      args.craftEscrowIndex.toBuffer("le", 8),
      args.craftItemIndex.toBuffer("le", 8),
      args.craftItemMint.toBuffer(),
      Buffer.from(args.componentScope),
    ],
    ITEM_ID
  );
};

export const getCraftItemEscrow = async (args: {
  itemClassMint: web3.PublicKey;
  payer: web3.PublicKey;
  newItemMint: web3.PublicKey;
  craftItemToken: web3.PublicKey;
  craftItemMint: web3.PublicKey;
  amountToMake: BN;
  amountToContributeFromThisContributor: BN;
  componentScope: String;
  craftIndex: BN;
  classIndex: BN;
  craftEscrowIndex: BN;
}): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(ITEM_PREFIX),
      args.itemClassMint.toBuffer(),
      args.classIndex.toBuffer("le", 8),
      args.payer.toBuffer(),
      args.newItemMint.toBuffer(),
      args.craftItemToken.toBuffer(),
      args.craftEscrowIndex.toBuffer("le", 8),
      args.craftIndex.toBuffer("le", 8),
      args.craftItemMint.toBuffer(),
      args.amountToMake.toBuffer("le", 8),
      args.amountToContributeFromThisContributor.toBuffer("le", 8),
      Buffer.from(args.componentScope),
    ],
    ITEM_ID
  );
};

export const getItemEscrow = async (args: {
  itemClassMint: web3.PublicKey;
  payer: web3.PublicKey;
  newItemMint: web3.PublicKey;
  newItemToken: web3.PublicKey;
  amountToMake: BN;
  componentScope: String;
  craftEscrowIndex: BN;
  classIndex: BN;
}): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(ITEM_PREFIX),
      args.itemClassMint.toBuffer(),
      args.classIndex.toBuffer("le", 8),
      args.payer.toBuffer(),
      args.newItemMint.toBuffer(),
      args.newItemToken.toBuffer(),
      args.craftEscrowIndex.toBuffer("le", 8),
      args.amountToMake.toBuffer("le", 8),
      Buffer.from(args.componentScope),
    ],
    ITEM_ID
  );
};

export const getMetadata = async (
  mint: web3.PublicKey
): Promise<web3.PublicKey> => {
  return (
    await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

export const getEdition = async (
  mint: web3.PublicKey
): Promise<web3.PublicKey> => {
  return (
    await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};
