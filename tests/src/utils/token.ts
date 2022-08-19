import * as anchor from "@project-serum/anchor";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV2Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";

const createMintNFTInstructions = async (
  provider: anchor.AnchorProvider,
  mintPubkey: anchor.web3.PublicKey
) => {
  const tokenProgram = anchor.Spl.token(provider);
  const associatedTokenProgram = anchor.Spl.associatedToken(provider);

  const mintSpace = tokenProgram.account.mint.size;
  const balanceNeeded =
    await provider.connection.getMinimumBalanceForRentExemption(mintSpace);

  const createAccountIx = anchor.web3.SystemProgram.createAccount({
    fromPubkey: provider.wallet.publicKey,
    newAccountPubkey: mintPubkey,
    lamports: balanceNeeded,
    space: mintSpace,
    programId: tokenProgram.programId,
  });

  const createInitMintIx = await tokenProgram.methods
    .initializeMint(0, provider.wallet.publicKey, provider.wallet.publicKey)
    .accounts({
      mint: mintPubkey,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  const ata = await anchor.utils.token.associatedAddress({
    mint: mintPubkey,
    owner: provider.wallet.publicKey,
  });

  const createAtaIx = await associatedTokenProgram.methods
    .create()
    .accounts({
      authority: provider.wallet.publicKey,
      associatedAccount: ata,
      owner: provider.wallet.publicKey,
      mint: mintPubkey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: tokenProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  const createMintToIx = await tokenProgram.methods
    .mintTo(new anchor.BN(1))
    .accounts({
      mint: mintPubkey,
      to: ata,
      authority: provider.wallet.publicKey,
    })
    .instruction();

  const [metadataPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintPubkey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const createMetadataAccountV2Ix = createCreateMetadataAccountV2Instruction(
    {
      metadata: metadataPDA,
      mint: mintPubkey,
      mintAuthority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
      updateAuthority: provider.wallet.publicKey,
    },
    {
      createMetadataAccountArgsV2: {
        data: {
          name: "",
          symbol: "",
          uri: "",
          sellerFeeBasisPoints: 500,
          creators: null,
          collection: null,
          uses: null,
        },
        isMutable: true,
      },
    }
  );

  const [masterEditionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintPubkey.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const createMasterEditionV3Ix = createCreateMasterEditionV3Instruction(
    {
      metadata: metadataPDA,
      edition: masterEditionPDA,
      mint: mintPubkey,
      updateAuthority: provider.wallet.publicKey,
      mintAuthority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
    },
    {
      createMasterEditionArgs: {
        maxSupply: new anchor.BN(1),
      },
    }
  );

  return [
    createAccountIx,
    createInitMintIx,
    createAtaIx,
    createMintToIx,
    createMetadataAccountV2Ix,
    createMasterEditionV3Ix,
  ];
};

export { createMintNFTInstructions };
