import { web3, BN } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  NAMESPACE_ID,
  ITEM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  MATCHES_ID,
  PLAYER_ID,
  STAKING_ID,
} from "../constants/programIds";
import { PREFIX as ITEM_PREFIX, MARKER } from "../constants/item";
import { PREFIX as MATCHES_PREFIX } from "../constants/matches";
import { NAMESPACE_PREFIX, NAMESPACE_GATEKEEPER_PREFIX } from "../constants/namespace";
import { PREFIX as PLAYER_PREFIX } from "../constants/player";
import {
  PREFIX as STAKING_PREFIX,
  STAKING_COUNTER,
} from "../constants/staking";

export const getAtaForMint = async (
  mint: web3.PublicKey,
  wallet: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  );
};

export const getMatch = async (
  oracle: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [Buffer.from(MATCHES_PREFIX), oracle.toBuffer()],
    MATCHES_ID
  );
};

export const getMatchTokenAccountEscrow = async (
  oracle: web3.PublicKey,
  tokenMint: web3.PublicKey,
  tokenOwner: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(MATCHES_PREFIX),
      oracle.toBuffer(),
      tokenMint.toBuffer(),
      tokenOwner.toBuffer(),
    ],
    MATCHES_ID
  );
};

export const getOracle = async (
  seed: web3.PublicKey,
  payer: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [Buffer.from(MATCHES_PREFIX), payer.toBuffer(), seed.toBuffer()],
    MATCHES_ID
  );
};

export const getNamespacePDA = async (
  mint: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [Buffer.from(NAMESPACE_PREFIX), mint.toBuffer()],
    NAMESPACE_ID
  );
};

export const getNamespaceGatekeeperPDA = async (
  namespace: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [Buffer.from(NAMESPACE_PREFIX), namespace.toBuffer(), Buffer.from(NAMESPACE_GATEKEEPER_PREFIX)],
    NAMESPACE_ID
  );
};

export const getIndexPDA = async (
  namespace: web3.PublicKey, page: BN,
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [Buffer.from(NAMESPACE_PREFIX), namespace.toBuffer(), page.toArrayLike(Buffer, "le", 8)],
    NAMESPACE_ID
  );
};

export const getItemPDA = async (
  mint: web3.PublicKey,
  index: BN
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(ITEM_PREFIX),
      mint.toBuffer(),
      index.toArrayLike(Buffer, "le", 8),
    ],
    ITEM_ID
  );
};

export const getPlayerPDA = async (
  mint: web3.PublicKey,
  index: BN
): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(PLAYER_PREFIX),
      mint.toBuffer(),
      index.toArrayLike(Buffer, "le", 8),
    ],
    PLAYER_ID
  );
};

export const getItemActivationMarker = async (args: {
  itemMint: web3.PublicKey;
  index: BN;
  usageIndex: BN;
  amount: BN;
}): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(ITEM_PREFIX),
      args.itemMint.toBuffer(),
      args.index.toArrayLike(Buffer, "le", 8),
      args.usageIndex.toArrayLike(Buffer, "le", 8),
      args.amount.toArrayLike(Buffer, "le", 8),
      Buffer.from(MARKER),
    ],
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
      args.classIndex.toArrayLike(Buffer, "le", 8),
      args.newItemMint.toBuffer(),
      args.craftEscrowIndex.toArrayLike(Buffer, "le", 8),
      args.craftItemIndex.toArrayLike(Buffer, "le", 8),
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
      args.classIndex.toArrayLike(Buffer, "le", 8),
      args.payer.toBuffer(),
      args.newItemMint.toBuffer(),
      args.craftItemToken.toBuffer(),
      args.craftEscrowIndex.toArrayLike(Buffer, "le", 8),
      args.craftIndex.toArrayLike(Buffer, "le", 8),
      args.craftItemMint.toBuffer(),
      args.amountToMake.toArrayLike(Buffer, "le", 8),
      args.amountToContributeFromThisContributor.toArrayLike(Buffer, "le", 8),
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
      args.classIndex.toArrayLike(Buffer, "le", 8),
      args.payer.toBuffer(),
      args.newItemMint.toBuffer(),
      args.newItemToken.toBuffer(),
      args.craftEscrowIndex.toArrayLike(Buffer, "le", 8),
      args.amountToMake.toArrayLike(Buffer, "le", 8),
      Buffer.from(args.componentScope),
    ],
    ITEM_ID
  );
};

export const getArtifactIntermediaryStakingAccount = async (args: {
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
  index: BN;
  stakingMint: web3.PublicKey;
  stakingIndex: BN;
}): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(STAKING_PREFIX),
      args.artifactClassMint.toBuffer(),
      args.artifactMint.toBuffer(),
      args.index.toArrayLike(Buffer, "le", 8),
      args.stakingMint.toBuffer(),
      args.stakingIndex.toArrayLike(Buffer, "le", 8),
    ],
    STAKING_ID
  );
};

export const getArtifactIntermediaryStakingCounterForWarmup = async (args: {
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
  index: BN;
  stakingMint: web3.PublicKey;
  stakingIndex: BN;
}): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(STAKING_PREFIX),
      args.artifactClassMint.toBuffer(),
      args.artifactMint.toBuffer(),
      args.index.toArrayLike(Buffer, "le", 8),
      args.stakingMint.toBuffer(),
      args.stakingIndex.toArrayLike(Buffer, "le", 8),
      Buffer.from(STAKING_COUNTER),
    ],
    STAKING_ID
  );
};

export const getArtifactIntermediaryStakingCounterForCooldown = async (args: {
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
  index: BN;
  stakingAccount: web3.PublicKey;
  stakingMint: web3.PublicKey;
  stakingIndex: BN;
}): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(STAKING_PREFIX),
      args.artifactClassMint.toBuffer(),
      args.artifactMint.toBuffer(),
      args.index.toArrayLike(Buffer, "le", 8),
      args.stakingMint.toBuffer(),
      args.stakingIndex.toArrayLike(Buffer, "le", 8),
      Buffer.from(STAKING_COUNTER),
      args.stakingAccount.toBuffer(),
    ],
    STAKING_ID
  );
};

export const getArtifactMintStakingAccount = async (args: {
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
  index: BN;
  stakingMint: web3.PublicKey;
}): Promise<[web3.PublicKey, number]> => {
  return await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(STAKING_PREFIX),
      args.artifactClassMint.toBuffer(),
      args.artifactMint.toBuffer(),
      args.index.toArrayLike(Buffer, "le", 8),
      args.stakingMint.toBuffer(),
    ],
    STAKING_ID
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
