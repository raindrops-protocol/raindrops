import * as anchor from "@project-serum/anchor";
import { Transaction } from "@raindrop-studios/sol-kit";
import {
  ItemProgram,
  Instructions,
  State,
} from "@raindrops-protocol/raindrops";
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

    args = {
      classIndex: new anchor.BN(itemClassIndex),
      parentClassIndex: null,
      space: new anchor.BN(300),
      desiredNamespaceArraySize: 1,
      updatePermissivenessToUse: { tokenHolder: true },
      storeMint: false,
      storeMetadataFields: false,
      itemClassData: new State.Item.ItemClassData({
        settings: new State.Item.ItemClassSettings({
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
        }),
        config: new State.Item.ItemClassConfig({
          usageRoot: null,
          usageStateRoot: null,
          componentRoot: null,
          usages: null,
          components: null,
        }),
      }),
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

    console.log("Successfully created item class");

    // STEP 2: Creates an item escrow

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

    console.log("Successfully created item escrow");
  });
});
