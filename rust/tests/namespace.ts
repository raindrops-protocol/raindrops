import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as splToken from "../node_modules/@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  State,
  Instructions,
  Utils,
  Constants,
  NamespaceProgram,
  ItemProgram,
  PlayerProgram,
  Idls,
} from "@raindrops-protocol/raindrops";
import assert = require("assert");

describe("namespace", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const rainTokenMint = Constants.Common.RAIN_TOKEN_MINT;

  // receives all $RAIN payments
  const rainVaultAuthority = Constants.Common.RAIN_TOKEN_VAULT_AUTHORITY;

  // Mint Authority for our mock $RAIN
  const mintAuthoritySecretKey = new Uint8Array([
    100, 162, 5, 160, 251, 9, 105, 243, 77, 211, 169, 101, 169, 237, 4, 234, 35,
    250, 235, 162, 55, 77, 144, 249, 220, 185, 242, 225, 8, 160, 200, 130, 1,
    237, 169, 176, 82, 206, 183, 81, 233, 30, 153, 237, 13, 46, 130, 71, 22,
    179, 133, 3, 170, 140, 225, 16, 11, 210, 69, 163, 102, 144, 242, 169,
  ]);
  // address: 8XbgRBz8pHzCBy4mwgr4ViDhJWFc35cd7E5oo3t5FvY
  const rainTokenMintAuthority = anchor.web3.Keypair.fromSecretKey(
    mintAuthoritySecretKey
  );

  const connection = anchor.getProvider().connection;

  before("create rain token vault", async () => {
    const tokenVaultPayer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      tokenVaultPayer,
      rainTokenMint,
      rainVaultAuthority
    );
  });

  it("init namespace", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.Whitelist,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.Blacklist,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );
    console.log("initNsTxSig: %s", result.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.permissivenessSettings !== null);
    assert(nsData.uuid === "123456");
    assert(nsData.paymentAmount === null);
    assert(nsData.paymentMint === null);
    assert(nsData.paymentVault === null);
  });

  it("init namespace with payment accounts", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const [paymentMint, paymentVault] = await createPaymentAccounts(
      connection,
      payer
    );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.Whitelist,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.Blacklist,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const paymentAmount = new anchor.BN(1_000_000_000);
    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
        paymentAmount: paymentAmount,
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
        paymentMint: paymentMint,
        paymentVault: paymentVault,
      };

    const result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );
    console.log("initNsTxSig: %s", result.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.permissivenessSettings !== null);
    assert(nsData.uuid === "123456");
    assert(nsData.paymentAmount === paymentAmount.toNumber());
    assert(nsData.paymentMint.equals(paymentMint));
    assert(nsData.paymentVault.equals(paymentVault));
  });

  it("init namespace with wl staking mint", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const wlStakingMint = await splToken.createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      9
    );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [wlStakingMint],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", result.txid);
    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.whitelistedStakingMints.length === 1);
    assert(nsData.paymentAmount === null);
    assert(nsData.paymentMint === null);
    assert(nsData.paymentVault === null);
  });

  it("init namespace with wl staking mint and payment accounts", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const wlStakingMint = await splToken.createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      9
    );

    const [paymentMint, paymentVault] = await createPaymentAccounts(
      connection,
      payer
    );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const paymentAmount = new anchor.BN(1_000_000_000);
    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [wlStakingMint],
        paymentAmount: paymentAmount,
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
        paymentMint: paymentMint,
        paymentVault: paymentVault,
      };

    const result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", result.txid);
    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.whitelistedStakingMints.length === 1);
    assert(nsData.paymentAmount === paymentAmount.toNumber());
    assert(nsData.paymentMint.equals(paymentMint));
    assert(nsData.paymentVault.equals(paymentVault));
  });

  it("update namespace with new name and wl mints", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const wlStakingMint1 = await splToken.createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      9
    );

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [wlStakingMint1],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );
    console.log("initNsTxSig: %s", result.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.prettyName === "my-ns");
    assert(nsData.whitelistedStakingMints.length === 1);
    assert(nsData.whitelistedStakingMints[0].equals(wlStakingMint1));

    const wlStakingMint2 = await splToken.createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      9
    );

    const updateNsArgs: Instructions.Namespace.UpdateNamespaceArgs = {
      prettyName: "new-name",
      permissivenessSettings: null,
      whitelistedStakingMints: [wlStakingMint2],
    };

    const updateNsAccounts: Instructions.Namespace.UpdateNamespaceAccounts = {
      namespaceMint: nsMint,
    };

    const updateResult = await namespaceProgram.updateNamespace(
      updateNsArgs,
      updateNsAccounts
    );
    console.log("updateNsTxSig: %s", updateResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.prettyName === "new-name");
    assert(nsDataUpdated.whitelistedStakingMints.length === 1);
    assert(nsDataUpdated.whitelistedStakingMints[0].equals(wlStakingMint2));
  });

  it("create ns gatekeeper", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGKResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGKResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const [nsGatekeeper, _nsGatekeeperBump] =
      await Utils.PDA.getNamespaceGatekeeperPDA(namespace);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.gatekeeper.equals(nsGatekeeper));
  });

  it("Add filter to ns gatekeeper, then remove it", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGKResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGKResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const [nsGatekeeper, _nsGatekeeperBump] =
      await Utils.PDA.getNamespaceGatekeeperPDA(namespace);

    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.gatekeeper.equals(nsGatekeeper));

    const addToNsGatekeeperArgs: Instructions.Namespace.AddToNamespaceGatekeeperArgs =
      {
        artifactFilter: {
          tokenType: State.Namespace.TokenType.Item,
          filter: new State.Namespace.Filter(
            State.Namespace.FilterType.FilterNamespaces,
            new State.Namespace.FilterNamespaces([namespace])
          ),
        },
      };

    const addToNsGatekeeperAccounts: Instructions.Namespace.AddToNamespaceGatekeeperAccounts =
      {
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
    assert((nsGkData.artifactFilters.length as number) === 1);

    const rmFromNsGatekeeperArgs: Instructions.Namespace.RemoveFromNamespaceGatekeeperArgs =
      {
        artifactFilter: {
          tokenType: State.Namespace.TokenType.Item,
          filter: new State.Namespace.Filter(
            State.Namespace.FilterType.FilterNamespaces,
            new State.Namespace.FilterNamespaces([namespace])
          ),
        },
      };

    const rmFromNsGatekeeperAccounts: Instructions.Namespace.RemoveFromNamespaceGatekeeperAccounts =
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
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    // initialize 2 namespaces
    // namespace 1 will be the namespace the Item Class attempts to join that has a namespace filter on it
    // this namespace filter will only allow Item Classes that are already joined to namespace2 to join it

    const [ns1Mint, ns1Metadata, ns1MasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings1: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.Whitelist,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs1: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123457",
        prettyName: "my-ns1",
        permissivenessSettings: permissivenessSettings1,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts1: Instructions.Namespace.InitializeNamespaceAccounts =
      {
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
        connection,
        payer
      );

    const permissivenessSettings2: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs2: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns2",
        permissivenessSettings: permissivenessSettings2,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts2: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: ns2Mint,
        metadata: ns2Metadata,
        masterEdition: ns2MasterEdition,
      };

    const initNsResult2 = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs2,
      initializeNamespaceAccounts2
    );

    console.log("initNsTxSig2: %s", initNsResult2.txid);

    const createNsGKAccounts1: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: ns1Mint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts1
    );
    console.log("createNsGKTxSig1: %s", createGkResult.txid);

    const createNsGKAccounts2: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: ns2Mint,
      };

    const createGkResult2 = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts2
    );
    console.log("createNsGKTxSig2: %s", createGkResult2.txid);

    const [namespace2, _namespaceBump] = await Utils.PDA.getNamespacePDA(
      ns2Mint
    );

    const addToNsGatekeeperArgs: Instructions.Namespace.AddToNamespaceGatekeeperArgs =
      {
        artifactFilter: {
          tokenType: State.Namespace.TokenType.Item,
          filter: new State.Namespace.Filter(
            State.Namespace.FilterType.FilterNamespaces,
            new State.Namespace.FilterNamespaces([namespace2])
          ),
        },
      };

    const addToNsGatekeeperAccounts: Instructions.Namespace.AddToNamespaceGatekeeperAccounts =
      {
        namespaceMint: ns1Mint,
      };

    const addResult = await namespaceProgram.addToNamespaceGatekeeper(
      addToNsGatekeeperArgs,
      addToNsGatekeeperAccounts
    );
    console.log("addToNsGkTxSig: %s", addResult.txid);

    const itemClass = await createItemClasses(payer, connection, 1);

    // join to namespace which allows any artifact to join it
    const joinNsResult = await namespaceProgram.joinNamespace({
      namespaceMint: ns2Mint,
      artifact: itemClass[0],
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    });
    console.log("artifact joined to namespace2: %s", joinNsResult.txid);

    // join to namespace with the namespace filter added to the gatekeeper
    const joinNsResult2 = await namespaceProgram.joinNamespace({
      namespaceMint: ns1Mint,
      artifact: itemClass[0],
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    });
    console.log("artifact joined to namespace1: %s", joinNsResult2.txid);
  });

  it("join item class to namespace then leave", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const itemClass = await createItemClasses(payer, connection, 1);

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 0);

    const leaveNsAccounts: Instructions.Namespace.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 0);
    assert(nsDataUpdated.artifactsCached === 0);
  });

  it("join item to namespace then leave", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const itemClass = await createItemClasses(payer, connection, 1);

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 0);

    const leaveNsAccounts: Instructions.Namespace.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 0);
    assert(nsDataUpdated.artifactsCached === 0);
  });

  it("pay with arbitrary token to join item to namespace then leave", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const [paymentMint, paymentVault] = await createPaymentAccounts(
      connection,
      payer
    );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const paymentAmount = new anchor.BN(1_000_000_000);
    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
        paymentAmount: paymentAmount,
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
        paymentMint: paymentMint,
        paymentVault: paymentVault,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );
    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.paymentAmount === paymentAmount.toNumber());
    assert(nsData.paymentMint.equals(paymentMint));
    assert(nsData.paymentVault.equals(paymentVault));

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const itemClass = await createItemClasses(payer, connection, 1);

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 1);
    assert(nsDataUpdated.artifactsCached === 0);

    // check arbitrary token payment was made
    const paymentResponse = await connection.getTokenAccountBalance(
      paymentVault,
      "confirmed"
    );
    assert(paymentResponse.value.uiAmount === 100);

    const leaveNsAccounts: Instructions.Namespace.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    const nsDataUpdated2 = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated2.artifactsAdded === 0);
    assert(nsDataUpdated2.artifactsCached === 0);
  });

  it("join item escrow to namespace, cache, uncache then leave", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const itemEscrow = await createItemEscrow(payer, connection);

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemEscrow,
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 0);

    const cacheArtifactAccounts: Instructions.Namespace.CacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: itemEscrow,
        raindropsProgram: State.Namespace.RaindropsProgram.Item,
      };

    const cacheArtifactResult = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 1);
    assert(nsDataUpdated.artifactsCached === 1);

    const uncacheArtifactAccounts: Instructions.Namespace.UncacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: itemEscrow,
        raindropsProgram: State.Namespace.RaindropsProgram.Item,
      };

    const uncacheArtifactArgs: Instructions.Namespace.UncacheArtifactArgs = {
      page: new anchor.BN(0),
    };

    const uncacheArtifactResult = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs,
      uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactResult.txid);

    const nsDataUpdated2 = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated2.artifactsAdded === 1);
    assert(nsDataUpdated2.artifactsCached === 0);

    const leaveNsAccounts: Instructions.Namespace.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemEscrow,
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    const nsDataUpdated3 = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated3.artifactsAdded === 0);
    assert(nsDataUpdated3.artifactsCached === 0);
  });

  it("join item to namespace, cache, uncache then leave", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const item = await createItemEscrowAndCompleteBuild(payer, connection);
    console.log("item: %s", item.toString());

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: item,
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 0);

    const cacheArtifactAccounts: Instructions.Namespace.CacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: item,
        raindropsProgram: State.Namespace.RaindropsProgram.Item,
      };

    const cacheArtifactResult = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 1);
    assert(nsDataUpdated.artifactsCached === 1);

    const uncacheArtifactAccounts: Instructions.Namespace.UncacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: item,
        raindropsProgram: State.Namespace.RaindropsProgram.Item,
      };

    const uncacheArtifactArgs: Instructions.Namespace.UncacheArtifactArgs = {
      page: new anchor.BN(0),
    };

    const uncacheArtifactResult = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs,
      uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactResult.txid);

    const nsDataUpdated2 = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated2.artifactsAdded === 1);
    assert(nsDataUpdated2.artifactsCached === 0);

    const leaveNsAccounts: Instructions.Namespace.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: item,
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    const nsDataUpdated3 = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated3.artifactsAdded === 0);
    assert(nsDataUpdated3.artifactsCached === 0);
  });

  it("join item class, cache, uncache then leave ns", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const itemClass = await createItemClasses(payer, connection, 1);

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: itemClass[0],
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const cacheArtifactAccounts: Instructions.Namespace.CacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: itemClass[0],
        raindropsProgram: State.Namespace.RaindropsProgram.Item,
      };

    const cacheArtifactResult = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 1);

    const page = await getCachedItemClassPage(
      connection,
      itemClass[0],
      namespace
    );
    assert(page !== null);
    console.log("item cached at %d", page);

    // check item was index on the namespace side
    let [index, _indexBump] = await Utils.PDA.getIndexPDA(
      namespace,
      new BN(page)
    );

    let nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(
      nsIndexData.caches.some((artifact) => artifact.equals(itemClass[0]))
    );

    const uncacheArtifactAccounts: Instructions.Namespace.UncacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: itemClass[0],
        raindropsProgram: State.Namespace.RaindropsProgram.Item,
      };

    const uncacheArtifactArgs: Instructions.Namespace.UncacheArtifactArgs = {
      page: new anchor.BN(page),
    };

    const uncacheArtifactResult = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs,
      uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 1);
    assert(nsDataUpdated.artifactsCached === 0);
  });

  it("join match, cache, uncache then leave ns", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const match = await createMatch(connection, payer, 2);

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: match,
      raindropsProgram: State.Namespace.RaindropsProgram.Matches,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const cacheArtifactAccounts: Instructions.Namespace.CacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: match,
        raindropsProgram: State.Namespace.RaindropsProgram.Matches,
      };

    const cacheArtifactResult = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 1);

    const page = await getCachedMatchPage(connection, match, namespace);
    assert(page !== null);

    // check item was index on the namespace side
    let [index, _indexBump] = await Utils.PDA.getIndexPDA(
      namespace,
      new BN(page)
    );

    let nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(nsIndexData.caches.some((artifact) => artifact.equals(match)));

    const uncacheArtifactAccounts: Instructions.Namespace.UncacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: match,
        raindropsProgram: State.Namespace.RaindropsProgram.Matches,
      };

    const uncacheArtifactArgs: Instructions.Namespace.UncacheArtifactArgs = {
      page: new anchor.BN(page),
    };

    const uncacheArtifactResult = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs,
      uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 1);
    assert(nsDataUpdated.artifactsCached === 0);

    const leaveNsAccounts: Instructions.Namespace.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: match,
      raindropsProgram: State.Namespace.RaindropsProgram.Matches,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    const nsDataUpdatedAgain = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdatedAgain.artifactsAdded === 0);
    assert(nsDataUpdatedAgain.artifactsCached === 0);
  });

  it("join player class, cache, uncache then leave ns", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const [player, _playerMint] = await createPlayerClass(payer, connection);

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: player,
      raindropsProgram: State.Namespace.RaindropsProgram.Player,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const cacheArtifactAccounts: Instructions.Namespace.CacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: player,
        raindropsProgram: State.Namespace.RaindropsProgram.Player,
      };

    const cacheArtifactResult = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 1);

    // check player was indexed on the namespace side
    let [index, _indexBump] = await Utils.PDA.getIndexPDA(namespace, new BN(0));

    let nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(nsIndexData.caches.some((artifact) => artifact.equals(player)));

    const uncacheArtifactAccounts: Instructions.Namespace.UncacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: player,
        raindropsProgram: State.Namespace.RaindropsProgram.Player,
      };

    const uncacheArtifactArgs: Instructions.Namespace.UncacheArtifactArgs = {
      page: new anchor.BN(0),
    };

    const uncacheArtifactResult = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs,
      uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 1);
    assert(nsDataUpdated.artifactsCached === 0);

    const leaveNsAccounts: Instructions.Namespace.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: player,
      raindropsProgram: State.Namespace.RaindropsProgram.Player,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    const nsDataUpdatedAgain = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdatedAgain.artifactsAdded === 0);
    assert(nsDataUpdatedAgain.artifactsCached === 0);
  });

  it("join player, cache, uncache then leave ns", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const [_playerClass, playerClassMint] = await createPlayerClass(
      payer,
      connection
    );
    const player = await createPlayer(payer, connection, playerClassMint);

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: player,
      raindropsProgram: State.Namespace.RaindropsProgram.Player,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const cacheArtifactAccounts: Instructions.Namespace.CacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: player,
        raindropsProgram: State.Namespace.RaindropsProgram.Player,
      };

    const cacheArtifactResult = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactResult.txid);

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 1);
    assert(nsData.artifactsCached === 1);

    // check player was indexed on the namespace side
    let [index, _indexBump] = await Utils.PDA.getIndexPDA(namespace, new BN(0));

    let nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(nsIndexData.caches.some((artifact) => artifact.equals(player)));

    const uncacheArtifactAccounts: Instructions.Namespace.UncacheArtifactAccounts =
      {
        namespaceMint: nsMint,
        artifact: player,
        raindropsProgram: State.Namespace.RaindropsProgram.Player,
      };

    const uncacheArtifactArgs: Instructions.Namespace.UncacheArtifactArgs = {
      page: new anchor.BN(0),
    };

    const uncacheArtifactResult = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs,
      uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactResult.txid);

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 1);
    assert(nsDataUpdated.artifactsCached === 0);

    const leaveNsAccounts: Instructions.Namespace.LeaveNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: player,
      raindropsProgram: State.Namespace.RaindropsProgram.Player,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    const nsDataUpdatedAgain = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdatedAgain.artifactsAdded === 0);
    assert(nsDataUpdatedAgain.artifactsCached === 0);
  });

  it("join namespace, cache, uncache then leave ns", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [ns1Mint, ns1Metadata, ns1MasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings1: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs1: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings1,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts1: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: ns1Mint,
        metadata: ns1Metadata,
        masterEdition: ns1MasterEdition,
      };

    const initNs1Result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs1,
      initializeNamespaceAccounts1
    );

    console.log("initNs1TxSig: %s", initNs1Result.txid);

    const [ns2Mint, ns2Metadata, ns2MasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings2: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs2: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings2,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts2: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: ns2Mint,
        metadata: ns2Metadata,
        masterEdition: ns2MasterEdition,
      };

    const initNs2Result = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs2,
      initializeNamespaceAccounts2
    );

    console.log("initNs2TxSig: %s", initNs2Result.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: ns1Mint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const [namespace2, _namespace2Bump] = await Utils.PDA.getNamespacePDA(
      ns2Mint
    );

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: ns1Mint,
      artifact: namespace2,
      raindropsProgram: State.Namespace.RaindropsProgram.Namespace,
    };

    const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
    console.log("joinNsTxSig: %s", joinNsResult.txid);

    const cacheArtifactAccounts: Instructions.Namespace.CacheArtifactAccounts =
      {
        namespaceMint: ns1Mint,
        artifact: namespace2,
        raindropsProgram: State.Namespace.RaindropsProgram.Namespace,
      };

    const cacheArtifactResult = await namespaceProgram.cacheArtifact(
      cacheArtifactAccounts
    );
    console.log("cacheArtifactTxSig: %s", cacheArtifactResult.txid);

    const [namespace1, _namespace1Bump] = await Utils.PDA.getNamespacePDA(
      ns1Mint
    );
    let ns1Data = await namespaceProgram.fetchNamespace(namespace1);
    assert(ns1Data.artifactsAdded === 1);
    assert(ns1Data.artifactsCached === 1);

    // check namespace2 which was joined to namespace1 and cached, shows that its cached
    let ns2Data = await namespaceProgram.fetchNamespace(namespace2);
    assert(
      ns2Data.namespaces.some((ns2Index) =>
        ns2Index.namespace.equals(namespace1)
      )
    );

    // check item was index on the namespace side
    let [index, _indexBump] = await Utils.PDA.getIndexPDA(
      namespace1,
      new BN(0)
    );

    let nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(nsIndexData.caches.some((artifact) => artifact.equals(namespace2)));

    const uncacheArtifactAccounts: Instructions.Namespace.UncacheArtifactAccounts =
      {
        namespaceMint: ns1Mint,
        artifact: namespace2,
        raindropsProgram: State.Namespace.RaindropsProgram.Namespace,
      };

    const uncacheArtifactArgs: Instructions.Namespace.UncacheArtifactArgs = {
      page: new anchor.BN(0),
    };

    const uncacheArtifactResult = await namespaceProgram.uncacheArtifact(
      uncacheArtifactArgs,
      uncacheArtifactAccounts
    );
    console.log("uncacheArtifactTxSig: %s", uncacheArtifactResult.txid);

    ns1Data = await namespaceProgram.fetchNamespace(namespace1);
    assert(ns1Data.artifactsAdded === 1);
    assert(ns1Data.artifactsCached === 0);

    // assert artifact is uncached from namespace pov
    nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(!nsIndexData.caches.includes(namespace2));
    assert(nsIndexData.caches.length === 0);

    ns2Data = await namespaceProgram.fetchNamespace(namespace2);
    for (let ns of ns2Data.namespaces) {
      assert(ns.index === null);
    }

    const leaveNsAccounts: Instructions.Namespace.LeaveNamespaceAccounts = {
      namespaceMint: ns1Mint,
      artifact: namespace2,
      raindropsProgram: State.Namespace.RaindropsProgram.Namespace,
    };

    const leaveNsResult = await namespaceProgram.leaveNamespace(
      leaveNsAccounts
    );
    console.log("leaveNsTxSig: %s", leaveNsResult.txid);

    ns1Data = await namespaceProgram.fetchNamespace(namespace1);
    assert(ns1Data.artifactsAdded === 0);
    assert(ns1Data.artifactsCached === 0);
  });

  it("cache 101 items to namespace, tests cache pagination, then uncache them all", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    const itemClasses = await createItemClasses(payer, connection, 101);

    for (let i = 0; i < itemClasses.length; i++) {
      const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
        namespaceMint: nsMint,
        artifact: itemClasses[i],
        raindropsProgram: State.Namespace.RaindropsProgram.Item,
      };

      const joinNsResult = await namespaceProgram.joinNamespace(joinNsAccounts);
      console.log("%d joinNsTxSig: %s", i, joinNsResult.txid);

      const cacheArtifactAccounts: Instructions.Namespace.CacheArtifactAccounts =
        {
          namespaceMint: nsMint,
          artifact: itemClasses[i],
          raindropsProgram: State.Namespace.RaindropsProgram.Item,
        };

      const cacheArtifactResult = await namespaceProgram.cacheArtifact(
        cacheArtifactAccounts
      );
      console.log("%d cacheArtifactTxSig: %s", i, cacheArtifactResult.txid);
    }

    const [namespace, _namespaceBump] = await Utils.PDA.getNamespacePDA(nsMint);
    const nsData = await namespaceProgram.fetchNamespace(namespace);
    assert(nsData.artifactsAdded === 101);
    assert(nsData.artifactsCached === 101);
    assert(nsData.fullPages.length === 1);

    // check last item is cached on second page, from item pov
    const page = await getCachedItemClassPage(
      connection,
      itemClasses[itemClasses.length - 1],
      namespace
    );
    assert(page !== 1);

    // check last item is cached on the second page, from namespace pov
    let [index, _indexBump] = await Utils.PDA.getIndexPDA(
      namespace,
      new BN(page)
    );
    let nsIndexData = await namespaceProgram.fetchNamespaceIndex(index);
    assert(
      nsIndexData.caches.some((artifact) =>
        artifact.equals(itemClasses[itemClasses.length - 1])
      )
    );

    let uncacheArtifactPromises = [];
    for (let i = 0; i < itemClasses.length; i++) {
      const page = await getCachedItemClassPage(
        connection,
        itemClasses[i],
        namespace
      );
      assert(page !== null);

      const uncacheArtifactAccounts: Instructions.Namespace.UncacheArtifactAccounts =
        {
          namespaceMint: nsMint,
          artifact: itemClasses[i],
          raindropsProgram: State.Namespace.RaindropsProgram.Item,
        };

      const uncacheArtifactArgs: Instructions.Namespace.UncacheArtifactArgs = {
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

    const nsDataUpdated = await namespaceProgram.fetchNamespace(namespace);
    assert(nsDataUpdated.artifactsAdded === 101);
    assert(nsDataUpdated.artifactsCached === 0);
    assert(nsDataUpdated.fullPages.length === 0);
  });

  it("join match to namespace without any space allocated for namespaces in the match account", async () => {
    const payer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.NamespaceIDL,
      }
    );

    const [nsMint, nsMetadata, nsMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "namespace",
        connection,
        payer
      );

    const permissivenessSettings: State.Namespace.PermissivenessSettings = {
      namespacePermissiveness: State.Namespace.Permissiveness.All,
      itemPermissiveness: State.Namespace.Permissiveness.All,
      playerPermissiveness: State.Namespace.Permissiveness.All,
      matchPermissiveness: State.Namespace.Permissiveness.All,
      missionPermissiveness: State.Namespace.Permissiveness.All,
      cachePermissiveness: State.Namespace.Permissiveness.All,
    };

    const initializeNamespaceArgs: Instructions.Namespace.InitializeNamespaceArgs =
      {
        desiredNamespaceArraySize: new anchor.BN(2),
        uuid: "123456",
        prettyName: "my-ns",
        permissivenessSettings: permissivenessSettings,
        whitelistedStakingMints: [],
      };

    const initializeNamespaceAccounts: Instructions.Namespace.InitializeNamespaceAccounts =
      {
        mint: nsMint,
        metadata: nsMetadata,
        masterEdition: nsMasterEdition,
      };

    const initNsResult = await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    console.log("initNsTxSig: %s", initNsResult.txid);

    const createNsGKAccounts: Instructions.Namespace.CreateNamespaceGatekeeperAccounts =
      {
        namespaceMint: nsMint,
      };

    const createGkResult = await namespaceProgram.createNamespaceGatekeeper(
      createNsGKAccounts
    );
    console.log("createNsGKTxSig: %s", createGkResult.txid);

    // create match without any space allocated for namespaces
    const match = await createMatch(connection, payer, 0);

    const joinNsAccounts: Instructions.Namespace.JoinNamespaceAccounts = {
      namespaceMint: nsMint,
      artifact: match,
      raindropsProgram: State.Namespace.RaindropsProgram.Matches,
    };

    await assert.rejects(namespaceProgram.joinNamespace(joinNsAccounts));
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

async function createPlayerClass(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
): Promise<[anchor.web3.PublicKey, anchor.web3.PublicKey]> {
  const playerProgram = await PlayerProgram.getProgramWithConfig(
    PlayerProgram,
    {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.PlayerIDL,
    }
  );

  const [playerMint, _playerMetadata, _playerMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts(
      "player",
      connection,
      payer
    );

  const createPlayerClassArgs: Instructions.Player.CreatePlayerClassArgs = {
    classIndex: new anchor.BN(0),
    parentOfParentClassIndex: null,
    parentClassIndex: null,
    space: new anchor.BN(300),
    desiredNamespaceArraySize: 2,
    updatePermissivenessToUse: null,
    storeMint: false,
    storeMetadataFields: false,
    playerClassData: {
      settings: {
        defaultCategory: null,
        childrenMustBeEditions: null,
        builderMustBeHolder: null,
        updatePermissiveness: null,
        instanceUpdatePermissiveness: null,
        buildPermissiveness: null,
        equipItemPermissiveness: null,
        useItemPermissiveness: null,
        unequipItemPermissiveness: null,
        removeItemPermissiveness: null,
        stakingWarmUpDuration: null,
        stakingCooldownDuration: null,
        stakingPermissiveness: null,
        unstakingPermissiveness: null,
        childUpdatePropagationPermissiveness: null,
      },
      config: {
        startingStatsUri: null,
        basicStats: null,
        bodyParts: null,
        equipValidation: null,
        addToPackValidation: null,
      },
    },
  };

  const createPlayerClassAccounts: Instructions.Player.CreatePlayerClassAccounts =
    {
      playerMint: playerMint,
      parent: null,
      parentMint: null,
      parentOfParentClassMint: null,
      metadataUpdateAuthority: null,
      parentUpdateAuthority: null,
    };

  const createPlayerClassResult = await (
    await playerProgram.createPlayerClass(
      createPlayerClassArgs,
      createPlayerClassAccounts
    )
  ).rpc();
  console.log("createPlayerClassTxSig: %s", createPlayerClassResult.txid);

  const [player, _playerBump] = await Utils.PDA.getPlayerPDA(
    playerMint,
    new anchor.BN(0)
  );

  return [player, playerMint];
}

async function createPlayer(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  playerClassMint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> {
  const playerProgram = await PlayerProgram.getProgramWithConfig(
    PlayerProgram,
    {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.PlayerIDL,
    }
  );

  const [playerMint, _playerMetadata, _playerMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts(
      "player",
      connection,
      payer
    );

  const playerAta = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    playerMint,
    payer.publicKey
  );

  const buildPlayerArgs: Instructions.Player.BuildPlayerArgs = {
    classIndex: new anchor.BN(0),
    parentClassIndex: null,
    newPlayerIndex: new anchor.BN(0),
    space: new anchor.BN(300),
    playerClassMint: playerClassMint,
    buildPermissivenessToUse: { tokenHolder: true },
    storeMint: false,
    storeMetadataFields: false,
  };

  const buildPlayerAccounts: Instructions.Player.BuildPlayerAccounts = {
    newPlayerMint: playerMint,
    newPlayerToken: playerAta.address,
    newPlayerTokenHolder: payer.publicKey,
    parentMint: playerClassMint,
    metadataUpdateAuthority: payer.publicKey,
  };

  const buildPlayerAdditionalArgs: Instructions.Player.BuildPlayerAdditionalArgs =
    {
      rainAmount: new anchor.BN(Constants.Player.RAIN_PAYMENT_AMOUNT),
    };

  const createPlayerResult = await (
    await playerProgram.buildPlayer(
      buildPlayerArgs,
      buildPlayerAccounts,
      buildPlayerAdditionalArgs
    )
  ).rpc();
  console.log("createPlayerTxSig: %s", createPlayerResult.txid);

  const [player, _playerBump] = await Utils.PDA.getPlayerPDA(
    playerMint,
    new anchor.BN(0)
  );

  return player;
}

async function createItemClasses(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  count: number
): Promise<anchor.web3.PublicKey[]> {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed" }
  );

  const itemProgram: anchor.Program<Idls.Item> = await new anchor.Program(
    Idls.ItemIDL,
    Constants.ProgramIds.ITEM_ID,
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

async function createItemEscrow(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
): Promise<anchor.web3.PublicKey> {
  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  // create item mints and metaplex accounts
  const [itemClassMint, _itemClassMetadata, _itemClassMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts("item", connection, payer);

  // create item mints and metaplex accounts
  const [craftItemMint, _craftItemMetadata, _craftItemMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts(
      "craftItem",
      connection,
      payer
    );

  const itemClassArgs: Instructions.Item.CreateItemClassArgs = {
    classIndex: new anchor.BN(0),
    parentOfParentClassIndex: null,
    parentClassIndex: null,
    space: new anchor.BN(300),
    desiredNamespaceArraySize: 2,
    updatePermissivenessToUse: null,
    storeMint: false,
    storeMetadataFields: false,
    itemClassData: {
      settings: {
        freeBuild: null,
        childrenMustBeEditions: null,
        builderMustBeHolder: null,
        updatePermissiveness: [
          {
            permissivenessType: { tokenHolder: true },
            inherited: { notInherited: true },
          },
        ],
        buildPermissiveness: [
          {
            permissivenessType: { tokenHolder: true },
            inherited: { notInherited: true },
          },
        ],
        stakingWarmUpDuration: null,
        stakingCooldownDuration: null,
        stakingPermissiveness: null,
        unstakingPermissiveness: null,
        childUpdatePropagationPermissiveness: [
          {
            childUpdatePropagationPermissivenessType: { usages: true },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: { components: true },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              updatePermissiveness: true,
            },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              buildPermissiveness: true,
            },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              stakingPermissiveness: true,
            },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              freeBuildPermissiveness: true,
            },
            inherited: { notInherited: true },
          },
        ],
      },
      config: {
        usageRoot: null,
        usageStateRoot: null,
        componentRoot: null,
        usages: null,
        components: [
          {
            mint: craftItemMint,
            amount: new anchor.BN(1),
            classIndex: new anchor.BN(0),
            timeToBuild: null,
            componentScope: "test",
            useUsageIndex: 0,
            condition: { presence: true },
            inherited: { notInherited: true },
          },
        ],
      },
    },
  };

  const createItemClassAccounts: Instructions.Item.CreateItemClassAccounts = {
    itemMint: itemClassMint,
    parent: null,
    parentMint: null,
    parentOfParentClassMint: null,
    metadataUpdateAuthority: payer.publicKey,
    parentUpdateAuthority: null,
  };

  const createItemClassAdditionalArgs: Instructions.Item.CreateItemClassAdditionalArgs =
    {};

  const createItemClassResult = await itemProgram.createItemClass(
    itemClassArgs,
    createItemClassAccounts,
    createItemClassAdditionalArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  const createItemEscrowArgs: Instructions.Item.CreateItemEscrowArgs = {
    classIndex: new anchor.BN(0),
    craftEscrowIndex: new anchor.BN(0),
    parentClassIndex: null,
    componentScope: "test",
    amountToMake: new anchor.BN(1),
    namespaceIndex: new anchor.BN(0),
    buildPermissivenessToUse: { tokenHolder: true },
    itemClassMint: itemClassMint,
  };

  const createItemEscrowAdditionalArgs: Instructions.Item.CreateItemEscrowAdditionalArgs =
    {};

  const createItemEscrowAccounts: Instructions.Item.CreateItemEscrowAccounts = {
    newItemMint: craftItemMint,
    newItemToken: null,
    newItemTokenHolder: payer.publicKey,
    parentMint: null,
    itemClassMint: itemClassMint,
    metadataUpdateAuthority: payer.publicKey,
  };

  const result = await itemProgram.createItemEscrow(
    createItemEscrowArgs,
    createItemEscrowAccounts,
    createItemEscrowAdditionalArgs
  );
  console.log("createItemEscrowTxSig: %s", result.txid);

  const [itemEscrow, _itemEscrowBump] = await Utils.PDA.getItemEscrow({
    itemClassMint: itemClassMint,
    payer: payer.publicKey,
    newItemMint: craftItemMint,
    newItemToken: await splToken.getAssociatedTokenAddress(
      craftItemMint,
      payer.publicKey
    ),
    amountToMake: new anchor.BN(1),
    componentScope: "test",
    craftEscrowIndex: new anchor.BN(0),
    classIndex: new anchor.BN(0),
  });

  return itemEscrow;
}

async function createItemEscrowAndCompleteBuild(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
): Promise<anchor.web3.PublicKey> {
  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  // create item mints and metaplex accounts
  const [itemClassMint, _itemClassMetadata, _itemClassMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts("item", connection, payer);

  // create item mints and metaplex accounts
  const [craftItemMint, _craftItemMetadata, _craftItemMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts(
      "craftItem",
      connection,
      payer
    );

  const itemClassArgs: Instructions.Item.CreateItemClassArgs = {
    classIndex: new anchor.BN(0),
    parentOfParentClassIndex: null,
    parentClassIndex: null,
    space: new anchor.BN(300),
    desiredNamespaceArraySize: 2,
    updatePermissivenessToUse: null,
    storeMint: false,
    storeMetadataFields: false,
    itemClassData: {
      settings: {
        freeBuild: null,
        childrenMustBeEditions: null,
        builderMustBeHolder: null,
        updatePermissiveness: [
          {
            permissivenessType: { tokenHolder: true },
            inherited: { notInherited: true },
          },
        ],
        buildPermissiveness: [
          {
            permissivenessType: { tokenHolder: true },
            inherited: { notInherited: true },
          },
        ],
        stakingWarmUpDuration: null,
        stakingCooldownDuration: null,
        stakingPermissiveness: null,
        unstakingPermissiveness: null,
        childUpdatePropagationPermissiveness: [
          {
            childUpdatePropagationPermissivenessType: { usages: true },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: { components: true },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              updatePermissiveness: true,
            },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              buildPermissiveness: true,
            },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              stakingPermissiveness: true,
            },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              freeBuildPermissiveness: true,
            },
            inherited: { notInherited: true },
          },
        ],
      },
      config: {
        usageRoot: null,
        usageStateRoot: null,
        componentRoot: null,
        usages: null,
        components: [
          {
            mint: craftItemMint,
            amount: new anchor.BN(1),
            classIndex: new anchor.BN(0),
            timeToBuild: null,
            componentScope: "none",
            useUsageIndex: 0,
            condition: { presence: true },
            inherited: { notInherited: true },
          },
        ],
      },
    },
  };

  const createItemClassAccounts: Instructions.Item.CreateItemClassAccounts = {
    itemMint: itemClassMint,
    parent: null,
    parentMint: null,
    parentOfParentClassMint: null,
    metadataUpdateAuthority: payer.publicKey,
    parentUpdateAuthority: null,
  };

  const createItemClassAdditionalArgs: Instructions.Item.CreateItemClassAdditionalArgs =
    {};

  const createItemClassResult = await itemProgram.createItemClass(
    itemClassArgs,
    createItemClassAccounts,
    createItemClassAdditionalArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  const createItemEscrowArgs: Instructions.Item.CreateItemEscrowArgs = {
    classIndex: new anchor.BN(0),
    craftEscrowIndex: new anchor.BN(0),
    parentClassIndex: null,
    componentScope: "test",
    amountToMake: new anchor.BN(1),
    namespaceIndex: new anchor.BN(0),
    buildPermissivenessToUse: { tokenHolder: true },
    itemClassMint: itemClassMint,
  };

  const createItemEscrowAdditionalArgs: Instructions.Item.CreateItemEscrowAdditionalArgs =
    {};

  const createItemEscrowAccounts: Instructions.Item.CreateItemEscrowAccounts = {
    newItemMint: craftItemMint,
    newItemToken: null,
    newItemTokenHolder: payer.publicKey,
    parentMint: null,
    itemClassMint: itemClassMint,
    metadataUpdateAuthority: payer.publicKey,
  };

  const result = await itemProgram.createItemEscrow(
    createItemEscrowArgs,
    createItemEscrowAccounts,
    createItemEscrowAdditionalArgs
  );
  console.log("createItemEscrowTxSig: %s", result.txid);

  const startItemEscrowBuildPhaseArgs: Instructions.Item.StartItemEscrowBuildPhaseArgs =
    {
      classIndex: new anchor.BN(0),
      parentClassIndex: null,
      craftEscrowIndex: new anchor.BN(0),
      componentScope: "test",
      amountToMake: new anchor.BN(1),
      itemClassMint: itemClassMint,
      originator: payer.publicKey,
      newItemMint: craftItemMint,
      buildPermissivenessToUse: { tokenHolder: true },
      endNodeProof: null,
      totalSteps: null,
    };
  const startItemEscrowBuildPhaseAccounts: Instructions.Item.StartItemEscrowBuildPhaseAccounts =
    {
      itemClassMint: itemClassMint,
      newItemToken: null,
      newItemTokenHolder: payer.publicKey,
      parentMint: null,
      metadataUpdateAuthority: payer.publicKey,
    };
  const startItemEscrowBuildPhaseAdditionalArgs: Instructions.Item.StartItemEscrowBuildPhaseAdditionalArgs =
    {};

  const startItemEscrowBuildPhaseResult =
    await itemProgram.startItemEscrowBuildPhase(
      startItemEscrowBuildPhaseArgs,
      startItemEscrowBuildPhaseAccounts,
      startItemEscrowBuildPhaseAdditionalArgs
    );

  console.log(
    "startItemEscrowBuildPhaseResult: %s",
    startItemEscrowBuildPhaseResult.txid
  );
  const completeItemEscrowBuildPhaseArgs: Instructions.Item.CompleteItemEscrowBuildPhaseArgs =
    {
      newItemIndex: new anchor.BN(0),
      space: new anchor.BN(300),
      storeMint: false,
      storeMetadataFields: false,
      classIndex: new anchor.BN(0),
      parentClassIndex: null,
      craftEscrowIndex: new anchor.BN(0),
      componentScope: "test",
      amountToMake: new anchor.BN(1),
      itemClassMint: itemClassMint,
      originator: payer.publicKey,
      buildPermissivenessToUse: { tokenHolder: true },
    };

  const completeItemEscrowBuildPhaseAccounts: Instructions.Item.CompleteItemEscrowBuildPhaseAccounts =
    {
      itemClassMint: itemClassMint,
      newItemMint: craftItemMint,
      newItemToken: null,
      newItemTokenHolder: null,
      parentMint: null,
      metadataUpdateAuthority: payer.publicKey,
    };

  const completeItemEscrowBuildPhaseAdditionalArgs: Instructions.Item.StartItemEscrowBuildPhaseAdditionalArgs =
    {};

  const completeItemEscrowBuildPhaseResult =
    await itemProgram.completeItemEscrowBuildPhase(
      completeItemEscrowBuildPhaseArgs,
      completeItemEscrowBuildPhaseAccounts,
      completeItemEscrowBuildPhaseAdditionalArgs
    );
  console.log(
    "completeItemEscrowBuildPhaseResult: %s",
    completeItemEscrowBuildPhaseResult.txid
  );

  const [item, _itemBump] = await Utils.PDA.getItemPDA(
    craftItemMint,
    new anchor.BN(0)
  );

  return item;
}

async function createMatch(
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair,
  desiredNamespaceArraySize: number
): Promise<anchor.web3.PublicKey> {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed" }
  );

  const matchesProgram: anchor.Program<Idls.Matches> = await new anchor.Program(
    Idls.MatchesIDL,
    Constants.ProgramIds.MATCHES_ID,
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

  const [oracle, _oracleBump] = await Utils.PDA.getOracle(
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
    space: new anchor.BN(2000),
    leaveAllowed: false,
    joinAllowedDuringStart: false,
    minimumAllowedEntryTime: new anchor.BN(1000),
    desiredNamespaceArraySize: new anchor.BN(desiredNamespaceArraySize),
  };

  const [match, _matchBump] = await Utils.PDA.getMatch(oracle);

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
  connection: anchor.web3.Connection,
  itemClass: anchor.web3.PublicKey,
  namespace: anchor.web3.PublicKey
): Promise<number | null> {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(anchor.web3.Keypair.generate()),
    { commitment: "confirmed" }
  );

  const itemProgram: anchor.Program<Idls.Item> = await new anchor.Program(
    Idls.ItemIDL,
    Constants.ProgramIds.ITEM_ID,
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
  connection: anchor.web3.Connection,
  match: anchor.web3.PublicKey,
  namespace: anchor.web3.PublicKey
): Promise<number | null> {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(anchor.web3.Keypair.generate()),
    { commitment: "confirmed" }
  );

  const matchesProgram: anchor.Program<Idls.Matches> = await new anchor.Program(
    Idls.MatchesIDL,
    Constants.ProgramIds.MATCHES_ID,
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

async function createPaymentAccounts(
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair
): Promise<[anchor.web3.PublicKey, anchor.web3.PublicKey]> {
  const paymentMint = await splToken.createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    9
  );
  const paymentVault = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    paymentMint,
    payer.publicKey
  );

  await splToken.mintTo(
    connection,
    payer,
    paymentMint,
    paymentVault.address,
    payer,
    100_000_000_000
  );

  return [paymentMint, paymentVault.address];
}

async function newPayer(
  connection: anchor.web3.Connection,
  rainTokenMint?: anchor.web3.PublicKey,
  rainTokenMintAuthority?: anchor.web3.Keypair
): Promise<anchor.web3.Keypair> {
  const payer = anchor.web3.Keypair.generate();

  const txSig = await connection.requestAirdrop(
    payer.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(txSig);

  if (rainTokenMint && rainTokenMintAuthority) {
    const payerRainTokenAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      rainTokenMint,
      payer.publicKey
    );
    await splToken.mintTo(
      connection,
      payer,
      rainTokenMint,
      payerRainTokenAta.address,
      rainTokenMintAuthority,
      100_000_000_000
    );
  }

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
