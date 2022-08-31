import * as anchor from "@project-serum/anchor";
import {
  Constants,
  ItemProgram,
  Idls,
  NamespaceProgram,
  StakingProgram,
  Instructions,
  Utils,
  State,
} from "@raindrops-protocol/raindrops";
import { mintNFT, mintTokens } from "../test-helpers/token";

describe("Item-Namespace-Staking Flow", () => {
  // Creates an anchor provider

  // const RPC_URL = "http://localhost:8899";
  const RPC_URL = "https://api.devnet.solana.com";
  const walletKeypair = anchor.web3.Keypair.generate();

  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection(RPC_URL),
    new anchor.Wallet(walletKeypair),
    { commitment: "confirmed" }
  );

  // Sets required params

  let itemProgram: ItemProgram;
  let namespaceProgram: NamespaceProgram;
  let stakingProgram: StakingProgram;

  const componentScope = "none";
  const itemClassMintKeypair = anchor.web3.Keypair.generate();
  const itemClassIndex = 0;
  const craftItemMintKeypair = anchor.web3.Keypair.generate();
  const craftItemEscrowIndex = 0;
  const itemMintKeypair = anchor.web3.Keypair.generate();
  const itemIndex = 0;
  const namespaceMintKeypair = anchor.web3.Keypair.generate();
  const stakingMintKeypair = anchor.web3.Keypair.generate();
  const stakingAmount = 100;
  const stakingIndex = 0;
  const stakingTransferAuthority = anchor.web3.Keypair.generate();

  it("Airdrops sol to wallet", async () => {
    const amount = 2;

    const sig = await provider.connection.requestAirdrop(
      walletKeypair.publicKey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );

    await provider.connection.confirmTransaction(sig, "confirmed");

    const lamports = await provider.connection.getBalance(
      walletKeypair.publicKey,
      { commitment: "confirmed" }
    );

    expect(lamports).toBe(amount * anchor.web3.LAMPORTS_PER_SOL);
  });

  it("Gets programs", async () => {
    itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
      asyncSigning: false,
      provider,
      idl: Idls.ItemIDL,
    });

    expect(itemProgram.id).toBe(Constants.ProgramIds.ITEM_ID);

    namespaceProgram = await NamespaceProgram.getProgramWithConfig(
      NamespaceProgram,
      {
        asyncSigning: false,
        provider,
        idl: Idls.NamespaceIDL,
      }
    );

    expect(namespaceProgram.id).toBe(Constants.ProgramIds.NAMESPACE_ID);

    stakingProgram = await StakingProgram.getProgramWithConfig(StakingProgram, {
      asyncSigning: false,
      provider,
      idl: Idls.StakingIDL,
    });

    expect(stakingProgram.id).toBe(Constants.ProgramIds.STAKING_ID);
  });

  it("Mints item class NFT", async () => {
    await mintNFT(provider, itemClassMintKeypair);

    const tokenAccounts =
      await provider.connection.getParsedTokenAccountsByOwner(
        walletKeypair.publicKey,
        {
          mint: itemClassMintKeypair.publicKey,
        },
        "confirmed"
      );

    expect(tokenAccounts.value.length).toBe(1);
  });

  it("Creates an item class", async () => {
    const itemClassData = {
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
            mint: craftItemMintKeypair.publicKey,
            amount: new anchor.BN(1),
            classIndex: new anchor.BN(itemClassIndex),
            timeToBuild: null,
            componentScope: "SCOPE_1",
            useUsageIndex: 0,
            condition: { presence: true },
            inherited: { notInherited: true },
          },
        ],
      },
    };

    const args = {
      classIndex: new anchor.BN(itemClassIndex),
      parentClassIndex: null,
      space: new anchor.BN(300),
      desiredNamespaceArraySize: 1,
      updatePermissivenessToUse: { tokenHolder: true },
      storeMint: false,
      storeMetadataFields: false,
      itemClassData,
      parentOfParentClassIndex: null,
    } as Instructions.Item.CreateItemClassArgs;

    const accounts = {
      itemMint: itemClassMintKeypair.publicKey,
      parent: null,
      parentMint: null,
      parentOfParentClassMint: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
      parentUpdateAuthority: null,
    } as Instructions.Item.CreateItemClassAccounts;

    const additionalArgs =
      {} as Instructions.Item.CreateItemClassAdditionalArgs;

    await itemProgram.createItemClass(args, accounts, additionalArgs);

    const [itemClassPDA] = await Utils.PDA.getItemPDA(
      itemClassMintKeypair.publicKey,
      new anchor.BN(itemClassIndex)
    );

    const accInfo = await itemProgram.client.account.itemClass.fetch(
      itemClassPDA,
      "confirmed"
    );

    expect(accInfo).toBeDefined();
  });

  it("Mints craft item NFT", async () => {
    await mintNFT(provider, craftItemMintKeypair);

    const tokenAccounts =
      await provider.connection.getParsedTokenAccountsByOwner(
        walletKeypair.publicKey,
        {
          mint: craftItemMintKeypair.publicKey,
        },
        "confirmed"
      );

    expect(tokenAccounts.value.length).toBe(1);
  });

  it("Mints item NFT", async () => {
    await mintNFT(provider, itemMintKeypair);

    const tokenAccounts =
      await provider.connection.getParsedTokenAccountsByOwner(
        walletKeypair.publicKey,
        {
          mint: itemMintKeypair.publicKey,
        },
        "confirmed"
      );

    expect(tokenAccounts.value.length).toBe(1);
  });

  it("Creates an item escrow", async () => {
    const args = {
      classIndex: new anchor.BN(itemClassIndex),
      craftEscrowIndex: new anchor.BN(craftItemEscrowIndex),
      componentScope,
      buildPermissivenessToUse: { tokenHolder: true },
      namespaceIndex: null,
      itemClassMint: itemClassMintKeypair.publicKey,
      amountToMake: new anchor.BN(1),
      parentClassIndex: null,
    } as Instructions.Item.CreateItemEscrowArgs;

    const accounts = {
      newItemMint: itemMintKeypair.publicKey,
      newItemToken: null, // item ATA
      newItemTokenHolder: walletKeypair.publicKey, // wallet
      parentMint: null,
      itemClassMint: itemClassMintKeypair.publicKey,
      metadataUpdateAuthority: walletKeypair.publicKey,
    } as Instructions.Item.CreateItemEscrowAccounts;

    const additionalArgs = {};

    await itemProgram.createItemEscrow(args, accounts, additionalArgs);

    const [itemEscrowPDA] = await Utils.PDA.getItemEscrow({
      itemClassMint: itemClassMintKeypair.publicKey,
      payer: walletKeypair.publicKey,
      newItemMint: itemMintKeypair.publicKey,
      newItemToken: (
        await Utils.PDA.getAtaForMint(
          itemMintKeypair.publicKey,
          walletKeypair.publicKey
        )
      )[0],
      amountToMake: new anchor.BN(1),
      componentScope,
      craftEscrowIndex: new anchor.BN(craftItemEscrowIndex),
      classIndex: new anchor.BN(itemClassIndex),
    });

    const accInfo = await itemProgram.client.account.itemEscrow.fetch(
      itemEscrowPDA,
      "confirmed"
    );

    expect(accInfo).toBeDefined();

    expect(accInfo.buildBegan).toBeNull();
  });

  it("Starts item escrow build phase", async () => {
    const args = {
      classIndex: new anchor.BN(itemClassIndex),
      parentClassIndex: null,
      craftEscrowIndex: new anchor.BN(craftItemEscrowIndex),
      componentScope: "none",
      amountToMake: new anchor.BN(1),
      itemClassMint: itemClassMintKeypair.publicKey,
      originator: walletKeypair.publicKey,
      newItemMint: itemMintKeypair.publicKey,
      buildPermissivenessToUse: { tokenHolder: true },
      endNodeProof: null,
      totalSteps: null,
    } as Instructions.Item.StartItemEscrowBuildPhaseArgs;

    const accounts = {
      itemClassMint: itemClassMintKeypair.publicKey,
      newItemToken: null,
      newItemTokenHolder: walletKeypair.publicKey,
      parentMint: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
    } as Instructions.Item.StartItemEscrowBuildPhaseAccounts;

    const additionalArgs =
      {} as Instructions.Item.StartItemEscrowBuildPhaseAdditionalArgs;

    await itemProgram.startItemEscrowBuildPhase(args, accounts, additionalArgs);

    const [itemEscrowPDA] = await Utils.PDA.getItemEscrow({
      itemClassMint: itemClassMintKeypair.publicKey,
      payer: walletKeypair.publicKey,
      newItemMint: itemMintKeypair.publicKey,
      newItemToken: (
        await Utils.PDA.getAtaForMint(
          itemMintKeypair.publicKey,
          walletKeypair.publicKey
        )
      )[0],
      amountToMake: new anchor.BN(1),
      componentScope,
      craftEscrowIndex: new anchor.BN(craftItemEscrowIndex),
      classIndex: new anchor.BN(itemClassIndex),
    });

    const accInfo = await itemProgram.client.account.itemEscrow.fetch(
      itemEscrowPDA,
      "confirmed"
    );

    expect(accInfo).toBeDefined();

    expect(accInfo.buildBegan).toBeDefined();
  });

  it("Completes item escrow build phase", async () => {
    const args = {
      classIndex: new anchor.BN(itemClassIndex),
      newItemIndex: new anchor.BN(itemIndex),
      parentClassIndex: null,
      craftEscrowIndex: new anchor.BN(craftItemEscrowIndex),
      componentScope: "none",
      amountToMake: new anchor.BN(1),
      space: new anchor.BN(300),
      itemClassMint: itemClassMintKeypair.publicKey,
      originator: walletKeypair.publicKey,
      buildPermissivenessToUse: { tokenHolder: true },
      storeMint: false,
      storeMetadataFields: false,
    } as Instructions.Item.CompleteItemEscrowBuildPhaseArgs;

    const accounts = {
      itemClassMint: itemClassMintKeypair.publicKey,
      newItemMint: itemMintKeypair.publicKey,
      newItemToken: null,
      newItemTokenHolder: walletKeypair.publicKey,
      parentMint: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
    } as Instructions.Item.CompleteItemEscrowBuildPhaseAccounts;

    const additionalArgs =
      {} as Instructions.Item.CompleteItemEscrowBuildPhaseAdditionalArgs;

    await itemProgram.completeItemEscrowBuildPhase(
      args,
      accounts,
      additionalArgs
    );

    const [itemPDA] = await Utils.PDA.getItemPDA(
      itemMintKeypair.publicKey,
      new anchor.BN(itemIndex)
    );

    const accInfo = await itemProgram.client.account.item.fetch(
      itemPDA,
      "confirmed"
    );

    expect(accInfo).toBeDefined();

    expect((accInfo.classIndex as anchor.BN).toNumber()).toBe(itemClassIndex);
  });

  it("Mints namespace NFT", async () => {
    await mintNFT(provider, namespaceMintKeypair);

    const tokenAccounts =
      await provider.connection.getParsedTokenAccountsByOwner(
        walletKeypair.publicKey,
        {
          mint: namespaceMintKeypair.publicKey,
        },
        "confirmed"
      );

    expect(tokenAccounts.value.length).toBe(1);
  });

  it("Mints staking tokens", async () => {
    await mintTokens(provider, stakingMintKeypair, stakingAmount, 0);

    const tokenAccounts =
      await provider.connection.getParsedTokenAccountsByOwner(
        walletKeypair.publicKey,
        {
          mint: stakingMintKeypair.publicKey,
        },
        "confirmed"
      );

    expect(tokenAccounts.value.length).toBe(1);

    expect(
      tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount
    ).toBe(stakingAmount);
  });

  it("Initializes a namespace", async () => {
    const namespaceMintMetadataPDA = await Utils.PDA.getMetadata(
      namespaceMintKeypair.publicKey
    );

    const namespaceMintMasterEditionPDA = await Utils.PDA.getEdition(
      namespaceMintKeypair.publicKey
    );

    const args = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: "e3e52d",
      prettyName: "Trash with Frens",
      permissivenessSettings: {
        namespacePermissiveness: State.Namespace.Permissiveness.All,
        itemPermissiveness: State.Namespace.Permissiveness.All,
        playerPermissiveness: State.Namespace.Permissiveness.All,
        matchPermissiveness: State.Namespace.Permissiveness.All,
        missionPermissiveness: State.Namespace.Permissiveness.Namespace,
        cachePermissiveness: State.Namespace.Permissiveness.All,
      },
      whitelistedStakingMints: [stakingMintKeypair.publicKey],
    } as Instructions.Namespace.InitializeNamespaceArgs;

    const accounts = {
      mint: namespaceMintKeypair.publicKey,
      metadata: namespaceMintMetadataPDA,
      masterEdition: namespaceMintMasterEditionPDA,
    } as Instructions.Namespace.InitializeNamespaceAccounts;

    await namespaceProgram.initializeNamespace(args, accounts);

    const [namespacePDA] = await Utils.PDA.getNamespacePDA(
      namespaceMintKeypair.publicKey
    );

    const accInfo = await namespaceProgram.client.account.namespace.fetch(
      namespacePDA,
      "confirmed"
    );

    expect(accInfo).toBeDefined();

    expect((accInfo.mint as anchor.web3.PublicKey).toBase58()).toBe(
      namespaceMintKeypair.publicKey.toBase58()
    );
  });

  it("Creates namespace gatekeeper", async () => {
    const accounts = {
      namespaceMint: namespaceMintKeypair.publicKey,
    } as Instructions.Namespace.CreateNamespaceGatekeeperAccounts;

    await namespaceProgram.createNamespaceGatekeeper(accounts);

    const [namespacePDA] = await Utils.PDA.getNamespacePDA(
      namespaceMintKeypair.publicKey
    );

    const [namespaceGatekeeperPDA] = await Utils.PDA.getNamespaceGatekeeperPDA(
      namespacePDA
    );

    const accInfo =
      await namespaceProgram.client.account.namespaceGatekeeper.fetch(
        namespaceGatekeeperPDA,
        "confirmed"
      );

    expect(accInfo).toBeDefined();
  });

  it("Joins to namespace", async () => {
    const [itemPDA] = await Utils.PDA.getItemPDA(
      itemMintKeypair.publicKey,
      new anchor.BN(itemIndex)
    );

    const accounts = {
      namespaceMint: namespaceMintKeypair.publicKey,
      artifact: itemPDA,
      raindropsProgram: State.Namespace.RaindropsProgram.Item,
    } as Instructions.Namespace.JoinNamespaceAccounts;

    await namespaceProgram.joinNamespace(accounts);

    const [namespacePDA] = await Utils.PDA.getNamespacePDA(
      namespaceMintKeypair.publicKey
    );

    const accInfo = await namespaceProgram.client.account.namespace.fetch(
      namespacePDA,
      "confirmed"
    );

    expect((accInfo.artifactsAdded as anchor.BN).toNumber()).toBe(1);
  });

  it("Begins artifact stake warmup", async () => {
    const [namespacePDA] = await Utils.PDA.getNamespacePDA(
      namespaceMintKeypair.publicKey
    );

    const stakingMintAta = await anchor.utils.token.associatedAddress({
      mint: stakingMintKeypair.publicKey,
      owner: walletKeypair.publicKey,
    });

    const [artifactClassPDA] = await Utils.PDA.getItemPDA(
      itemClassMintKeypair.publicKey,
      new anchor.BN(itemClassIndex)
    );

    const [artifactPDA] = await Utils.PDA.getItemPDA(
      itemMintKeypair.publicKey,
      new anchor.BN(itemIndex)
    );

    const args = {
      classIndex: new anchor.BN(itemClassIndex),
      parentClassIndex: null,
      index: new anchor.BN(itemIndex),
      stakingIndex: new anchor.BN(stakingIndex),
      artifactClassMint: itemClassMintKeypair.publicKey,
      artifactMint: itemMintKeypair.publicKey,
      stakingAmount: new anchor.BN(stakingAmount),
      stakingPermissivenessToUse: { tokenHolder: true },
    } as Instructions.Staking.BeginArtifactStakeWarmupArgs;

    const accounts = {
      artifactClass: artifactClassPDA,
      artifact: artifactPDA,
      stakingAccount: stakingMintAta,
      stakingMint: stakingMintKeypair.publicKey,
      stakingTransferAuthority,
      parentClassMint: null,
      parentClass: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
      namespace: namespacePDA,
    } as Instructions.Staking.BeginArtifactStakeWarmupAccounts;

    await stakingProgram.beginArtifactStakeWarmup(args, accounts);

    const accInfo = await itemProgram.client.account.item.fetch(artifactPDA);

    expect((accInfo.tokensStaked as anchor.BN).toNumber()).toBe(0);
  });

  it("Ends artifact stake warmup", async () => {
    const [artifactClassPDA] = await Utils.PDA.getItemPDA(
      itemClassMintKeypair.publicKey,
      new anchor.BN(itemClassIndex)
    );

    const [artifactPDA] = await Utils.PDA.getItemPDA(
      itemMintKeypair.publicKey,
      new anchor.BN(itemIndex)
    );

    const args = {
      classIndex: new anchor.BN(itemClassIndex),
      index: new anchor.BN(itemIndex),
      stakingIndex: new anchor.BN(stakingIndex),
      artifactClassMint: itemClassMintKeypair.publicKey,
      artifactMint: itemMintKeypair.publicKey,
    } as Instructions.Staking.EndArtifactStakeWarmupArgs;

    const accounts = {
      artifactClass: artifactClassPDA,
      artifact: artifactPDA,
      stakingMint: stakingMintKeypair.publicKey,
    } as Instructions.Staking.EndArtifactStakeWarmupAccounts;

    await stakingProgram.endArtifactStakeWarmup(args, accounts);

    const accInfo = await itemProgram.client.account.item.fetch(artifactPDA);

    expect((accInfo.tokensStaked as anchor.BN).toNumber()).toBe(stakingAmount);
  });

  it("Begins artifact stake cooldown", async () => {
    const stakingMintAta = await anchor.utils.token.associatedAddress({
      mint: stakingMintKeypair.publicKey,
      owner: walletKeypair.publicKey,
    });

    const [artifactClassPDA] = await Utils.PDA.getItemPDA(
      itemClassMintKeypair.publicKey,
      new anchor.BN(itemClassIndex)
    );

    const [artifactPDA] = await Utils.PDA.getItemPDA(
      itemMintKeypair.publicKey,
      new anchor.BN(itemIndex)
    );

    const args = {
      classIndex: new anchor.BN(itemClassIndex),
      parentClassIndex: null,
      index: new anchor.BN(itemIndex),
      stakingIndex: new anchor.BN(stakingIndex),
      artifactClassMint: itemClassMintKeypair.publicKey,
      artifactMint: itemMintKeypair.publicKey,
      stakingPermissivenessToUse: { tokenHolder: true },
    } as Instructions.Staking.BeginArtifactStakeCooldownArgs;

    const accounts = {
      artifactClass: artifactClassPDA,
      artifact: artifactPDA,
      stakingAccount: stakingMintAta,
      parentClassAccount: null,
      parentClassMint: null,
      parentClass: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
    } as Instructions.Staking.BeginArtifactStakeCooldownAccounts;

    await stakingProgram.beginArtifactStakeCooldown(args, accounts);

    const accInfo = await itemProgram.client.account.item.fetch(artifactPDA);

    expect((accInfo.tokensStaked as anchor.BN).toNumber()).toBe(0);
  });

  it("Ends artifact stake cooldown", async () => {
    const stakingMintAta = await anchor.utils.token.associatedAddress({
      mint: stakingMintKeypair.publicKey,
      owner: walletKeypair.publicKey,
    });

    const [artifactClassPDA] = await Utils.PDA.getItemPDA(
      itemClassMintKeypair.publicKey,
      new anchor.BN(itemClassIndex)
    );

    const [artifactPDA] = await Utils.PDA.getItemPDA(
      itemMintKeypair.publicKey,
      new anchor.BN(itemIndex)
    );

    const args = {
      classIndex: new anchor.BN(itemClassIndex),
      index: new anchor.BN(itemIndex),
      stakingIndex: new anchor.BN(stakingIndex),
      artifactClassMint: itemClassMintKeypair.publicKey,
      artifactMint: itemMintKeypair.publicKey,
    } as Instructions.Staking.EndArtifactStakeCooldownArgs;

    const accounts = {
      artifactClass: artifactClassPDA,
      artifact: artifactPDA,
      stakingAccount: stakingMintAta,
      stakingMint: stakingMintKeypair.publicKey,
    } as Instructions.Staking.EndArtifactStakeCooldownAccounts;

    await stakingProgram.endArtifactStakeCooldown(args, accounts);

    const accInfo = await itemProgram.client.account.item.fetch(artifactPDA);

    expect((accInfo.tokensStaked as anchor.BN).toNumber()).toBe(0);
  });
});
