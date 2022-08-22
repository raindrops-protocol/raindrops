import * as anchor from "@project-serum/anchor";
import { Transaction } from "@raindrop-studios/sol-kit";
import { ItemProgram, Instructions } from "@raindrops-protocol/raindrops";
import { IDL as ItemProgramIDL } from "./types/item";
import { createMintNFTInstructions } from "./utils/token";

describe("Item Program", () => {
  it.concurrent("Item Flow", async () => {
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

    // STEP X: Adds craft item to escrow

    // ixs = [];

    // const craftItemIndex = 0;

    // args = {
    //   classIndex: new anchor.BN(itemClassIndex),
    //   parentClassIndex: null,
    //   craftItemIndex: new anchor.BN(craftItemIndex),
    //   craftEscrowIndex: new anchor.BN(craftItemEscrowIndex),
    //   newItemMint: craftItemMintKeypair.publicKey,
    // } as Instructions.Item.AddCraftItemToEscrowArgs;

    // accounts = {} as Instructions.Item.AddCraftItemToEscrowAccounts;

    // additionalArgs = {} as Instructions.Item.AddCraftItemToEscrowAdditionalArgs;

    // const addCraftItemToEscrowIxs =
    //   await itemProgram.instruction.addCraftItemToEscrow(
    //     args,
    //     accounts,
    //     additionalArgs
    //   );

    // ixs.push(...addCraftItemToEscrowIxs);

    // const { txid: addCraftItemToEscrowTxid } =
    //   await Transaction.sendTransactionWithRetry(
    //     provider.connection,
    //     provider.wallet,
    //     ixs,
    //     []
    //   );

    // expect(addCraftItemToEscrowTxid).toBeDefined();
  });
});
