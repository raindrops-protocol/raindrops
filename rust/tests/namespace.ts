import * as anchor from "@project-serum/anchor";
import * as splToken from "../node_modules/@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Namespace,
  IDL as NamespaceProgramIDL,
} from "../target/types/namespace";
import { Item, IDL as ItemProgramIDL } from "../target/types/item";

describe("namespace", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  it("namespace", async () => {
    const payer = await newPayer(anchor.getProvider().connection);
    const provider = new anchor.AnchorProvider(
      anchor.getProvider().connection,
      new anchor.Wallet(payer),
      { commitment: "confirmed" }
    );
    console.log("provider initialized");

    // load programs
    const namespaceProgram: anchor.Program<Namespace> =
      await new anchor.Program(
        NamespaceProgramIDL,
        "AguQatwNFEaZSFUHsTj5fcU3LdsNFQLrYSHQjZ4erC8X",
        provider
      );
    const itemProgram: anchor.Program<Item> = await new anchor.Program(
      ItemProgramIDL,
      "CKAcdJsyzBxHJRHgKVEsVzjX9SNcvut8t3PUD34g7ry4",
      provider
    );
    console.log("programs loaded");

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        provider.connection,
        payer
      );

    const initNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "ndjsld", // max 6 characters
      prettyName: "my-namespace",
      permissivenessSettings: {
        namespacePermissiveness: Permissiveness.All,
        itemPermissiveness: Permissiveness.All,
        playerPermissiveness: Permissiveness.All,
        matchPermissiveness: Permissiveness.All,
        missionPermissiveness: Permissiveness.All,
        cachePermissiveness: Permissiveness.All,
      },
      whitelistedStakingMints: [],
    };

    const [namespace, _namespaceBump] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("namespace"), nsMint.toBuffer()],
        namespaceProgram.programId
      );

    const initNsTxSig = await namespaceProgram.methods
      .initializeNamespace(initNamespaceArgs)
      .accounts({
        namespace: namespace,
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
        payer: provider.wallet.publicKey,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log("initNsTxSig: %s", initNsTxSig);

    const namespaceToken = await splToken.getAssociatedTokenAddress(
      nsMint,
      provider.wallet.publicKey
    );

    const updateNsArgs = {
      prettyName: "new-name",
      permissivenessSettings: null,
      whitelistedStakingMints: [],
    };
    const updateNsTxSig = await namespaceProgram.methods
      .updateNamespace(updateNsArgs)
      .accounts({
        namespace: namespace,
        namespaceToken: namespaceToken,
        tokenHolder: provider.wallet.publicKey,
      })
      .rpc();
    console.log("updateNsTxSig: %s", updateNsTxSig);

    const [namespaceGatekeeper, _namespaceGatekeeperBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("namespace"),
          namespace.toBuffer(),
          Buffer.from("gatekeeper"),
        ],
        namespaceProgram.programId
      );
    
    // create namespace gatekeeper
    const createNsGatekeeperTxSig = await namespaceProgram.methods
      .createNamespaceGatekeeper()
      .accounts({
        namespace: namespace,
        namespaceToken: namespaceToken,
        namespaceGatekeeper: namespaceGatekeeper,
        tokenHolder: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: false });
    console.log("createNsGatekeeperTxSig: %s", createNsGatekeeperTxSig);

    // add item filter to gatekeeper
    const itemArtifactFilter = {
      filter: { namespace: { namespaces: [namespace] } },
      tokenType: ArtifactType.Item,
    };
    const addToNsGatekeeperTxSig = await namespaceProgram.methods
      .addToNamespaceGatekeeper(itemArtifactFilter)
      .accounts({
        namespace: namespace,
        namespaceGatekeeper: namespaceGatekeeper,
        namespaceToken: namespaceToken,
        tokenHolder: provider.wallet.publicKey,
      })
      .rpc();
    console.log("addToNsGatekeeperTxSig: %s", addToNsGatekeeperTxSig);

    // remove item filter from gatekeeper
    const rmFromNsGatekeeperTxSig = await namespaceProgram.methods
      .removeFromNamespaceGatekeeper(itemArtifactFilter)
      .accounts({
        namespace: namespace,
        namespaceGatekeeper: namespaceGatekeeper,
        namespaceToken: namespaceToken,
        tokenHolder: provider.wallet.publicKey,
      })
      .rpc();
    console.log("rmFromNsGatekeeperTxSig: %s", rmFromNsGatekeeperTxSig);

    // create item mints and metaplex accounts
    const [itemMint, itemMetadata, itemMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "item",
        provider.connection,
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
      desiredNamespaceArraySize: new anchor.BN(2),
      updatePermissivenessToUse: null,
      storeMint: true,
      storeMetadataFields: true,
      itemClassData: {
        settings: {
          freeBuild: null,
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

    // create item class
    const createItemClassTxSig = await itemProgram.methods
      .createItemClass(createItemClassArgs)
      .accounts({
        itemClass: itemClass,
        itemMint: itemMint,
        metadata: itemMetadata,
        edition: itemMasterEdition,
        parent: itemClass,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts([
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: itemMetadata, isSigner: false, isWritable: false },
      ])
      .rpc({ skipPreflight: false });
    console.log("createItemClassTxSig: %s", createItemClassTxSig);

    // join item to namespace
    const joinNamespaceTxSig = await namespaceProgram.methods
      .joinNamespace()
      .accounts({
        namespace: namespace,
        namespaceToken: namespaceToken,
        artifact: itemClass,
        namespaceGatekeeper: namespaceGatekeeper,
        tokenHolder: provider.wallet.publicKey,
        itemProgram: itemProgram.programId,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc({ skipPreflight: true });
    console.log("joinNamespaceTxSig: %s", joinNamespaceTxSig);

    const indexPage = new anchor.BN(0);
    const cacheArtifactArgs = {
      page: indexPage,
    };

    const [index, _indexBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("namespace"),
        namespace.toBuffer(),
        indexPage.toArrayLike(Buffer, "le", 8),
      ],
      namespaceProgram.programId
    );

    const cacheArtifactTxSig = await namespaceProgram.methods
      .cacheArtifact(cacheArtifactArgs)
      .accounts({
        namespace: namespace,
        namespaceToken: namespaceToken,
        index: index,
        artifact: itemClass,
        tokenHolder: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        itemProgram: itemProgram.programId,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc({ skipPreflight: true });
    console.log("cacheArtifactTxSig: %s", cacheArtifactTxSig);

    const uncacheArtifactArgs = {
      page: indexPage,
    };

    const uncacheArtifactTxSig = await namespaceProgram.methods
      .uncacheArtifact(uncacheArtifactArgs)
      .accounts({
        namespace: namespace,
        namespaceToken: namespaceToken,
        index: index,
        artifact: itemClass,
        tokenHolder: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        itemProgram: itemProgram.programId,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc({ skipPreflight: true });
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactTxSig);

    // leave namespace
    const leaveNamespaceTxSig = await namespaceProgram.methods
      .leaveNamespace()
      .accounts({
        namespace: namespace,
        namespaceToken: namespaceToken,
        artifact: itemClass,
        namespaceGatekeeper: namespaceGatekeeper,
        tokenHolder: provider.wallet.publicKey,
        itemProgram: itemProgram.programId,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc({ skipPreflight: true });
    console.log("leaveNamespaceTxSig: %s", leaveNamespaceTxSig);
  });
});

const Permissiveness = {
  All: { all: {} },
  Whitelist: { whitelist: {} },
  Blacklist: { blacklist: {} },
  Namespace: { namespace: {} },
};

const ArtifactType = {
  Player: { player: {} },
  Item: { item: {} },
  Mission: { mission: {} },
  Namespace: { namespace: {} },
};

async function createMintMetadataAndMasterEditionAccounts(
  name: string,
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair
): Promise<
  [anchor.web3.PublicKey, anchor.web3.PublicKey, anchor.web3.PublicKey]
> {
  const mint = await splToken.createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    0,
    undefined,
    { commitment: "confirmed" }
  );

  const payerAta = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  await splToken.mintTo(connection, payer, mint, payerAta.address, payer, 1);

  // create metadata
  const [metadata, _metadataBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("metadata"), mpl.PROGRAM_ID.toBuffer(), mint.toBuffer()],
      mpl.PROGRAM_ID
    );

  const mdAccounts: mpl.CreateMetadataAccountV2InstructionAccounts = {
    metadata: metadata,
    mint: mint,
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

  // master edition
  const [masterEdition, _masterEditionBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

  const meAccounts: mpl.CreateMasterEditionV3InstructionAccounts = {
    metadata: metadata,
    edition: masterEdition,
    mint: mint,
    updateAuthority: payer.publicKey,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
  };

  const meArgs: mpl.CreateMasterEditionArgs = {
    maxSupply: new anchor.BN(1),
  };

  const meIxArgs: mpl.CreateMasterEditionV3InstructionArgs = {
    createMasterEditionArgs: meArgs,
  };
  const masterEditionIx = mpl.createCreateMasterEditionV3Instruction(
    meAccounts,
    meIxArgs
  );

  const createMdAndMeAccountsTxSig = await connection.sendTransaction(
    new anchor.web3.Transaction().add(metadataIx).add(masterEditionIx),
    [payer]
  );
  await connection.confirmTransaction(createMdAndMeAccountsTxSig, "confirmed");
  console.log(
    "%s createMdAndMeAccountsTxSig: %s",
    name,
    createMdAndMeAccountsTxSig
  );

  return [mint, metadata, masterEdition];
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
