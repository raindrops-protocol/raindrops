import { AnchorPermissivenessType, PermissivenessType } from "../state/common";
import { Program as SolKitProgram } from "@raindrop-studios/sol-kit";
import { Program, web3, BN, AnchorProvider } from "@project-serum/anchor";
import { getAtaForMint, getItemPDA, getMetadata } from "../utils/pda";

export interface ObjectWrapper<T, V> {
  program: V;
  key: web3.PublicKey;
  object: T;
  data: Buffer;
}

export namespace ContractCommon {
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
    if (permissivenessToUse?.tokenHolder) {
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
    } else if (
      permissivenessToUse?.parentTokenHolder &&
      parentMint &&
      parentIndex
    ) {
      const parentToken = (
        await getAtaForMint(
          parentMint,
          (program.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
      const parentHolder = (program.provider as AnchorProvider).wallet
        .publicKey;
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
    } else if (permissivenessToUse?.updateAuthority || !permissivenessToUse) {
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

  export async function generateRemainingAccountsForGivenPermissivenessToUse(args: {
    permissivenessToUse: AnchorPermissivenessType | null;
    tokenMint: web3.PublicKey;
    parentClassMint: web3.PublicKey | null;
    parentClass: web3.PublicKey | null;
    metadataUpdateAuthority: web3.PublicKey | null;
    owner: web3.PublicKey;
    program: Program;
  }): Promise<
    { pubkey: web3.PublicKey; isWritable: boolean; isSigner: boolean }[]
  > {
    const {
      permissivenessToUse,
      tokenMint,
      parentClassMint,
      parentClass,
      metadataUpdateAuthority,
      owner,
      program,
    } = args;

    const remainingAccounts: {
      pubkey: web3.PublicKey;
      isWritable: boolean;
      isSigner: boolean;
    }[] = [];

    if (!permissivenessToUse) {
      remainingAccounts.push({
        pubkey: metadataUpdateAuthority || owner,
        isWritable: false,
        isSigner: true,
      });
      remainingAccounts.push({
        pubkey: await getMetadata(tokenMint),
        isWritable: false,
        isSigner: false,
      });

      return remainingAccounts;
    }

    if (permissivenessToUse.tokenHolder) {
      remainingAccounts.push({
        pubkey: await getTokenAccountForMint({
          mint: tokenMint,
          owner,
          program,
        }),
        isWritable: false,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: owner,
        isWritable: false,
        isSigner: true,
      });
    } else if (permissivenessToUse.parentTokenHolder) {
      remainingAccounts.push({
        pubkey: await getTokenAccountForMint({
          mint: parentClassMint,
          owner,
          program,
        }),
        isWritable: false,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: owner,
        isWritable: false,
        isSigner: true,
      });
      remainingAccounts.push({
        pubkey: parentClass,
        isWritable: false,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: parentClassMint,
        isWritable: false,
        isSigner: false,
      });
    } else if (permissivenessToUse.updateAuthority || !permissivenessToUse) {
      remainingAccounts.push({
        pubkey: metadataUpdateAuthority || owner,
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
    program: SolKitProgram.Program;
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
          (program.client.provider as AnchorProvider).wallet.publicKey,
        isWritable: false,
        isSigner: true,
      });
      remainingAccounts.push({
        pubkey: await getMetadata(tokenMint),
        isWritable: false,
        isSigner: false,
      });
    } else if (permissivenessToUse?.tokenHolder) {
      const tokenAccount = (
        await getAtaForMint(
          parentMint,
          (program.client.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
      const tokenHolder = (program.client.provider as AnchorProvider).wallet
        .publicKey;
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
    } else if (
      permissivenessToUse?.parentTokenHolder &&
      parentOfParentClassMint &&
      parentOfParentClassIndex
    ) {
      const parentToken = (
        await getAtaForMint(
          parentOfParentClassMint,
          (program.client.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
      const parentHolder = (program.client.provider as AnchorProvider).wallet
        .publicKey;
      const parentClass =
        parentOfParentClass ||
        (
          await getItemPDA(parentOfParentClassMint, parentOfParentClassIndex)
        )[0];
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
    } else if (permissivenessToUse?.updateAuthority) {
      remainingAccounts.push({
        pubkey:
          parentUpdateAuthority ||
          (program.client.provider as AnchorProvider).wallet.publicKey,
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

  // Token can be minted to both ATA or non-ATA.
  // If token is an NFT, there's only one token account that holds this nft.
  // If it's not an NFT, this function returns the first token account.
  // In most cases, this util function is used for NFT token account.
  export async function getTokenAccountForMint(args: {
    mint: web3.PublicKey;
    owner: web3.PublicKey;
    program: Program;
  }): Promise<web3.PublicKey> {
    const { mint, owner, program } = args;

    const tokenAccounts = (
      await program.provider.connection.getParsedTokenAccountsByOwner(
        owner,
        {
          mint,
        },
        "confirmed"
      )
    ).value.filter(
      (account) =>
        account.account.data.parsed.info.tokenAmount.amount === "1" &&
        account.account.data.parsed.info.tokenAmount.decimals === 0
    );

    if (tokenAccounts.length < 1) {
      throw Error("Cannot find token account");
    }

    return tokenAccounts[0].pubkey;
  }
}
