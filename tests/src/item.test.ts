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
  it.concurrent("Creates an item class", async () => {
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

    const ixs = [];

    const mintKeypair = anchor.web3.Keypair.generate();

    const createMintNFTIxs = await createMintNFTInstructions(
      provider,
      mintKeypair.publicKey
    );

    const args: Instructions.Item.CreateItemClassArgs = {
      classIndex: new anchor.BN(0),
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
    };

    const accounts: Instructions.Item.CreateItemClassAccounts = {
      itemMint: mintKeypair.publicKey,
      parent: null,
      parentMint: null,
      parentOfParentClassMint: null,
      metadataUpdateAuthority: walletKeypair.publicKey,
      parentUpdateAuthority: null,
    };

    const additionalArgs: Instructions.Item.CreateItemClassAdditionalArgs = {};

    const createItemClassIxs = await itemProgram.instruction.createItemClass(
      args,
      accounts,
      additionalArgs
    );

    ixs.push(...createMintNFTIxs, ...createItemClassIxs);

    const { txid } = await Transaction.sendTransactionWithRetry(
      provider.connection,
      provider.wallet,
      ixs,
      [mintKeypair]
    );

    expect(txid).toBeDefined();
  });
});
