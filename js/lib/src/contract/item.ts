import {
  ObjectWrapper,
  Program,
  Transaction,
  SendOptions,
} from "@raindrop-studios/sol-kit";
import { web3, BN, AnchorProvider, Wallet } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

import { ITEM_ID } from "../constants/programIds";
import * as ItemInstruction from "../instructions/item";
import {
  Build,
  BuildIngredientData,
  IngredientMint,
  convertToBuildStatus,
  decodeItemClass,
  ItemClass,
  ItemClassV1,
  ItemV1,
  Ingredient,
  Recipe,
  Pack,
} from "../state/item";
import { getAtaForMint, getItemPDA } from "../utils/pda";
import { PREFIX } from "../constants/item";
import { Utils } from "../main";
import { Payment, PaymentState } from "../instructions/item";

export class ItemProgram extends Program.Program {
  declare instruction: ItemInstruction.Instruction;
  static PREFIX = PREFIX;
  PROGRAM_ID = ITEM_ID;

  constructor() {
    super();
    this.instruction = new ItemInstruction.Instruction({ program: this });
  }

  async fetchItemClass(
    mint: web3.PublicKey,
    index: BN
  ): Promise<ItemClassWrapper | null> {
    const itemClass = (await getItemPDA(mint, index))[0];

    // Need a manual deserializer due to our hack we had to do.
    const itemClassObj = await (
      this.client.provider as AnchorProvider
    ).connection.getAccountInfo(itemClass);

    if (!itemClassObj?.data) {
      return Promise.resolve(null);
    }
    const ic = decodeItemClass(itemClassObj.data);

    return new ItemClassWrapper({
      program: this,
      key: itemClass,
      data: itemClassObj.data,
      object: ic,
    });
  }

  async createItemClass(
    args: ItemInstruction.CreateItemClassArgs,
    accounts: ItemInstruction.CreateItemClassAccounts,
    additionalArgs: ItemInstruction.CreateItemClassAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.createItemClass(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async updateItemClass(
    args: ItemInstruction.UpdateItemClassArgs,
    accounts: ItemInstruction.UpdateItemClassAccounts,
    additionalArgs: ItemInstruction.UpdateItemClassAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.updateItemClass(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async createItemEscrow(
    args: ItemInstruction.CreateItemEscrowArgs,
    accounts: ItemInstruction.CreateItemEscrowAccounts,
    additionalArgs: ItemInstruction.CreateItemEscrowAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.createItemEscrow(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async completeItemEscrowBuildPhase(
    args: ItemInstruction.CompleteItemEscrowBuildPhaseArgs,
    accounts: ItemInstruction.CompleteItemEscrowBuildPhaseAccounts,
    additionalArgs: ItemInstruction.CompleteItemEscrowBuildPhaseAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.completeItemEscrowBuildPhase(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async deactivateItemEscrow(
    args: ItemInstruction.DeactivateItemEscrowArgs,
    accounts: ItemInstruction.DeactivateItemEscrowAccounts,
    additionalArgs: ItemInstruction.DeactivateItemEscrowAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.deactivateItemEscrow(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async updateValidForUseIfWarmupPassed(
    args: ItemInstruction.UpdateValidForUseIfWarmupPassedArgs,
    accounts: ItemInstruction.UpdateValidForUseIfWarmupPassedAccounts,
    additionalArgs: ItemInstruction.UpdateValidForUseIfWarmupPassedAdditionalArgs = {},
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.updateValidForUseIfWarmupPassed(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async addCraftItemToEscrow(
    args: ItemInstruction.AddCraftItemToEscrowArgs,
    accounts: Omit<
      ItemInstruction.AddCraftItemToEscrowAccounts,
      "craftItemTransferAuthority"
    >,
    additionalArgs: ItemInstruction.AddCraftItemToEscrowAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const signers = [];
    const craftItemTransferAuthority = web3.Keypair.generate();
    signers.push(craftItemTransferAuthority);

    const instructions = await this.instruction.addCraftItemToEscrow(
      args,
      {
        ...accounts,
        craftItemTransferAuthority: craftItemTransferAuthority.publicKey,
      },
      { additionalArgs }
    );

    return this.sendWithRetry(instructions, signers, options);
  }

  async removeCraftItemFromEscrow(
    args: ItemInstruction.RemoveCraftItemFromEscrowArgs,
    accounts: ItemInstruction.RemoveCraftItemFromEscrowAccounts,
    additionalArgs: ItemInstruction.RemoveCraftItemFromEscrowAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.removeCraftItemFromEscrow(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async beginItemActivation(
    args: Omit<ItemInstruction.BeginItemActivationArgs, "itemClass">,
    accounts: ItemInstruction.BeginItemActivationAccounts,
    additionalArgs: ItemInstruction.BeginItemActivationAdditionalArgs = {},
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const itemClass = await this.fetchItemClass(
      args.itemClassMint,
      args.classIndex
    );
    if (!itemClass) {
      throw new ItemClassNotFoundError(
        "Please double check the specified itemClassMint and classIndex"
      );
    }

    const instruction = await this.instruction.beginItemActivation(
      { ...args, itemClass },
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async endItemActivation(
    args: ItemInstruction.EndItemActivationArgs,
    accounts: ItemInstruction.EndItemActivationAccounts,
    additionalArgs: ItemInstruction.EndItemActivationAdditionalArgs = {},
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const signers = [];

    let itemTransferAuthority = accounts.itemTransferAuthority;
    if (
      !itemTransferAuthority &&
      accounts.itemAccount &&
      accounts.itemAccount.equals(
        (
          await getAtaForMint(
            accounts.itemMint,
            (this.client.provider as AnchorProvider).wallet.publicKey
          )
        )[0]
      )
    ) {
      itemTransferAuthority = web3.Keypair.generate();
      signers.push(itemTransferAuthority);
    }

    const instruction = await this.instruction.endItemActivation(
      args,
      { ...accounts, itemTransferAuthority },
      additionalArgs
    );
    return this.sendWithRetry(instruction, signers, options);
  }

  async drainItemEscrow(
    args: ItemInstruction.DrainItemEscrowArgs,
    accounts: ItemInstruction.DrainItemEscrowAccounts,
    additionalArgs: ItemInstruction.DrainItemEscrowAdditionalArgs = {},
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.drainItemEscrow(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async startItemEscrowBuildPhase(
    args: ItemInstruction.StartItemEscrowBuildPhaseArgs,
    accounts: ItemInstruction.StartItemEscrowBuildPhaseAccounts,
    additionalArgs: ItemInstruction.StartItemEscrowBuildPhaseAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.startItemEscrowBuildPhase(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async updateItem(
    args: ItemInstruction.UpdateItemArgs,
    accounts: ItemInstruction.UpdateItemAccounts,
    additionalArgs: ItemInstruction.UpdateItemAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.updateItem(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  //
  // v1
  //

  async createItemClassV1(
    args: ItemInstruction.CreateItemClassV1Args,
    options?: SendOptions
  ): Promise<[web3.PublicKey, Transaction.SendTransactionResult]> {
    const [itemClass, itemsKp, instructions] =
      await this.instruction.createItemClassV1(args);
    const result = await this.sendWithRetry(instructions, [itemsKp], options);
    return [itemClass, result];
  }

  // TODO: chunk the returned instructions
  async addItemsToItemClass(
    accounts: ItemInstruction.AddItemsToItemClass,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ixns = await this.instruction.addItemsToItemClass(accounts);
    return await this.sendWithRetry(ixns, [], options);
  }

  async addPackToItemClass(
    accounts: ItemInstruction.AddPackToItemClassAccounts,
    args: ItemInstruction.AddPackToItemClassArgs,
    options?: SendOptions
  ): Promise<[Transaction.SendTransactionResult, web3.PublicKey]> {
    const [ix, pack] = await this.instruction.addPackToItemClass(
      accounts,
      args
    );
    const result = await this.sendWithRetry([ix], [], options);
    return [result, pack];
  }

  async createRecipe(
    accounts: ItemInstruction.CreateRecipeAccounts,
    args: ItemInstruction.CreateRecipeArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.createRecipe(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async startBuild(
    accounts: ItemInstruction.StartBuildAccounts,
    args: ItemInstruction.StartBuildArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.startBuild(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async addIngredient(
    accounts: ItemInstruction.AddIngredientAccounts,
    args: ItemInstruction.AddIngredientArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ixns = await this.instruction.addIngredient(accounts, args);
    return await this.sendWithRetry(ixns, [], options);
  }

  async verifyIngredient(
    accounts: ItemInstruction.VerifyIngredientAccounts,
    args: ItemInstruction.VerifyIngredientArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.verifyIngredient(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async verifyIngredientTest(
    accounts: ItemInstruction.VerifyIngredientTestAccounts,
    args: ItemInstruction.VerifyIngredientArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.verifyIngredientTest(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async completeBuildItem(
    accounts: ItemInstruction.CompleteBuildItemAccounts,
    args: ItemInstruction.CompleteBuildItemArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.completeBuildItem(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async completeBuildPack(
    accounts: ItemInstruction.CompleteBuildPackAccounts,
    args: ItemInstruction.CompleteBuildPackArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.completeBuildPack(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async receiveItem(
    accounts: ItemInstruction.ReceiveItemAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult[]> {
    const ixnGroups = await this.instruction.receiveItem(accounts);

    const results: Transaction.SendTransactionResult[] = [];
    for (let group of ixnGroups) {
      const result = await this.sendWithRetry(group, [], options);
      results.push(result);
    }

    return results;
  }

  async applyBuildEffect(
    accounts: ItemInstruction.ApplyBuildEffectAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.applyBuildEffect(accounts);
    return await this.sendWithRetry([ix], [], options);
  }

  async returnIngredient(
    accounts: ItemInstruction.ReturnIngredientAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ixns = await this.instruction.returnIngredient(accounts);
    return await this.sendWithRetry(ixns, [], options);
  }

  async destroyIngredient(
    accounts: ItemInstruction.DestroyIngredientAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ixns = await this.instruction.destroyIngredient(accounts);
    return await this.sendWithRetry(ixns, [], options);
  }

  async closeBuild(
    accounts: ItemInstruction.CloseBuildAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.closeBuild(accounts);
    return await this.sendWithRetry([ix], [], options);
  }

  async addPayment(
    accounts: ItemInstruction.AddPaymentAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.addPayment(accounts);
    return await this.sendWithRetry([ix], [], options);
  }

  async getItemClassV1(itemClass: web3.PublicKey): Promise<ItemClassV1 | null> {
    const itemClassData = await this.client.account.itemClassV1.fetch(
      itemClass
    );
    if (!itemClassData) {
      return null;
    }

    const recipeIndex = new BN(itemClassData.recipeIndex as string);

    const recipes: Recipe[] = [];
    for (let i = 0; i <= recipeIndex.toNumber(); i++) {
      const recipeAddr = Utils.PDA.getRecipe(itemClass, new BN(i));

      const recipeData = await this.client.account.recipe.fetch(recipeAddr);

      // get recipe ingredients
      const ingredients: Ingredient[] = [];
      for (const recipeIngredient of recipeData.ingredients as any[]) {
        const ingredient: Ingredient = {
          itemClass: new web3.PublicKey(recipeIngredient.itemClass),
          requiredAmount: new BN(recipeIngredient.requiredAmount as string),
          buildEffect: recipeIngredient.buildEffect,
        };

        ingredients.push(ingredient);
      }

      // get payment data
      let payment: ItemInstruction.Payment | null = null;
      if (recipeData.payment) {
        payment = {
          amount: new BN((recipeData.payment as any).amount as string),
          treasury: new web3.PublicKey((recipeData.payment as any).treasury),
        };
      }

      const recipe: Recipe = {
        itemClass: itemClass,
        recipeIndex: new BN(i),
        payment: payment,
        buildEnabled: recipeData.buildEnabled as boolean,
        ingredients: ingredients,
      };

      recipes.push(recipe);
    }

    const itemClassV1: ItemClassV1 = {
      authority: new web3.PublicKey(itemClassData.authority),
      items: new web3.PublicKey(itemClassData.items),
      recipeIndex: recipeIndex,
      recipes: recipes,
    };

    return itemClassV1;
  }

  async getBuild(build: web3.PublicKey): Promise<Build | null> {
    let buildDataRaw;
    try {
      buildDataRaw = await this.client.account.build.fetch(build);
    } catch (_e) {
      return null;
    }

    const buildIngredientData: BuildIngredientData[] = [];

    for (const rawIngredient of buildDataRaw.ingredients as any[]) {
      const mints: IngredientMint[] = [];
      for (const rawIngredientMint of rawIngredient.mints as any[]) {
        mints.push({
          mint: new web3.PublicKey(rawIngredientMint.mint),
          buildEffectApplied: rawIngredientMint.buildEffectApplied,
        });
      }

      buildIngredientData.push({
        itemClass: new web3.PublicKey(rawIngredient.itemClass),
        currentAmount: new BN(rawIngredient.currentAmount),
        requiredAmount: new BN(rawIngredient.requiredAmount),
        buildEffect: rawIngredient.buildEffect,
        mints: mints,
      });
    }

    const buildOutput: ItemInstruction.BuildOutput = { items: [] };
    for (let output of buildDataRaw.output.items) {
      buildOutput.items.push({
        mint: new web3.PublicKey(output.mint),
        amount: new BN(output.amount),
        received: Boolean(output.received),
      });
    }

    // detect payment
    let paymentData: PaymentState | null = null;
    const payment = buildDataRaw.payment;
    if (payment !== null) {
      paymentData = {
        paid: payment.paid as boolean,
        paymentDetails: {
          treasury: new web3.PublicKey(payment.paymentDetails.treasury),
          amount: new BN(payment.paymentDetails.amount as string),
        },
      };
    }

    const buildData: Build = {
      recipeIndex: new BN(buildDataRaw.recipeIndex as string),
      builder: new web3.PublicKey(buildDataRaw.builder),
      itemClass: new web3.PublicKey(buildDataRaw.itemClass),
      output: buildOutput,
      payment: paymentData,
      ingredients: buildIngredientData,
      status: convertToBuildStatus(buildDataRaw.status),
    };

    return buildData;
  }

  async getItemV1(item: web3.PublicKey): Promise<ItemV1 | null> {
    let itemDataRaw;
    try {
      itemDataRaw = await this.client.account.itemV1.fetch(item);
    } catch (_e) {
      return null;
    }

    let cooldown: BN | null = null;
    if ((itemDataRaw.itemState as any).nonFungible.cooldown !== null) {
      cooldown = new BN((itemDataRaw.itemState as any).nonFungible.cooldown);
    }

    const itemData: ItemV1 = {
      initialized: itemDataRaw.initialized as boolean,
      itemMint: new web3.PublicKey(itemDataRaw.itemMint),
      itemState: {
        cooldown: cooldown,
        durability: new BN(
          (itemDataRaw.itemState as any).nonFungible.durability
        ),
      },
    };

    return itemData;
  }

  async getRecipe(recipe: web3.PublicKey): Promise<Recipe | null> {
    let recipeDataRaw;
    try {
      recipeDataRaw = await this.client.account.recipe.fetch(recipe);
    } catch (_e) {
      return null;
    }

    let payment: Payment | null = null;
    if (recipeDataRaw.payment) {
      payment = {
        treasury: new web3.PublicKey(recipeDataRaw.payment.treasury),
        amount: new BN(recipeDataRaw.payment.amount),
      };
    }

    const ingredients: Ingredient[] = [];
    for (const ingredient of recipeDataRaw.ingredients) {
      ingredients.push({
        itemClass: new web3.PublicKey(ingredient.itemClass),
        requiredAmount: new BN(ingredient.requiredAmount),
        buildEffect: ingredient.buildEffect,
      });
    }

    const recipeData: Recipe = {
      recipeIndex: new BN(recipeDataRaw.recipeIndex),
      itemClass: new web3.PublicKey(recipeDataRaw.itemClass),
      buildEnabled: recipeDataRaw.buildEnabled as boolean,
      payment: payment,
      ingredients: ingredients,
    };

    return recipeData;
  }

  async getPack(pack: web3.PublicKey): Promise<Pack | null> {
    let packDataRaw;
    try {
      packDataRaw = await this.client.account.pack.fetch(pack);
    } catch (_e) {
      return null;
    }

    const packData: Pack = {
      itemClass: new web3.PublicKey(packDataRaw.itemClass),
      id: new BN(packDataRaw.id),
      contentsHash: Uint8Array.from(packDataRaw.contentsHash),
    };

    return packData;
  }
}
export class ItemClassWrapper implements ObjectWrapper<ItemClass, ItemProgram> {
  program: ItemProgram;
  key: web3.PublicKey;
  object: ItemClass;
  data: Buffer;

  constructor(args: {
    program: ItemProgram;
    key: web3.PublicKey;
    object: ItemClass;
    data: Buffer;
  }) {
    this.program = args.program;
    this.key = args.key;
    this.object = args.object;
    this.data = args.data;
  }
}

export async function getItemProgram(
  anchorWallet: NodeWallet | web3.Keypair,
  env: string,
  customRpcUrl: string
): Promise<ItemProgram> {
  if ((anchorWallet as web3.Keypair).secretKey) {
    return ItemProgram.getProgramWithWalletKeyPair(
      ItemProgram,
      anchorWallet as web3.Keypair,
      env,
      customRpcUrl
    );
  }

  return ItemProgram.getProgramWithWallet(
    ItemProgram,
    anchorWallet as Wallet,
    env,
    customRpcUrl
  );
}

export class ItemClassNotFoundError extends Error {
  constructor(message: string) {
    super(`ItemClass Not Found: ${message}`);

    // Set the prototype explicitly
    // Ref: https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, Error.prototype);
  }
}
