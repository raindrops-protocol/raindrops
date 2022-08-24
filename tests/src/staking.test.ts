import * as anchor from "@project-serum/anchor";
import { Transaction } from "@raindrop-studios/sol-kit";
import {
  ItemProgram,
  StakingProgram,
  Instructions,
  Utils,
} from "@raindrops-protocol/raindrops";
import { IDL as ItemProgramIDL } from "./types/item";
import { IDL as StakingProgramIDL } from "./types/staking";
import {
  createMintNFTInstructions,
  createMintTokensInstructions,
} from "./utils/token";

describe("Staking Program", () => {
  it.concurrent("Item Staking", async () => {
    const walletKeypair = anchor.web3.Keypair.generate();

    const provider = new anchor.AnchorProvider(
      new anchor.web3.Connection("http://localhost:8899"),
      new anchor.Wallet(walletKeypair),
      { commitment: "confirmed" }
    );

    await provider.connection.requestAirdrop(
      walletKeypair.publicKey,
      100 * anchor.web3.LAMPORTS_PER_SOL
    );

    const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
      asyncSigning: false,
      provider,
      idl: ItemProgramIDL,
    });

    const stakingProgram = await StakingProgram.getProgramWithConfig(
      StakingProgram,
      {
        asyncSigning: false,
        provider,
        idl: StakingProgramIDL,
      }
    );

    let ixs, args, accounts, additionalArgs;

    // STEP 1: Creates an item class

    ixs = [];

    const itemClassMintKeypair = anchor.web3.Keypair.generate();
    const itemClassIndex = 0;

    const createItemClassMintIxs = await createMintNFTInstructions(
      provider,
      itemClassMintKeypair.publicKey
    );

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
        components: null,
      },
    };

    args = {
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

    accounts = {
      itemMint: itemClassMintKeypair.publicKey,
      parent: null,
      parentMint: null,
      parentOfParentClassMint: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
      parentUpdateAuthority: null,
    } as Instructions.Item.CreateItemClassAccounts;

    additionalArgs = {} as Instructions.Item.CreateItemClassAdditionalArgs;

    const createItemClassIxs = await itemProgram.instruction.createItemClass(
      args,
      accounts,
      additionalArgs
    );

    ixs.push(...createItemClassMintIxs, ...createItemClassIxs);

    const { txid: createItemClassTxid } =
      await Transaction.sendTransactionWithRetry(
        provider.connection,
        provider.wallet,
        ixs,
        [itemClassMintKeypair]
      );

    expect(createItemClassTxid).toBeDefined();

    // STEP 2: Updates item class with components item class data

    ixs = [];

    const componentScope = "SCOPE_1";
    const craftItemMintKeypair = anchor.web3.Keypair.generate();

    const createCraftItemMintIxs = await createMintNFTInstructions(
      provider,
      craftItemMintKeypair.publicKey
    );

    itemClassData.config.components = [
      {
        mint: craftItemMintKeypair.publicKey,
        amount: new anchor.BN(1),
        classIndex: new anchor.BN(itemClassIndex),
        timeToBuild: null,
        componentScope,
        useUsageIndex: 0,
        condition: { presence: true },
        inherited: { notInherited: true },
      },
    ];

    args = {
      classIndex: new anchor.BN(itemClassIndex),
      updatePermissivenessToUse: { tokenHolder: true },
      parentClassIndex: null,
      itemClassData,
    } as Instructions.Item.UpdateItemClassArgs;

    accounts = {
      itemMint: itemClassMintKeypair.publicKey,
      parent: null,
      parentMint: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
    } as Instructions.Item.UpdateItemClassAccounts;

    additionalArgs = {
      permissionless: true,
    } as Instructions.Item.UpdateItemClassAdditionalArgs;

    const updateItemClassIxs = await itemProgram.instruction.updateItemClass(
      args,
      accounts,
      additionalArgs
    );

    ixs.push(...createCraftItemMintIxs, ...updateItemClassIxs);

    const { txid: updateItemClassTxid } =
      await Transaction.sendTransactionWithRetry(
        provider.connection,
        provider.wallet,
        ixs,
        [craftItemMintKeypair]
      );

    expect(updateItemClassTxid).toBeDefined();

    // STEP 3: Creates an item escrow

    ixs = [];

    const craftItemEscrowIndex = 0;
    const itemMintKeypair = anchor.web3.Keypair.generate();

    const createItemMintIxs = await createMintNFTInstructions(
      provider,
      itemMintKeypair.publicKey
    );

    args = {
      classIndex: new anchor.BN(itemClassIndex),
      craftEscrowIndex: new anchor.BN(craftItemEscrowIndex),
      componentScope: "none",
      buildPermissivenessToUse: { tokenHolder: true },
      namespaceIndex: null,
      itemClassMint: itemClassMintKeypair.publicKey,
      amountToMake: new anchor.BN(1),
      parentClassIndex: null,
    } as Instructions.Item.CreateItemEscrowArgs;

    accounts = {
      newItemMint: itemMintKeypair.publicKey,
      newItemToken: null, // item ATA
      newItemTokenHolder: walletKeypair.publicKey, // wallet
      parentMint: null,
      itemClassMint: itemClassMintKeypair.publicKey,
      metadataUpdateAuthority: walletKeypair.publicKey,
    } as Instructions.Item.CreateItemEscrowAccounts;

    additionalArgs = {};

    const createItemEscrowIxs = await itemProgram.instruction.createItemEscrow(
      args,
      accounts,
      additionalArgs
    );

    ixs.push(...createItemMintIxs, ...createItemEscrowIxs);

    const { txid: createItemEscrowTxid } =
      await Transaction.sendTransactionWithRetry(
        provider.connection,
        provider.wallet,
        ixs,
        [itemMintKeypair]
      );

    expect(createItemEscrowTxid).toBeDefined();

    // STEP 4: Starts item escrow build phase

    ixs = [];

    args = {
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

    accounts = {
      itemClassMint: itemClassMintKeypair.publicKey,
      newItemToken: null,
      newItemTokenHolder: walletKeypair.publicKey,
      parentMint: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
    } as Instructions.Item.StartItemEscrowBuildPhaseAccounts;

    additionalArgs =
      {} as Instructions.Item.StartItemEscrowBuildPhaseAdditionalArgs;

    const startItemEscrowBuildPhaseIxs =
      await itemProgram.instruction.startItemEscrowBuildPhase(
        args,
        accounts,
        additionalArgs
      );

    ixs.push(...startItemEscrowBuildPhaseIxs);

    const { txid: startItemEscrowBuildPhaseTxid } =
      await Transaction.sendTransactionWithRetry(
        provider.connection,
        provider.wallet,
        ixs,
        []
      );

    expect(startItemEscrowBuildPhaseTxid).toBeDefined();

    // STEP 5: Completes item escrow build phase

    ixs = [];

    const itemIndex = 0;

    args = {
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

    accounts = {
      itemClassMint: itemClassMintKeypair.publicKey,
      newItemMint: itemMintKeypair.publicKey,
      newItemToken: null,
      newItemTokenHolder: walletKeypair.publicKey,
      parentMint: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
    } as Instructions.Item.CompleteItemEscrowBuildPhaseAccounts;

    additionalArgs =
      {} as Instructions.Item.CompleteItemEscrowBuildPhaseAdditionalArgs;

    const completeItemEscrowBuildPhaseIxs =
      await itemProgram.instruction.completeItemEscrowBuildPhase(
        args,
        accounts,
        additionalArgs
      );

    ixs.push(...completeItemEscrowBuildPhaseIxs);

    const { txid: completeItemEscrowBuildPhaseTxid } =
      await Transaction.sendTransactionWithRetry(
        provider.connection,
        provider.wallet,
        ixs,
        []
      );

    expect(completeItemEscrowBuildPhaseTxid).toBeDefined();

    // STEP 6: Initializes a namespace

    // STEP 7: Joins to namespace

    // STEP 8: Begins artifact stake warmup

    ixs = [];

    const stakingIndex = 0;
    const stakingAmount = 100;
    const stakingMintKeypair = anchor.web3.Keypair.generate();
    const stakingTransferAuthority = anchor.web3.Keypair.generate();

    const createStakingMintIxs = await createMintTokensInstructions(
      provider,
      stakingMintKeypair.publicKey,
      stakingAmount,
      0
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

    args = {
      classIndex: new anchor.BN(itemClassIndex),
      parentClassIndex: null,
      index: new anchor.BN(itemIndex),
      stakingIndex: new anchor.BN(stakingIndex),
      artifactClassMint: itemClassMintKeypair.publicKey,
      artifactMint: itemMintKeypair.publicKey,
      stakingAmount: new anchor.BN(stakingAmount),
      stakingPermissivenessToUse: { tokenHolder: true },
    } as Instructions.Staking.BeginArtifactStakeWarmupArgs;

    accounts = {
      artifactClass: artifactClassPDA,
      artifact: artifactPDA,
      stakingAccount: stakingMintAta,
      stakingMint: stakingMintKeypair.publicKey,
      stakingTransferAuthority,
      parentClassMint: null,
      parentClass: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
      namespace: anchor.web3.Keypair.generate().publicKey,
    } as Instructions.Staking.BeginArtifactStakeWarmupAccounts;

    const beginArtifactStakeWarmupIxs =
      await stakingProgram.instruction.beginArtifactStakeWarmup(args, accounts);

    ixs.push(...createStakingMintIxs, ...beginArtifactStakeWarmupIxs);

    const { txid: beginArtifactStakeWarmupTxid } =
      await Transaction.sendTransactionWithRetry(
        provider.connection,
        provider.wallet,
        ixs,
        [stakingMintKeypair, stakingTransferAuthority]
      );

    expect(beginArtifactStakeWarmupTxid).toBeDefined();

    // STEP 9: Ends artifact stake warmup

    ixs = [];

    args = {
      classIndex: new anchor.BN(itemClassIndex),
      index: new anchor.BN(itemIndex),
      stakingIndex: new anchor.BN(stakingIndex),
      artifactClassMint: itemClassMintKeypair.publicKey,
      artifactMint: itemMintKeypair.publicKey,
    } as Instructions.Staking.EndArtifactStakeWarmupArgs;

    accounts = {
      artifactClass: artifactClassPDA,
      artifact: artifactPDA,
      stakingMint: stakingMintKeypair.publicKey,
    } as Instructions.Staking.EndArtifactStakeWarmupAccounts;

    const endArtifactStakeWarmupIxs =
      await stakingProgram.instruction.beginArtifactStakeWarmup(args, accounts);

    ixs.push(...endArtifactStakeWarmupIxs);

    const { txid: endArtifactStakeWarmupTxid } =
      await Transaction.sendTransactionWithRetry(
        provider.connection,
        provider.wallet,
        ixs,
        []
      );

    expect(endArtifactStakeWarmupTxid).toBeDefined();

    // STEP 10: Begins artifact stake cooldown

    ixs = [];

    args = {
      classIndex: new anchor.BN(itemClassIndex),
      parentClassIndex: null,
      index: new anchor.BN(itemIndex),
      stakingIndex: new anchor.BN(stakingIndex),
      artifactClassMint: itemClassMintKeypair.publicKey,
      artifactMint: itemMintKeypair.publicKey,
      stakingPermissivenessToUse: { tokenHolder: true },
    } as Instructions.Staking.BeginArtifactStakeCooldownArgs;

    accounts = {
      artifactClass: artifactClassPDA,
      artifact: artifactPDA,
      stakingAccount: stakingMintAta,
      parentClassAccount: null,
      parentClassMint: null,
      parentClass: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
    } as Instructions.Staking.BeginArtifactStakeCooldownAccounts;

    const beginArtifactStakeCooldownIxs =
      await stakingProgram.instruction.beginArtifactStakeCooldown(
        args,
        accounts
      );

    ixs.push(...beginArtifactStakeCooldownIxs);

    const { txid: beginArtifactStakeCooldownTxid } =
      await Transaction.sendTransactionWithRetry(
        provider.connection,
        provider.wallet,
        ixs,
        []
      );

    expect(beginArtifactStakeCooldownTxid).toBeDefined();

    // STEP 11: Ends artifact stake cooldown

    ixs = [];

    args = {
      classIndex: new anchor.BN(itemClassIndex),
      index: new anchor.BN(itemIndex),
      stakingIndex: new anchor.BN(stakingIndex),
      artifactClassMint: itemClassMintKeypair.publicKey,
      artifactMint: itemMintKeypair.publicKey,
    } as Instructions.Staking.EndArtifactStakeCooldownArgs;

    accounts = {
      artifactClass: artifactClassPDA,
      artifact: artifactPDA,
      stakingAccount: stakingMintAta,
      stakingMint: stakingMintKeypair.publicKey,
    } as Instructions.Staking.EndArtifactStakeCooldownAccounts;

    const endArtifactStakeCooldownIxs =
      await stakingProgram.instruction.endArtifactStakeCooldown(args, accounts);

    ixs.push(...endArtifactStakeCooldownIxs);

    const { txid: endArtifactStakeCooldownTxid } =
      await Transaction.sendTransactionWithRetry(
        provider.connection,
        provider.wallet,
        ixs,
        []
      );

    expect(endArtifactStakeCooldownTxid).toBeDefined();
  });
});
