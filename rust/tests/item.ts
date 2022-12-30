import * as anchor from "@project-serum/anchor";
import * as splToken from "@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as idls from "../../js/lib/src/idls";
import {
  Utils,
  State,
  ItemProgram,
  Idls,
  Instructions,
} from "@raindrops-protocol/raindrops";
import { assert } from "chai";

describe.only("item", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it("create item class with free build enabled", async () => {
    const payer = await newPayer(connection);

    await createItemClassFreeBuild(payer, connection);
  });

  it("create item class with free build enabled with client", async () => {
    const payer = await newPayer(connection);

    await createItemClassFreeBuildWithClient(payer, connection);
  });
});

async function createItemClassFreeBuildWithClient(payer: anchor.web3.Keypair, connection: anchor.web3.Connection) {
  // create item mints and metaplex accounts
  const [itemMint, _itemMetadata] = await createMintMetadataAccounts(
    "item",
    connection,
    payer
  );

  const itemMintDataPre = await splToken.getMint(connection, itemMint);

  const itemProgram = await ItemProgram.getProgramWithConfig(
    ItemProgram,
    {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.ItemIDL,
    }
  );
  const itemClassIndex = new anchor.BN(0);

  const itemClassData = {
    settings: {
      freeBuild: {
        boolean: true,
        inherited: { notInherited: true },
      },
      childrenMustBeEditions: null,
      builderMustBeHolder: null,
      updatePermissiveness: null,
      buildPermissiveness: null,
      stakingWarmUpDuration: null,
      stakingCooldownDuration: null,
      stakingPermissiveness: null,
      unstakingPermissiveness: null,
      childUpdatePropagationPermissiveness: null,
    },
    config: {
      usageRoot: null,
      usageStateRoot: null,
      componentRoot: null,
      usages: null,
      components: null,
    },
  };

  const args: Instructions.Item.CreateItemClassArgs = {
    classIndex: new anchor.BN(itemClassIndex),
    parentClassIndex: null,
    parentOfParentClassIndex: null,
    space: new anchor.BN(300),
    desiredNamespaceArraySize: 2,
    updatePermissivenessToUse: null,
    storeMint: false,
    storeMetadataFields: true,
    itemClassData,
  };

  const accounts: Instructions.Item.CreateItemClassAccounts = {
    itemMint: itemMint,
    parent: null,
    parentMint: null,
    parentOfParentClass: null,
    parentOfParentClassMint: null,
    metadataUpdateAuthority: payer.publicKey,
    parentUpdateAuthority: null,
  };

  const result = await itemProgram.createItemClass(args, accounts, {});
  console.log("createItemClassTxSig: %s", result.txid);

  // check that the item mint authority has no changed
  const itemMintDataPost = await splToken.getMint(connection, itemMint);
  assert(itemMintDataPre.mintAuthority.equals(itemMintDataPost.mintAuthority));
}

async function createItemClassFreeBuild(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
) {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed" }
  );

  const itemProgram: anchor.Program<idls.Item> = await new anchor.Program(
    idls.ItemIDL,
    "itemX1XWs9dK8T2Zca4vEEPfCAhRc7yvYFntPjTTVx6",
    provider
  );
  // create item mints and metaplex accounts
  const [itemMint, itemMetadata] = await createMintMetadataAccounts(
    "item",
    connection,
    payer
  );

  // item class PDA
  const itemClassIndex = new anchor.BN(0);
  const [itemClass, _itemClassBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("item"),
        itemMint.toBuffer(),
        itemClassIndex.toArrayLike(Buffer, "le", 8),
      ],
      itemProgram.programId
    );

  const createItemClassArgs = {
    classIndex: itemClassIndex,
    parentClassIndex: null,
    parentOfParentClassIndex: null,
    space: new anchor.BN(300),
    desiredNamespaceArraySize: 2,
    updatePermissivenessToUse: null,
    storeMint: true,
    storeMetadataFields: true,
    itemClassData: {
      settings: {
        freeBuild: {
          boolean: true,
          inherited: { notInherited: true },
        },
        childrenMustBeEditions: null,
        builderMustBeHolder: null,
        updatePermissiveness: null,
        buildPermissiveness: null,
        stakingWarmUpDuration: null,
        stakingCooldownDuration: null,
        stakingPermissiveness: null,
        unstakingPermissiveness: null,
        childUpdatePropagationPermissiveness: null,
      },
      config: {
        usageRoot: null,
        usageStateRoot: null,
        componentRoot: null,
        usages: null,
        components: null,
      },
    },
  };

  // dummy account
  const noEdition = anchor.web3.Keypair.generate();

  const itemMintDataPre = await splToken.getMint(connection, itemMint);

  // create item class
  const createItemClassTxSig = await itemProgram.methods
    .createItemClass(createItemClassArgs)
    .accounts({
      itemClass: itemClass,
      itemMint: itemMint,
      metadata: itemMetadata,
      edition: noEdition.publicKey,
      parent: itemClass,
      payer: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .remainingAccounts([
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: itemMetadata, isSigner: false, isWritable: false },
      { pubkey: splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ])
    .rpc({ skipPreflight: false });
  console.log("createItemClassTxSig: %s", createItemClassTxSig);

  // check that the item mint authority has no changed
  const itemMintDataPost = await splToken.getMint(connection, itemMint);
  assert(itemMintDataPre.mintAuthority.equals(itemMintDataPost.mintAuthority));
}

async function createMintMetadataAccounts(
  name: string,
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair
): Promise<[anchor.web3.PublicKey, anchor.web3.PublicKey]> {
  const mint = anchor.web3.Keypair.generate();

  const createMintAccountIx = await anchor.web3.SystemProgram.createAccount({
    programId: splToken.TOKEN_PROGRAM_ID,
    space: splToken.MintLayout.span,
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(
      splToken.MintLayout.span
    ),
  });

  const mintIx = await splToken.createInitializeMintInstruction(
    mint.publicKey,
    0,
    payer.publicKey,
    payer.publicKey
  );

  const payerAta = await splToken.getAssociatedTokenAddress(
    mint.publicKey,
    payer.publicKey
  );

  const payerAtaIx = await splToken.createAssociatedTokenAccountInstruction(
    payer.publicKey,
    payerAta,
    payer.publicKey,
    mint.publicKey
  );

  const mintToIx = await splToken.createMintToInstruction(
    mint.publicKey,
    payerAta,
    payer.publicKey,
    1
  );

  // create metadata
  const [metadata, _metadataBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        mint.publicKey.toBuffer(),
      ],
      mpl.PROGRAM_ID
    );

  const mdAccounts: mpl.CreateMetadataAccountV2InstructionAccounts = {
    metadata: metadata,
    mint: mint.publicKey,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    updateAuthority: payer.publicKey,
  };
  const mdData: mpl.DataV2 = {
    name: name,
    symbol: name.toUpperCase(),
    uri: "http://foo.com/bar.json",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  };
  const mdArgs: mpl.CreateMetadataAccountArgsV2 = {
    data: mdData,
    isMutable: true,
  };
  const ixArgs: mpl.CreateMetadataAccountV2InstructionArgs = {
    createMetadataAccountArgsV2: mdArgs,
  };
  const metadataIx = mpl.createCreateMetadataAccountV2Instruction(
    mdAccounts,
    ixArgs
  );

  const createMdAndMeAccountsTxSig = await connection.sendTransaction(
    new anchor.web3.Transaction().add(
      createMintAccountIx,
      mintIx,
      payerAtaIx,
      mintToIx,
      metadataIx
      //masterEditionIx
    ),
    [payer, mint]
  );
  await connection.confirmTransaction(createMdAndMeAccountsTxSig, "confirmed");

  return [mint.publicKey, metadata];
}

async function newPayer(
  connection: anchor.web3.Connection
): Promise<anchor.web3.Keypair> {
  const payer = anchor.web3.Keypair.generate();

  const txSig = await connection.requestAirdrop(
    payer.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(txSig);

  return payer;
}
