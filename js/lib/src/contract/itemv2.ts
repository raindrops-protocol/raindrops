import { Program, Transaction, SendOptions } from "@raindrop-studios/sol-kit";
import { web3, BN, Wallet } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import * as ItemInstruction from "../instructions/itemv2";
import {
  Build,
  BuildIngredientData,
  IngredientMint,
  convertToBuildStatus,
  ItemClass,
  Item,
  Ingredient,
  Recipe,
  Pack,
  BuildPermit,
  DeterministicIngredient,
  DeterministicIngredientOutput,
  OutputSelectionGroup,
  OutputSelection,
  Payment,
  PaymentState,
  ITEMV2_ID,
  getRecipePda,
  getPackPda,
  ItemClassMode,
  convertToPaymentStatus,
  parseItemClassMode,
} from "../state/itemv2";
import { SendTransactionResult } from "@raindrop-studios/sol-kit/dist/src/transaction";

export class ItemProgramV2 extends Program.Program {
  declare instruction: ItemInstruction.Instruction;
  static PREFIX = "item_v2";
  PROGRAM_ID = ITEMV2_ID;

  constructor() {
    super();
    this.instruction = new ItemInstruction.Instruction({ program: this });
  }

  async createItemClass(
    args: ItemInstruction.CreateItemClassArgs,
    options?: SendOptions
  ): Promise<[web3.PublicKey, Transaction.SendTransactionResult]> {
    const [itemClass, signers, instructions] =
      await this.instruction.createItemClass(args);
    const result = await this.sendWithRetry(instructions, signers, options);
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

  async createPack(
    accounts: ItemInstruction.CreatePackAccounts,
    args: ItemInstruction.CreatePackArgs,
    options?: SendOptions
  ): Promise<[Transaction.SendTransactionResult, web3.PublicKey]> {
    const [ix, pack] = await this.instruction.createPack(accounts, args);
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
    accounts: ItemInstruction.VerifyIngredientMerkleTreeTestAccounts,
    args: ItemInstruction.VerifyIngredientArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.verifyIngredientMerkleTreeTest(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async completeBuild(
    accounts: ItemInstruction.CompleteBuildAccounts,
    args: ItemInstruction.CompleteBuildArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.completeBuild(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async receiveItem(
    accounts: ItemInstruction.ReceiveItemAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult[]> {
    const ixnGroups = await this.instruction.receiveItem(accounts);

    const resultPromises: Promise<Transaction.SendTransactionResult>[] = [];
    for (const group of ixnGroups) {
      const resultPromise = this.sendWithRetry(group, [], options);
      resultPromises.push(resultPromise);
    }
    const results = await Promise.all(resultPromises);

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

  async escrowPayment(
    accounts: ItemInstruction.EscrowPaymentAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.escrowPayment(accounts);
    return await this.sendWithRetry([ix], [], options);
  }
  
  async transferPayment(
    accounts: ItemInstruction.TransferPaymentAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.transferPayment(accounts);
    return await this.sendWithRetry([ix], [], options);
  }

  async createBuildPermit(
    accounts: ItemInstruction.CreateBuildPermitAccounts,
    args: ItemInstruction.CreateBuildPermitArgs,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.createBuildPermit(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async createDeterministicIngredient(
    accounts: ItemInstruction.CreateDeterministicIngredientAccounts,
    args: ItemInstruction.CreateDeterministicIngredientArgs,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.createDeterministicIngredient(
      accounts,
      args
    );
    return await this.sendWithRetry([ix], [], options);
  }

  async getItemClass(itemClass: web3.PublicKey): Promise<ItemClass | null> {
    const itemClassData = await this.client.account.itemClass.fetch(itemClass);
    if (!itemClassData) {
      return null;
    }

    let recipeIndex: BN | null = null;
    if (itemClassData.recipeIndex !== null) {
      recipeIndex = new BN(itemClassData.recipeIndex as any);
    }

    const recipes: Recipe[] = [];
    if (recipeIndex !== null) {
      for (let i = 0; i <= recipeIndex.toNumber(); i++) {
        const recipeAddr = getRecipePda(itemClass, new BN(i));

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
        let payment: Payment | null = null;
        if (recipeData.payment) {
          payment = {
            amount: new BN((recipeData.payment as any).amount as string),
            treasury: new web3.PublicKey((recipeData.payment as any).treasury),
          };
        }

        const selectableOutputs: OutputSelectionGroup[] = [];
        for (const output of recipeData.selectableOutputs as any[]) {
          const choices: OutputSelection[] = [];
          for (const choice of output.choices as any[]) {
            choices.push({
              outputId: Number(choice.outputId),
              mint: new web3.PublicKey(choice.mint),
              amount: new BN(choice.amount),
            });
          }

          selectableOutputs.push({
            groupId: Number(output.groupId),
            choices: choices,
          });
        }

        const recipe: Recipe = {
          itemClass: itemClass,
          recipeIndex: new BN(i),
          payment: payment,
          buildEnabled: Boolean(recipeData.buildEnabled),
          ingredients: ingredients,
          buildPermitRequired: Boolean(recipeData.buildPermitRequired),
          selectableOutputs: selectableOutputs,
        };

        recipes.push(recipe);
      }
    }

    const mode = parseItemClassMode(itemClassData);

    const data: ItemClass = {
      name: String(itemClassData.name),
      authorityMint: new web3.PublicKey(itemClassData.authorityMint),
      recipeIndex: recipeIndex,
      recipes: recipes,
      mode: mode,
    };

    return data;
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
        isDeterministic: Boolean(rawIngredient.isDeterministic),
      });
    }

    const buildOutput: ItemInstruction.BuildOutput = { items: [] };
    for (const output of buildDataRaw.output.items) {
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
        status: convertToPaymentStatus(payment.status),
        paymentDetails: {
          treasury: new web3.PublicKey(payment.paymentDetails.treasury),
          amount: new BN(payment.paymentDetails.amount as string),
        },
      };
    }

    const buildData: Build = {
      address: build,
      recipe: new web3.PublicKey(buildDataRaw.recipe),
      builder: new web3.PublicKey(buildDataRaw.builder),
      itemClass: new web3.PublicKey(buildDataRaw.itemClass),
      output: buildOutput,
      payment: paymentData,
      ingredients: buildIngredientData,
      status: convertToBuildStatus(buildDataRaw.status),
      buildPermitInUse: Boolean(buildDataRaw.buildPermitInUse),
    };

    return buildData;
  }

  async getItem(item: web3.PublicKey): Promise<Item | null> {
    let itemDataRaw;
    try {
      itemDataRaw = await this.client.account.item.fetch(item);
    } catch (_e) {
      return null;
    }

    let cooldown: BN | null = null;
    if ((itemDataRaw.itemState as any).nonFungible.cooldown !== null) {
      cooldown = new BN((itemDataRaw.itemState as any).nonFungible.cooldown);
    }

    const itemData: Item = {
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

    const selectableOutputs: OutputSelectionGroup[] = [];
    for (const output of recipeDataRaw.selectableOutputs as any[]) {
      const choices: OutputSelection[] = [];
      for (const choice of output.choices as any[]) {
        choices.push({
          outputId: Number(choice.outputId),
          mint: new web3.PublicKey(choice.mint),
          amount: new BN(choice.amount),
        });
      }

      selectableOutputs.push({
        groupId: Number(output.groupId),
        choices: choices,
      });
    }

    const recipeData: Recipe = {
      recipeIndex: new BN(recipeDataRaw.recipeIndex),
      itemClass: new web3.PublicKey(recipeDataRaw.itemClass),
      buildEnabled: Boolean(recipeDataRaw.buildEnabled),
      payment: payment,
      ingredients: ingredients,
      buildPermitRequired: Boolean(recipeDataRaw.buildPermitRequired),
      selectableOutputs: selectableOutputs,
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
      address: pack,
      opened: Boolean(packDataRaw.opened),
      itemClass: new web3.PublicKey(packDataRaw.itemClass),
      id: new BN(packDataRaw.id),
      contentsHash: Uint8Array.from(packDataRaw.contentsHash),
    };

    return packData;
  }

  async getPacks(itemClass: web3.PublicKey): Promise<Pack[]> {
    const itemClassData = await this.getItemClass(itemClass);

    if (itemClassData.mode.kind !== "Pack") {
      throw new Error(
        `ItemClass ${itemClass.toString()} is not configured for Packs`
      );
    }

    // get all pack pdas
    const packIndex = itemClassData.mode.index.toNumber();
    const packAddresses: web3.PublicKey[] = [];
    for (let i = 0; i < packIndex; i++) {
      packAddresses.push(getPackPda(itemClass, new BN(i)));
    }
    console.log("found %d possible packs", packAddresses.length);

    // fetch all packs at once
    const fetchPackDataPromises: Promise<Pack | null>[] = [];
    for (const pack of packAddresses) {
      fetchPackDataPromises.push(this.getPack(pack));
    }
    const allPackData = await Promise.all(fetchPackDataPromises);

    const availablePacks: Pack[] = [];
    for (const packData of allPackData) {
      // skip if pda data doesnt exist
      if (packData === null || packData === undefined) {
        continue;
      }

      // skip if pack data is already opened
      if (packData.opened) {
        continue;
      }

      availablePacks.push(packData);
    }
    console.log("found %d available packs", availablePacks.length);

    return availablePacks;
  }

  async getBuildPermit(
    buildPermit: web3.PublicKey
  ): Promise<BuildPermit | null> {
    let buildPermitDataRaw;
    try {
      buildPermitDataRaw = await this.client.account.buildPermit.fetch(
        buildPermit
      );
    } catch (_e) {
      return null;
    }

    const buildPermitData: BuildPermit = {
      itemClass: new web3.PublicKey(buildPermitDataRaw.itemClass),
      builder: new web3.PublicKey(buildPermitDataRaw.builder),
      remainingBuilds: Number(buildPermitDataRaw.remainingBuilds),
    };

    return buildPermitData;
  }

  async getDeterministicIngredient(
    deterministicIngredient: web3.PublicKey
  ): Promise<DeterministicIngredient | null> {
    let deterministicIngredientDataRaw;
    try {
      deterministicIngredientDataRaw =
        await this.client.account.deterministicIngredient.fetch(
          deterministicIngredient
        );
    } catch (_e) {
      return null;
    }

    const outputs: DeterministicIngredientOutput[] = [];
    for (const output of deterministicIngredientDataRaw.outputs) {
      outputs.push({
        mint: new web3.PublicKey(output.mint),
        amount: new BN(output.amount),
      });
    }

    const deterministicIngredientData: DeterministicIngredient = {
      recipe: new web3.PublicKey(deterministicIngredientDataRaw.recipe),
      ingredientMint: new web3.PublicKey(
        deterministicIngredientDataRaw.ingredientMint
      ),
      outputs: outputs,
    };

    return deterministicIngredientData;
  }
}

export async function getItemProgramV2(
  anchorWallet: NodeWallet | web3.Keypair,
  env: string,
  customRpcUrl: string
): Promise<ItemProgramV2> {
  if ((anchorWallet as web3.Keypair).secretKey) {
    return ItemProgramV2.getProgramWithWalletKeyPair(
      ItemProgramV2,
      anchorWallet as web3.Keypair,
      env,
      customRpcUrl
    );
  }

  return ItemProgramV2.getProgramWithWallet(
    ItemProgramV2,
    anchorWallet as Wallet,
    env,
    customRpcUrl
  );
}
