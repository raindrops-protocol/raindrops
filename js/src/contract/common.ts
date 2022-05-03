import { AnchorPermissivenessType, PermissivenessType } from "../state/common";
import { Program, web3, BN, AnchorProvider } from "@project-serum/anchor";
import { getAtaForMint, getItemPDA, getMetadata } from "../utils/pda";

export interface ObjectWrapper<T, V> {
  program: V;
  key: web3.PublicKey;
  object: T;
  data: Buffer;
}

export async function generateRemainingAccountsGivenPermissivenessToUse(args: {
  permissivenessToUse: AnchorPermissivenessType | null;
  tokenMint: web3.PublicKey;
  parentMint: web3.PublicKey | null;
  parentIndex: BN | null;
  parent: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
  program: Program;
}): Promise<
  { pubkey: web3.PublicKey; isWritable: boolean; isSigner: boolean }[]
> {
  const {
    permissivenessToUse,
    program,
    tokenMint,
    parentMint,
    parent,
    parentIndex,
    metadataUpdateAuthority,
  } = args;

  const remainingAccounts: {
    pubkey: web3.PublicKey;
    isWritable: boolean;
    isSigner: boolean;
  }[] = [];
  if (permissivenessToUse.tokenHolder) {
    const tokenAccount = (
      await getAtaForMint(
        tokenMint,
        (program.provider as AnchorProvider).wallet.publicKey
      )
    )[0];
    const tokenHolder = (program.provider as AnchorProvider).wallet.publicKey;
    remainingAccounts.push({
      pubkey: tokenAccount,
      isWritable: false,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: tokenHolder,
      isWritable: false,
      isSigner: true,
    });
  } else if (permissivenessToUse.parentTokenHolder) {
    const parentToken = (
      await getAtaForMint(
        parentMint,
        (program.provider as AnchorProvider).wallet.publicKey
      )
    )[0];
    const parentHolder = (program.provider as AnchorProvider).wallet.publicKey;
    const parentClass =
      parent || (await getItemPDA(parentMint, parentIndex))[0];

    remainingAccounts.push({
      pubkey: parentToken,
      isWritable: false,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: parentHolder,
      isWritable: false,
      isSigner: true,
    });
    remainingAccounts.push({
      pubkey: parentClass,
      isWritable: false,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: parentMint,
      isWritable: false,
      isSigner: false,
    });
  } else if (permissivenessToUse.updateAuthority || !permissivenessToUse) {
    remainingAccounts.push({
      pubkey:
        metadataUpdateAuthority ||
        (program.provider as AnchorProvider).wallet.publicKey,
      isWritable: false,
      isSigner: true,
    });
    remainingAccounts.push({
      pubkey: await getMetadata(tokenMint),
      isWritable: false,
      isSigner: false,
    });
  }

  return remainingAccounts;
}

// Creating a class uses the parent (if set) update permissivenesses and as such
// produces slightly different remainingAccounts. So this method is used instead for class creation.
// If parent is set, defaults to using update authority as a permissiveness to make the new token class.
export async function generateRemainingAccountsForCreateClass(args: {
  permissivenessToUse: AnchorPermissivenessType | null;
  // Token is going to be a new Class
  tokenMint: web3.PublicKey;
  // The parent of the new class (if needed)
  parentMint: web3.PublicKey | null;
  parent: web3.PublicKey | null;
  // So two levels up, in the case of a Parent can update - we're using the parent of your parent's update array
  // and relative to that, parent can update is this parent's parent
  parentOfParentClassMint: web3.PublicKey | null;
  parentOfParentClassIndex: BN | null;
  parentOfParentClass: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
  parentUpdateAuthority: web3.PublicKey | null;
  program: Program;
}): Promise<
  { pubkey: web3.PublicKey; isWritable: boolean; isSigner: boolean }[]
> {
  const {
    permissivenessToUse,
    program,
    tokenMint,
    parentMint,
    parent,
    metadataUpdateAuthority,
    parentOfParentClassMint,
    parentOfParentClassIndex,
    parentOfParentClass,
    parentUpdateAuthority,
  } = args;
  const remainingAccounts: {
    pubkey: web3.PublicKey;
    isWritable: boolean;
    isSigner: boolean;
  }[] = [];
  if (!parent || !parentMint) {
    remainingAccounts.push({
      pubkey:
        metadataUpdateAuthority ||
        (program.provider as AnchorProvider).wallet.publicKey,
      isWritable: false,
      isSigner: true,
    });
    remainingAccounts.push({
      pubkey: await getMetadata(tokenMint),
      isWritable: false,
      isSigner: false,
    });
  } else if (permissivenessToUse.tokenHolder) {
    const tokenAccount = (
      await getAtaForMint(
        parentMint,
        (program.provider as AnchorProvider).wallet.publicKey
      )
    )[0];
    const tokenHolder = (program.provider as AnchorProvider).wallet.publicKey;
    remainingAccounts.push({
      pubkey: tokenAccount,
      isWritable: false,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: tokenHolder,
      isWritable: false,
      isSigner: true,
    });
    remainingAccounts.push({
      pubkey: parentMint,
      isWritable: false,
      isSigner: false,
    });
  } else if (permissivenessToUse.parentTokenHolder) {
    const parentToken = (
      await getAtaForMint(
        parentOfParentClassMint,
        (program.provider as AnchorProvider).wallet.publicKey
      )
    )[0];
    const parentHolder = (program.provider as AnchorProvider).wallet.publicKey;
    const parentClass =
      parentOfParentClass ||
      (await getItemPDA(parentOfParentClassMint, parentOfParentClassIndex))[0];
    remainingAccounts.push({
      pubkey: parentToken,
      isWritable: false,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: parentHolder,
      isWritable: false,
      isSigner: true,
    });
    remainingAccounts.push({
      pubkey: parentClass,
      isWritable: false,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: parentOfParentClassMint,
      isWritable: false,
      isSigner: false,
    });
  } else if (permissivenessToUse.updateAuthority) {
    remainingAccounts.push({
      pubkey:
        parentUpdateAuthority ||
        (program.provider as AnchorProvider).wallet.publicKey,
      isWritable: false,
      isSigner: true,
    });
    remainingAccounts.push({
      pubkey: await getMetadata(parentMint),
      isWritable: false,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: parentMint,
      isWritable: false,
      isSigner: false,
    });
  }
  return remainingAccounts;
}
