import * as anchor from "@project-serum/anchor";
import * as errors from "./errors";
import { Build, BuildIngredientData, BuildStatus, ItemClassV1, ItemV1 } from "../state/item";
import { fetch } from "cross-fetch";

export class Client {
  readonly baseUrl: string;
  readonly provider: anchor.AnchorProvider;

  constructor(provider: anchor.AnchorProvider, cluster: string) {
    this.provider = provider;

    switch (cluster) {
      case "mainnet-beta": {
        this.baseUrl = "https://items.raindrops.xyz";
        break;
      }
      case "devnet": {
        this.baseUrl = "https://2tbu4lwr5b.execute-api.us-east-1.amazonaws.com";
        break;
      }
      case "localnet": {
        this.baseUrl = "http://localhost:3000";
        break;
      }
      default: {
        throw new Error(
          `${cluster} is not a valid Solana cluster option. Choose either 'mainnet-beta', 'devnet' or 'localnet'`
        );
      }
    }
  }

  // check this list of ingredients can build the item
  async checkIngredients(
    itemClass: anchor.web3.PublicKey,
    ingredients: IngredientArg[]
  ): Promise<Recipe[]> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
    });

    for (const ingredient of ingredients) {
      params.append("ingredientMints", ingredient.itemMint.toString());
      params.append("ingredientAmounts", ingredient.amount.toString());
    }

    const response = await fetch(`${this.baseUrl}/checkIngredients?` + params);

    if (response.status === 404) {
      return [];
    }

    const recipes: Recipe[] = await response.json();

    return recipes;
  }

  // use these ingredients to build the item
  async build(
    itemClass: anchor.web3.PublicKey,
    ingredientArgs: IngredientArg[]
  ): Promise<anchor.web3.PublicKey> {
    // find valid recipe with these ingredients
    const buildableRecipes = await this.checkIngredients(
      itemClass,
      ingredientArgs
    );
    if (buildableRecipes.length <= 0) {
      throw new Error(`No Recipes Found`);
    }

    // TODO: probably should have the builder pass in if there's N matching recipes
    const recipe = buildableRecipes[0];
    console.log(
      "building item class: %s from recipe: %s",
      itemClass.toString(),
      JSON.stringify(recipe)
    );

    // start build
    const build = await this.startBuild(itemClass, recipe.recipeIndex);
    console.log("build started: %s", build.toString());

    for (const ingredient of recipe.ingredients) {
      await this.verifyIngredient(
        itemClass,
        ingredient.itemMint,
        ingredient.itemClass
      );

      // add build items
      await this.addIngredient(itemClass, ingredient);
    }

    // if a payment is required, pay it now
    if (recipe.payment !== null) {
      await this.addPayment(build);
    }

    // drive build to completion
    const itemMint = await this.driveBuild(build);

    return itemMint;
  }

  async continueBuild(
    itemClass: anchor.web3.PublicKey,
    ingredientArgs: IngredientArg[]
  ) {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      builder: this.provider.publicKey.toString(),
    });

    // return the current build data
    const response = await fetch(`${this.baseUrl}/build?` + params);

    const body = await errors.handleResponse(response);

    const buildData: Build = JSON.parse(body.buildData);
    const build = new anchor.web3.PublicKey(body.build);

    // if build status is still in progress, check the ingredients we have and add them
    let itemMint: anchor.web3.PublicKey;
    if (buildData.status === BuildStatus.InProgress) {
      // get the matching recipe for this build
      const buildableRecipes = await this.checkIngredients(
        itemClass,
        ingredientArgs
      );
      const recipe = buildableRecipes.find(
        (recipe) => recipe.recipeIndex === buildData.recipeIndex
      );

      // filter out already added ingredients
      const missingIngredients = getMissingIngredients(
        recipe.ingredients,
        buildData
      );

      // add the remaining ingredients
      for (let ingredient of missingIngredients) {
        await this.verifyIngredient(
          itemClass,
          ingredient.itemMint,
          ingredient.itemClass
        );

        await this.addIngredient(itemClass, ingredient);
      }

      // if payment is not paid do that now
      if (!buildData.payment.paid) {
        console.log(build.toString());
        await this.addPayment(build);
      }

      itemMint = await this.driveBuild(build);
    } else {
      itemMint = await this.driveBuild(build);
    }

    return itemMint;
  }

  async cancelBuild(itemClass: anchor.web3.PublicKey) {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      builder: this.provider.publicKey.toString(),
    });

    // fetch the current build data
    const response = await fetch(`${this.baseUrl}/build?` + params);

    const body = await errors.handleResponse(response);

    const buildData: Build = JSON.parse(body.buildData);
    const build = new anchor.web3.PublicKey(body.build);

    // if the build is not in progress then you must continue
    if (buildData.status !== BuildStatus.InProgress) {
      throw new Error(`Build Cannot be cancelled, please call 'continueBuild'`);
    }

    // return any build ingredients that were added
    await this.returnOrConsumeIngredients(build);

    // clean up build accounts
    await this.cleanBuild(build);
  }

  async getBuild(
    itemClass: anchor.web3.PublicKey,
    builder: anchor.web3.PublicKey
  ): Promise<[anchor.web3.PublicKey, Build]> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      builder: builder.toString(),
    });

    // return the current build data
    const response = await fetch(`${this.baseUrl}/build?` + params);

    if (response.status === 400) {
      return [null, null]
    }

    const body = await errors.handleResponse(response);

    const buildData: Build = JSON.parse(body.buildData);
    const build = new anchor.web3.PublicKey(body.build);

    return [build, buildData];
  }

  async getItem(
    itemMint: anchor.web3.PublicKey
  ): Promise<[anchor.web3.PublicKey, ItemV1]> {
    const params = new URLSearchParams({
      itemMint: itemMint.toString(),
    });

    // return the current item data
    const response = await fetch(`${this.baseUrl}/item?` + params);

    if (response.status === 400) {
      return [null, null]
    }

    const body = await errors.handleResponse(response);

    const itemData: ItemV1 = JSON.parse(body.itemData);
    const item = new anchor.web3.PublicKey(body.item);

    return [item, itemData];
  }

  async getItemClass(
    itemClass: anchor.web3.PublicKey,
  ): Promise<ItemClassV1> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
    });

    // return the current build data
    const response = await fetch(`${this.baseUrl}/itemClass?` + params);

    if (response.status === 400) {
      return null
    }

    const body = await errors.handleResponse(response);

    const itemClassData: ItemClassV1 = JSON.parse(body.itemClassData);

    return itemClassData;
  }

  // start the build process for an item class via the recipe
  private async startBuild(
    itemClass: anchor.web3.PublicKey,
    recipeIndex: anchor.BN
  ): Promise<anchor.web3.PublicKey> {
    const builder = this.provider.publicKey.toString();
    console.log("builder: %s", builder);
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      recipeIndex: recipeIndex.toString(),
      builder: builder,
    });

    const response = await fetch(`${this.baseUrl}/startBuild?` + params);

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("startBuildTxSig: %s", txSig);

    return body.build;
  }

  // escrow items from builder to the build pda
  private async addIngredient(
    itemClass: anchor.web3.PublicKey,
    ingredient: Ingredient
  ): Promise<void> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      builder: this.provider.publicKey.toString(),
      payer: this.provider.publicKey.toString(),
      ingredientMint: ingredient.itemMint.toString(),
      ingredientItemClass: ingredient.itemClass.toString(),
      amount: ingredient.amount.toString(),
    });

    const response = await fetch(`${this.baseUrl}/addIngredient?` + params);
    const body = await errors.handleResponse(response);

    // send ingredient to build
    const addIngredientTxSig = await this.send(body.tx);
    console.log("addIngredientTxSig: %s", addIngredientTxSig);
  }

  // TODO: we only support native sol right now
  private async addPayment(build: anchor.web3.PublicKey): Promise<void> {
    console.log("adding payment to build: %s", build.toString());
    const params = new URLSearchParams({
      build: build.toString(),
      builder: this.provider.publicKey.toString(),
    });

    try {
      const response = await fetch(`${this.baseUrl}/addPayment?` + params);

      const body = await errors.handleResponse(response);

      const txSig = await this.send(body.tx);
      console.log("addPaymentTxSig: %s", txSig);
    } catch (e) {
      console.error(e);
    }
  }

  // mark build as complete, contract checks that required ingredients have been escrowed
  private async completeBuild(build: anchor.web3.PublicKey): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    const response = await fetch(`${this.baseUrl}/completeBuild?` + params);

    const body = await errors.handleResponse(response);

    console.log("completeBuildTxSig: %s", body.txSig);
  }

  // the builder will receive the output of the build here
  private async receiveItem(
    build: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    const response = await fetch(`${this.baseUrl}/receiveItem?` + params);

    const body = await errors.handleResponse(response);
    console.log("receiveItemTxSig: %s", body.txSig);

    return body.itemMint;
  }

  // clean up all build artifacts
  private async cleanBuild(build: anchor.web3.PublicKey): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    const response = await fetch(`${this.baseUrl}/cleanBuild?` + params);

    const body = await errors.handleResponse(response);
    console.log("cleanBuildTxSig: %s", body.txSig);

    return body.itemMint;
  }

  // apply the post build effects to each ingredient
  // things like cooldowns and degradation
  private async applyBuildEffects(build: anchor.web3.PublicKey): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    const response = await fetch(`${this.baseUrl}/applyBuildEffect?` + params);

    const body = await errors.handleResponse(response);
    console.log("applyBuildEffectTxSig: %s", body.txSig);
  }

  private async verifyIngredient(
    itemClass: anchor.web3.PublicKey,
    ingredientMint: anchor.web3.PublicKey,
    ingredientItemClass: anchor.web3.PublicKey
  ): Promise<void> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      ingredientMint: ingredientMint.toString(),
      ingredientItemClass: ingredientItemClass.toString(),
      builder: this.provider.publicKey.toString(),
      payer: this.provider.publicKey.toString(),
    });

    const response = await fetch(`${this.baseUrl}/verifyIngredient?` + params);

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("verifyIngredientTxSig: %s", txSig);
  }

  private async returnOrConsumeIngredients(
    build: anchor.web3.PublicKey
  ): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    let done = false;
    while (!done) {
      const response = await fetch(
        `${this.baseUrl}/returnOrConsumeIngredients?` + params
      );

      const body = await errors.handleResponse(response);

      // if done signal is returned, exit
      if (body.done) {
        return;
      }

      console.log("returnOrConsumeIngredientsTxSig: %s", body.txSig);
      done = body.done;
    }
  }

  // drive build to completion, these are all permissionless steps
  private async driveBuild(
    build: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    // complete build
    await this.completeBuild(build);

    // receive item
    const itemMint = await this.receiveItem(build);

    // apply build effects to the ingredients used
    await this.applyBuildEffects(build);

    // return or consume the build ingredients in accordance with the effects
    await this.returnOrConsumeIngredients(build);

    // clean up
    await this.cleanBuild(build);

    return itemMint;
  }

  // sign and send a transaction received from the items api
  private async send(txBase64: string): Promise<string> {
    const tx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));
    const signedTx = await this.provider.wallet.signTransaction(tx);

    const response = await fetch(`${this.baseUrl}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tx: signedTx.serialize().toString("base64") }),
    });

    const body = await errors.handleResponse(response);

    return body.txSig;
  }
}

export interface Recipe {
  itemClass: anchor.web3.PublicKey;
  recipeIndex: anchor.BN;
  payment: Payment | null;
  ingredients: Ingredient[];
}

export interface IngredientArg {
  itemMint: anchor.web3.PublicKey;
  amount: anchor.BN;
}

export interface Ingredient {
  itemMint: anchor.web3.PublicKey;
  itemClass: anchor.web3.PublicKey;
  amount: anchor.BN;
}

export interface Payment {
  treasury: anchor.web3.PublicKey;
  amount: anchor.BN;
}

function getMissingIngredients(
  recipeIngredients: Ingredient[],
  buildData: Build
): Ingredient[] {
  const missingIngredients: Ingredient[] = [];
  for (let currentIngredient of buildData.ingredients) {
    console.log(currentIngredient);

    // if this build ingredient already has escrowed the required amount, we dont need it
    if (
      new anchor.BN(currentIngredient.currentAmount).gte(
        new anchor.BN(currentIngredient.requiredAmount)
      )
    ) {
      continue;
    }

    // find the recipe ingredient which matches the build ingredient required item class
    for (let recipeIngredient of recipeIngredients) {
      if (recipeIngredient.itemClass.equals(currentIngredient.itemClass)) {
        missingIngredients.push(recipeIngredient);
      }
    }
  }

  return missingIngredients;
}
