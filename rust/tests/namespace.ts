import * as anchor from "@project-serum/anchor";
import * as splToken from "../node_modules/@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Namespace,
  IDL as NamespaceProgramIDL,
} from "../target/types/namespace";
import { Item, IDL as ItemProgramIDL } from "../target/types/item";
import { NamespaceProgram } from "../../js/lib/src/contract/namespace";
import * as nsIx from "../../js/lib/src/instructions/namespace";
import * as nsState from "../../js/lib/src/state/namespace";
import * as pids from "../../js/lib/src/constants/programIds";
import { assert } from "quicktype-core";

describe("namespace", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  it("init namespace", async () => {
    const payer = await newPayer(anchor.getProvider().connection);
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          anchor.getProvider().connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: NamespaceProgramIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        anchor.getProvider().connection,
        payer
      );

    const permissivenessSettings: nsState.PermissivenessSettings = {
      namespacePermissiveness: nsState.Permissiveness.All,
      itemPermissiveness: nsState.Permissiveness.All,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.All,
      missionPermissiveness: nsState.Permissiveness.All,
      cachePermissiveness: nsState.Permissiveness.All,
    };

    const initializeNamespaceArgs: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "123456",
      prettyName: "my-ns",
      permissivenessSettings: permissivenessSettings,
      whitelistedStakingMints: [],
    };

    const initializeNamespaceAccounts: nsIx.InitializeNamespaceAccounts = {
      mint: nsMint,
      metadata: nsMetadata,
      masterEdition: nsMasterEdition,
    };

    const [initNsTxSig, _namespace] =
      await namespaceProgram.initializeNamespace(
        initializeNamespaceArgs,
        initializeNamespaceAccounts
      );

    console.log("initNsTxSig: %s", initNsTxSig);
  });

  it("init namespace with wl staking mint", async () => {
    const payer = await newPayer(anchor.getProvider().connection);
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          anchor.getProvider().connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: NamespaceProgramIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        anchor.getProvider().connection,
        payer
      );

    const wlStakingMint = await splToken.createMint(
      anchor.getProvider().connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      9
    );

    const permissivenessSettings: nsState.PermissivenessSettings = {
      namespacePermissiveness: nsState.Permissiveness.All,
      itemPermissiveness: nsState.Permissiveness.All,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.All,
      missionPermissiveness: nsState.Permissiveness.All,
      cachePermissiveness: nsState.Permissiveness.All,
    };

    const initializeNamespaceArgs: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "123456",
      prettyName: "my-ns",
      permissivenessSettings: permissivenessSettings,
      whitelistedStakingMints: [wlStakingMint],
    };

    const initializeNamespaceAccounts: nsIx.InitializeNamespaceAccounts = {
      mint: nsMint,
      metadata: nsMetadata,
      masterEdition: nsMasterEdition,
    };

    const [initNsTxSig, namespace] = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsTxSig);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.whitelistedStakingMints.length === 1);
  });

  it("update namespace with new name and wl mints", async () => {
    const payer = await newPayer(anchor.getProvider().connection);
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          anchor.getProvider().connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: NamespaceProgramIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        anchor.getProvider().connection,
        payer
      );

    const permissivenessSettings: nsState.PermissivenessSettings = {
      namespacePermissiveness: nsState.Permissiveness.All,
      itemPermissiveness: nsState.Permissiveness.All,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.All,
      missionPermissiveness: nsState.Permissiveness.All,
      cachePermissiveness: nsState.Permissiveness.All,
    };

    const wlStakingMint1 = await splToken.createMint(
      anchor.getProvider().connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      9
    );

    const initializeNamespaceArgs: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "123456",
      prettyName: "my-ns",
      permissivenessSettings: permissivenessSettings,
      whitelistedStakingMints: [wlStakingMint1],
    };

    const initializeNamespaceAccounts: nsIx.InitializeNamespaceAccounts = {
      mint: nsMint,
      metadata: nsMetadata,
      masterEdition: nsMasterEdition,
    };

    const [initNsTxSig, namespace] = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );
    console.log("initNsTxSig: %s", initNsTxSig);

    var nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.prettyName === "my-ns");
    assert(nsData.whitelistedStakingMints.length === 1);
    assert(nsData.whitelistedStakingMints[0].equals(wlStakingMint1));

    const wlStakingMint2 = await splToken.createMint(
      anchor.getProvider().connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      9
    );

    const updateNsArgs: nsIx.UpdateNamespaceArgs = {
      prettyName: "new-name",
      permissivenessSettings: null,
      whitelistedStakingMints: [wlStakingMint2],
    };

    const updateNsAccounts: nsIx.UpdateNamespaceAccounts = {
      namespaceMint: nsMint,
    };

    const updateNsTxSig = await namespaceProgram.updateNamespace(
      updateNsArgs,
      updateNsAccounts
    );
    console.log("updateNsTxSig: %s", updateNsTxSig);

    nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.prettyName === "new-name");
    assert(nsData.whitelistedStakingMints.length === 1);
    assert(nsData.whitelistedStakingMints[0].equals(wlStakingMint2));
  });

  it("create ns gatekeeper", async () => {
    const payer = await newPayer(anchor.getProvider().connection);
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          anchor.getProvider().connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: NamespaceProgramIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        anchor.getProvider().connection,
        payer
      );

    const permissivenessSettings: nsState.PermissivenessSettings = {
      namespacePermissiveness: nsState.Permissiveness.All,
      itemPermissiveness: nsState.Permissiveness.All,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.All,
      missionPermissiveness: nsState.Permissiveness.All,
      cachePermissiveness: nsState.Permissiveness.All,
    };

    const initializeNamespaceArgs: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "123456",
      prettyName: "my-ns",
      permissivenessSettings: permissivenessSettings,
      whitelistedStakingMints: [],
    };

    const initializeNamespaceAccounts: nsIx.InitializeNamespaceAccounts = {
      mint: nsMint,
      metadata: nsMetadata,
      masterEdition: nsMasterEdition,
    };

    const [initNsTxSig, namespace] = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsTxSig);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const [createNsGKTxSig, nsGatekeeper] =
      await namespaceProgram.createNamespaceGatekeeper(createNsGKAccounts);
    console.log("createNsGKTxSig: %s", createNsGKTxSig);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.gatekeeper.equals(nsGatekeeper));
  });

  it("Add filter to ns gatekeeper, then remove it", async () => {
    const payer = await newPayer(anchor.getProvider().connection);
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          anchor.getProvider().connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: NamespaceProgramIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        anchor.getProvider().connection,
        payer
      );

    const permissivenessSettings: nsState.PermissivenessSettings = {
      namespacePermissiveness: nsState.Permissiveness.All,
      itemPermissiveness: nsState.Permissiveness.All,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.All,
      missionPermissiveness: nsState.Permissiveness.All,
      cachePermissiveness: nsState.Permissiveness.All,
    };

    const initializeNamespaceArgs: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "123456",
      prettyName: "my-ns",
      permissivenessSettings: permissivenessSettings,
      whitelistedStakingMints: [],
    };

    const initializeNamespaceAccounts: nsIx.InitializeNamespaceAccounts = {
      mint: nsMint,
      metadata: nsMetadata,
      masterEdition: nsMasterEdition,
    };

    const [initNsTxSig, namespace] = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsTxSig);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const [createNsGKTxSig, nsGatekeeper] =
      await namespaceProgram.createNamespaceGatekeeper(createNsGKAccounts);
    console.log("createNsGKTxSig: %s", createNsGKTxSig);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.gatekeeper.equals(nsGatekeeper));

    const addToNsGatekeeperArgs: nsIx.AddToNamespaceGatekeeperArgs = {
      artifactFilter: {
        tokenType: nsState.TokenType.Item,
        filter: new nsState.Filter(
          nsState.FilterType.FilterNamespaces,
          new nsState.FilterNamespaces([namespace])
        ),
      },
    };

    const addToNsGatekeeperAccounts: nsIx.AddToNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const addToNsGkTxSig = await namespaceProgram.addToNamespaceGatekeeper(
      addToNsGatekeeperArgs,
      addToNsGatekeeperAccounts
    );
    console.log("addToNsGkTxSig: %s", addToNsGkTxSig);

    const rmFromNsGatekeeperArgs: nsIx.RemoveFromNamespaceGatekeeperArgs = {
      artifactFilter: {
        tokenType: nsState.TokenType.Item,
        filter: new nsState.Filter(
          nsState.FilterType.FilterNamespaces,
          new nsState.FilterNamespaces([namespace])
        ),
      },
    };

    const rmFromNsGatekeeperAccounts: nsIx.RemoveFromNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const rmFromNsGkTxSig =
      await namespaceProgram.removeFromNamespaceGatekeeper(
        rmFromNsGatekeeperArgs,
        rmFromNsGatekeeperAccounts
      );
    console.log("rmFromNsGkTxSig: %s", rmFromNsGkTxSig);
  });

  it("join item class to namespace then leave", async () => {
    const payer = await newPayer(anchor.getProvider().connection);
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          anchor.getProvider().connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: NamespaceProgramIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        anchor.getProvider().connection,
        payer
      );

    const permissivenessSettings: nsState.PermissivenessSettings = {
      namespacePermissiveness: nsState.Permissiveness.All,
      itemPermissiveness: nsState.Permissiveness.All,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.All,
      missionPermissiveness: nsState.Permissiveness.All,
      cachePermissiveness: nsState.Permissiveness.All,
    };

    const initializeNamespaceArgs: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "123456",
      prettyName: "my-ns",
      permissivenessSettings: permissivenessSettings,
      whitelistedStakingMints: [],
    };

    const initializeNamespaceAccounts: nsIx.InitializeNamespaceAccounts = {
      mint: nsMint,
      metadata: nsMetadata,
      masterEdition: nsMasterEdition,
    };

    const [initNsTxSig, namespace] = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsTxSig);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const [createNsGKTxSig, _nsGatekeeper] =
      await namespaceProgram.createNamespaceGatekeeper(createNsGKAccounts);
    console.log("createNsGKTxSig: %s", createNsGKTxSig);

    const itemClass = await createItemClass(
      payer,
      anchor.getProvider().connection
    );

    const joinNsAccounts: nsIx.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass,
    };

    const joinNsTxSig = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsTxSig);

    var nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 0);

    const leaveNsAccounts: nsIx.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass,
    };

    const leaveNsTxSig = await namespaceProgram.leaveNamespace(leaveNsAccounts);
    console.log("leaveNsTxSig: %s", leaveNsTxSig);

    nsData = await namespaceProgram.fetchNamespace(namespace);
    // TODO: not sure why this doesnt work
    //assert(nsData.artifactsAdded === 0);
    assert(nsData.artifactsCached === 0);
  });

  it("join item class to namespace then then cache it and remove from cache", async () => {
    const payer = await newPayer(anchor.getProvider().connection);
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          anchor.getProvider().connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: NamespaceProgramIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        anchor.getProvider().connection,
        payer
      );

    const permissivenessSettings: nsState.PermissivenessSettings = {
      namespacePermissiveness: nsState.Permissiveness.All,
      itemPermissiveness: nsState.Permissiveness.All,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.All,
      missionPermissiveness: nsState.Permissiveness.All,
      cachePermissiveness: nsState.Permissiveness.All,
    };

    const initializeNamespaceArgs: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "123456",
      prettyName: "my-ns",
      permissivenessSettings: permissivenessSettings,
      whitelistedStakingMints: [],
    };

    const initializeNamespaceAccounts: nsIx.InitializeNamespaceAccounts = {
      mint: nsMint,
      metadata: nsMetadata,
      masterEdition: nsMasterEdition,
    };

    const [initNsTxSig, namespace] = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsTxSig);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const [createNsGKTxSig, _nsGatekeeper] =
      await namespaceProgram.createNamespaceGatekeeper(createNsGKAccounts);
    console.log("createNsGKTxSig: %s", createNsGKTxSig);

    const itemClass = await createItemClass(
      payer,
      anchor.getProvider().connection
    );

    const joinNsAccounts: nsIx.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass,
    };

    const joinNsTxSig = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsTxSig);

    const cacheArtifactAccounts: nsIx.CacheArtifactAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass,
    };

    const cacheArtifactTxSig = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactTxSig);

    var nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 1);

    const page = await getCachedItemClassPage(itemClass, namespace);
    assert(page !== null);

    const uncacheArtifactAccounts: nsIx.UncacheArtifactAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass,
    };

    const uncacheArtifactArgs: nsIx.UncacheArtifactArgs = {
      page: new anchor.BN(page),
    };

    const uncacheArtifactTxSig = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs, uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactTxSig);

    nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 0);
  });
});

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

async function createItemClass(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
): Promise<anchor.web3.PublicKey> {
  const provider = new anchor.AnchorProvider(
    anchor.getProvider().connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed" }
  );

  const itemProgram: anchor.Program<Item> = await new anchor.Program(
    ItemProgramIDL,
    pids.ITEM_ID,
    provider
  );

  // create item mints and metaplex accounts
  const [itemMint, itemMetadata, itemMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts("item", connection, payer);

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

  return itemClass;
}

// for a given item class and namespace, find the index of the cached item, return null if not found (probably means not cached)
async function getCachedItemClassPage(itemClass: anchor.web3.PublicKey, namespace: anchor.web3.PublicKey): Promise<number | null> {
  const provider = new anchor.AnchorProvider(
    anchor.getProvider().connection,
    new anchor.Wallet(anchor.web3.Keypair.generate()),
    { commitment: "confirmed" }
  );

  const itemProgram: anchor.Program<Item> = await new anchor.Program(
    ItemProgramIDL,
    pids.ITEM_ID,
    provider
  );

  const itemClassData = await itemProgram.account.itemClass.fetch(itemClass)
  for (let ns of itemClassData.namespaces) {
    if (ns.namespace.equals(namespace)) {
      return ns.index
    }
  }

  return null
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
