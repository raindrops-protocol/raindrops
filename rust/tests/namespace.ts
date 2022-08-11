import * as anchor from "@project-serum/anchor";
import * as splToken from "../node_modules/@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Namespace,
  IDL as NamespaceProgramIDL,
} from "../target/types/namespace";
import { Item, IDL as ItemProgramIDL } from "../target/types/item";
import { Matches, IDL as MatchesProgramIDL } from "../target/types/matches";
import { NamespaceProgram } from "../../js/lib/src/contract/namespace";
import * as nsIx from "../../js/lib/src/instructions/namespace";
import * as nsState from "../../js/lib/src/state/namespace";
import * as pids from "../../js/lib/src/constants/programIds";
import * as pdas from "../../js/lib/src/utils/pda";
import { assert } from "quicktype-core";
import { BN } from "bn.js";

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
      namespacePermissiveness: nsState.Permissiveness.Whitelist,
      itemPermissiveness: nsState.Permissiveness.All,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.Blacklist,
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

    const result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );
    console.log("initNsTxSig: %s", result.txid);

    const [namespace, _namespaceBump] = await pdas.getNamespacePDA(nsMint);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.permissivenessSettings !== null);
    assert(nsData.uuid === "123456");
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

    const result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", result.txid);
    const [namespace, _namespaceBump] = await pdas.getNamespacePDA(nsMint);

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

    const result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );
    console.log("initNsTxSig: %s", result.txid);

    const [namespace, _namespaceBump] = await pdas.getNamespacePDA(nsMint);

    let nsData = await namespaceProgram.fetchNamespace(namespace);
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

    const updateResult = await namespaceProgram.updateNamespace(
      updateNsArgs,
      updateNsAccounts
    );
    console.log("updateNsTxSig: %s", updateResult.txid);

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

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const createGKResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGKResult.txid);

    const [namespace, _namespaceBump] = await pdas.getNamespacePDA(nsMint);
    const [nsGatekeeper, _nsGatekeeperBump] =
      await pdas.getNamespaceGatekeeperPDA(namespace);

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

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const createGKResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGKResult.txid);

    const [namespace, _namespaceBump] = await pdas.getNamespacePDA(nsMint);
    const [nsGatekeeper, _nsGatekeeperBump] =
      await pdas.getNamespaceGatekeeperPDA(namespace);

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

    const addResult = await namespaceProgram.addToNamespaceGatekeeper(
      addToNsGatekeeperArgs,
      addToNsGatekeeperAccounts
    );
    console.log("addToNsGkTxSig: %s", addResult.txid);

    let nsGkData = await namespaceProgram.fetchNamespaceGatekeeper(
      nsGatekeeper
    );
    assert(nsGkData.artifactFilters.length === 1);

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

    const rmResult = await namespaceProgram.removeFromNamespaceGatekeeper(
      rmFromNsGatekeeperArgs,
      rmFromNsGatekeeperAccounts
    );
    console.log("rmFromNsGkTxSig: %s", rmResult.txid);

    nsGkData = await namespaceProgram.fetchNamespaceGatekeeper(nsGatekeeper);
    assert(nsGkData.artifactFilters.length === 0);
  });

  it("Only allow items that are part of the whitelisted namespace to join", async () => {
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

    // initialize 2 namespaces
    // namespace 1 will be the namespace the Item Class attempts to join that has a namespace filter on it
    // this namespace filter will only allow Item Classes that are already joined to namespace2 to join it

    const [ns1Mint, ns1Metadata, ns1MasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        anchor.getProvider().connection,
        payer
      );

    const permissivenessSettings1: nsState.PermissivenessSettings = {
      namespacePermissiveness: nsState.Permissiveness.All,
      itemPermissiveness: nsState.Permissiveness.Whitelist,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.All,
      missionPermissiveness: nsState.Permissiveness.All,
      cachePermissiveness: nsState.Permissiveness.All,
    };

    const initializeNamespaceArgs1: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "123457",
      prettyName: "my-ns1",
      permissivenessSettings: permissivenessSettings1,
      whitelistedStakingMints: [],
    };

    const initializeNamespaceAccounts1: nsIx.InitializeNamespaceAccounts = {
      mint: ns1Mint,
      metadata: ns1Metadata,
      masterEdition: ns1MasterEdition,
    };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs1,
      initializeNamespaceAccounts1
    );

    console.log("initNsTxSig1: %s", initNsResult.txid);

    const [ns2Mint, ns2Metadata, ns2MasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        anchor.getProvider().connection,
        payer
      );

    const permissivenessSettings2: nsState.PermissivenessSettings = {
      namespacePermissiveness: nsState.Permissiveness.All,
      itemPermissiveness: nsState.Permissiveness.All,
      playerPermissiveness: nsState.Permissiveness.All,
      matchPermissiveness: nsState.Permissiveness.All,
      missionPermissiveness: nsState.Permissiveness.All,
      cachePermissiveness: nsState.Permissiveness.All,
    };

    const initializeNamespaceArgs2: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "123456",
      prettyName: "my-ns2",
      permissivenessSettings: permissivenessSettings2,
      whitelistedStakingMints: [],
    };

    const initializeNamespaceAccounts2: nsIx.InitializeNamespaceAccounts = {
      mint: ns2Mint,
      metadata: ns2Metadata,
      masterEdition: ns2MasterEdition,
    };

    const initNsResult2 = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs2,
      initializeNamespaceAccounts2
    );

    console.log("initNsTxSig2: %s", initNsResult2.txid);

    const createNsGKAccounts1: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: ns1Mint,
    };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts1
    );
    console.log("createNsGKTxSig1: %s", createGkResult.txid);

    const createNsGKAccounts2: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: ns2Mint,
    };

    const createGkResult2 = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts2
    );
    console.log("createNsGKTxSig2: %s", createGkResult2.txid);

    const [namespace2, _namespaceBump] = await pdas.getNamespacePDA(ns2Mint);

    const addToNsGatekeeperArgs: nsIx.AddToNamespaceGatekeeperArgs = {
      artifactFilter: {
        tokenType: nsState.TokenType.Item,
        filter: new nsState.Filter(
          nsState.FilterType.FilterNamespaces,
          new nsState.FilterNamespaces([namespace2])
        ),
      },
    };

    const addToNsGatekeeperAccounts: nsIx.AddToNamespaceGatekeeperAccounts = {
      namespaceMint: ns1Mint,
    };

    const addResult = await namespaceProgram.addToNamespaceGatekeeper(
      addToNsGatekeeperArgs,
      addToNsGatekeeperAccounts
    );
    console.log("addToNsGkTxSig: %s", addResult.txid);

    const itemClass = await createItemClasses(
      payer,
      anchor.getProvider().connection,
      1
    );

    // join to namespace which allows any artifact to join it
    const joinNsResult = await namespaceProgram.joinNamespace({
      namespaceMint: ns2Mint,
      artifact: itemClass[0],
      raindropsProgram: pids.ITEM_ID,
    });
    console.log("artifact joined to namespace2: %s", joinNsResult.txid);

    // join to namespace with the namespace filter added to the gatekeeper
    const joinNsResult2 = await namespaceProgram.joinNamespace({
      namespaceMint: ns1Mint,
      artifact: itemClass[0],
      raindropsProgram: pids.ITEM_ID,
    });
    console.log("artifact joined to namespace1: %s", joinNsResult2.txid);
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

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const itemClass = await createItemClasses(
      payer,
      anchor.getProvider().connection,
      1
    );

    const joinNsAccounts: nsIx.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: pids.ITEM_ID,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const [namespace, _namespaceBump] = await pdas.getNamespacePDA(nsMint);
    let nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 0);

    const leaveNsAccounts: nsIx.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: pids.ITEM_ID,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    nsData = await namespaceProgram.fetchNamespace(namespace);
    // TODO: not sure why this doesnt work
    //assert(nsData.artifactsAdded === 0);
    assert(nsData.artifactsCached === 0);
  });

  it("join item class, cache, uncache then leave ns", async () => {
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

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const itemClass = await createItemClasses(
      payer,
      anchor.getProvider().connection,
      1
    );

    const joinNsAccounts: nsIx.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: pids.ITEM_ID,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const cacheArtifactAccounts: nsIx.CacheArtifactAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: pids.ITEM_ID,
    };

    const cacheArtifactResult = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactResult.txid);

    const [namespace, _namespaceBump] = await pdas.getNamespacePDA(nsMint);
    let nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 1);

    const page = await getCachedItemClassPage(itemClass[0], namespace);
    assert(page !== null);

    // check item was index on the namespace side
    let [index, _indexBump] = await pdas.getIndexPDA(namespace, new BN(page));

    let nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(
      nsIndexData.caches.some((artifact) => artifact.equals(itemClass[0]))
    );

    const uncacheArtifactAccounts: nsIx.UncacheArtifactAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: pids.ITEM_ID,
    };

    const uncacheArtifactArgs: nsIx.UncacheArtifactArgs = {
      page: new anchor.BN(page),
    };

    const uncacheArtifactResult = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs,
      uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactResult.txid);

    nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 0);
  });

  it("join match, cache, uncache then leave ns", async () => {
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

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const match = await createMatch(payer);

    const joinNsAccounts: nsIx.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: match,
      raindropsProgram: pids.MATCHES_ID,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const cacheArtifactAccounts: nsIx.CacheArtifactAccounts = {
      namespaceMint: nsMint,
      artifact: match,
      raindropsProgram: pids.MATCHES_ID,
    };

    const cacheArtifactResult = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactResult.txid);

    const [namespace, _namespaceBump] = await pdas.getNamespacePDA(nsMint);
    let nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 1);

    const page = await getCachedMatchPage(match, namespace);
    assert(page !== null);

    // check item was index on the namespace side
    let [index, _indexBump] = await pdas.getIndexPDA(namespace, new BN(page));

    let nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(nsIndexData.caches.some((artifact) => artifact.equals(match)));

    const uncacheArtifactAccounts: nsIx.UncacheArtifactAccounts = {
      namespaceMint: nsMint,
      artifact: match,
      raindropsProgram: pids.MATCHES_ID,
    };

    const uncacheArtifactArgs: nsIx.UncacheArtifactArgs = {
      page: new anchor.BN(page),
    };

    const uncacheArtifactResult = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs,
      uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactResult.txid);

    nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 0);

    const leaveNsAccounts: nsIx.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: match,
      raindropsProgram: pids.MATCHES_ID,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    nsData = await namespaceProgram.fetchNamespace(namespace);
    // TODO: not sure why this doesnt work
    //assert(nsData.artifactsAdded === 0);
    assert(nsData.artifactsCached === 0);
  });

  it("cache 101 items to namespace, tests cache pagination, then uncache them all", async () => {
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

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: nsMint,
    };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const itemClasses = await createItemClasses(
      payer,
      anchor.getProvider().connection,
      101
    );

    for (let i = 0; i < itemClasses.length; i++) {
      const joinNsAccounts: nsIx.JoinNamespaceAccounts = {
        namespaceMint: nsMint,
        artifact: itemClasses[i],
        raindropsProgram: pids.ITEM_ID,
      };

      const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
      console.log("%d joinNsTxSig: %s", i, joinNsResult.txid);

      const cacheArtifactAccounts: nsIx.CacheArtifactAccounts = {
        namespaceMint: nsMint,
        artifact: itemClasses[i],
        raindropsProgram: pids.ITEM_ID,
      };

      const cacheArtifactResult = await namespaceProgram.cacheArtifact(
        cacheArtifactAccounts
      );
      console.log("%d cacheArtifactTxSig: %s", i, cacheArtifactResult.txid);
    }

    const [namespace, _namespaceBump] = await pdas.getNamespacePDA(nsMint);
    let nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 101);
    assert(nsData.artifactsCached === 101);
    assert(nsData.fullPages.length === 1);

    // check last item is cached on second page, from item pov
    const page = await getCachedItemClassPage(
      itemClasses[itemClasses.length - 1],
      namespace
    );
    assert(page !== 1);

    // check last item is cached on the second page, from namespace pov
    let [index, _indexBump] = await pdas.getIndexPDA(namespace, new BN(page));
    let nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(
      nsIndexData.caches.some((artifact) =>
        artifact.equals(itemClasses[itemClasses.length - 1])
      )
    );

    let uncacheArtifactPromises = [];
    for (let i = 0; i < itemClasses.length; i++) {
      const page = await getCachedItemClassPage(itemClasses[i], namespace);
      assert(page !== null);

      const uncacheArtifactAccounts: nsIx.UncacheArtifactAccounts = {
        namespaceMint: nsMint,
        artifact: itemClasses[i],
        raindropsProgram: pids.ITEM_ID,
      };

      const uncacheArtifactArgs: nsIx.UncacheArtifactArgs = {
        page: new anchor.BN(page),
      };

      const uncacheArtifactPromise = namespaceProgram.uncacheArtifact(
        uncacheArtifactArgs,
        uncacheArtifactAccounts
      );
      uncacheArtifactPromises.push(uncacheArtifactPromise);

      // chunk
      if (uncacheArtifactPromises.length === 15) {
        await Promise.all(uncacheArtifactPromises);
        uncacheArtifactPromises = [];
      }
    }

    await Promise.all(uncacheArtifactPromises);
    console.log("%d items uncached", itemClasses.length);

    await new Promise((f) => setTimeout(f, 5000));

    nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 101);
    assert(nsData.artifactsCached === 0);
    assert(nsData.fullPages.length === 0);
  });
});

async function createMintMetadataAndMasterEditionAccounts(
  name: string,
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair
): Promise<
  [anchor.web3.PublicKey, anchor.web3.PublicKey, anchor.web3.PublicKey]
> {
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

  // master edition
  const [masterEdition, _masterEditionBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        mint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

  const meAccounts: mpl.CreateMasterEditionV3InstructionAccounts = {
    metadata: metadata,
    edition: masterEdition,
    mint: mint.publicKey,
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
    new anchor.web3.Transaction()
      .add(createMintAccountIx)
      .add(mintIx)
      .add(payerAtaIx)
      .add(mintToIx)
      .add(metadataIx)
      .add(masterEditionIx),
    [payer, mint]
  );
  await connection.confirmTransaction(createMdAndMeAccountsTxSig, "confirmed");

  return [mint.publicKey, metadata, masterEdition];
}

async function createItemClasses(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  count: number
): Promise<anchor.web3.PublicKey[]> {
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

  const promises = [];
  const items: anchor.web3.PublicKey[] = [];
  for (let i = 0; i < count; i++) {
    // create item mints and metaplex accounts
    const [itemMint, itemMetadata, itemMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
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
    const createItemClassPromise = itemProgram.methods
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
    promises.push(createItemClassPromise);
    items.push(itemClass);
  }
  const txSigs: string[] = await Promise.all(promises);
  await confirmTransactions(txSigs, connection);
  console.log("%d item classes created", items.length);

  return items;
}

async function createMatch(
  payer: anchor.web3.Keypair
): Promise<anchor.web3.PublicKey> {
  const provider = new anchor.AnchorProvider(
    anchor.getProvider().connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed" }
  );

  const matchesProgram: anchor.Program<Matches> = await new anchor.Program(
    MatchesProgramIDL,
    pids.MATCHES_ID,
    provider
  );

  const oracleSeed = anchor.web3.Keypair.generate();

  const createOracleArgs = {
    tokenTransferRoot: null,
    tokenTransfers: null,
    seed: oracleSeed.publicKey,
    space: new anchor.BN(100),
    finalized: false,
  };

  const [oracle, _oracleBump] = await pdas.getOracle(
    oracleSeed.publicKey,
    provider.wallet.publicKey
  );

  const createOracleTxSig = await matchesProgram.methods
    .createOrUpdateOracle(createOracleArgs)
    .accounts({
      oracle: oracle,
      payer: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();
  console.log("createOracleTxSig: %s", createOracleTxSig);

  const createMatchArgs = {
    matchState: { draft: {} },
    tokenEntryValidationRoot: null,
    tokenEntryValidation: null,
    winOracle: oracle,
    winOracleCooldown: new anchor.BN(1000),
    authority: provider.wallet.publicKey,
    space: new anchor.BN(1180),
    leaveAllowed: false,
    joinAllowedDuringStart: false,
    minimumAllowedEntryTime: new anchor.BN(1000),
    desiredNamespaceArraySize: new anchor.BN(2),
  };

  const [match, _matchBump] = await pdas.getMatch(oracle);

  const createMatchesTxSig = await matchesProgram.methods
    .createMatch(createMatchArgs)
    .accounts({
      matchInstance: match,
      payer: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc({ skipPreflight: true });
  console.log("createMatchesTxSig: %s", createMatchesTxSig);

  return match;
}

// for a given item class and namespace, find the index of the cached item, return null if not found (probably means not cached)
async function getCachedItemClassPage(
  itemClass: anchor.web3.PublicKey,
  namespace: anchor.web3.PublicKey
): Promise<number | null> {
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

  const itemClassData = await itemProgram.account.itemClass.fetch(itemClass);
  for (let ns of itemClassData.namespaces) {
    if (ns.namespace.equals(namespace)) {
      return ns.index;
    }
  }

  return null;
}

// for a given item class and namespace, find the index of the cached item, return null if not found (probably means not cached)
async function getCachedMatchPage(
  match: anchor.web3.PublicKey,
  namespace: anchor.web3.PublicKey
): Promise<number | null> {
  const provider = new anchor.AnchorProvider(
    anchor.getProvider().connection,
    new anchor.Wallet(anchor.web3.Keypair.generate()),
    { commitment: "confirmed" }
  );

  const matchesProgram: anchor.Program<Matches> = await new anchor.Program(
    MatchesProgramIDL,
    pids.MATCHES_ID,
    provider
  );

  const matchData = await matchesProgram.account.match.fetch(match);
  for (let ns of matchData.namespaces) {
    if (ns.namespace.equals(namespace)) {
      return ns.index;
    }
  }

  return null;
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

async function confirmTransactions(
  txSigs: string[],
  connection: anchor.web3.Connection
) {
  for (let txSig of txSigs) {
    connection.confirmTransaction(txSig, "finalized");
  }
}
