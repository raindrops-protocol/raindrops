import * as anchor from "@project-serum/anchor";
import * as errors from "./errors";
import { Build, BuildStatus, ItemClassV1, ItemV1 } from "../state/item";
import { fetch } from "cross-fetch";
import { getBuild } from "../utils/pda";
import IsoWebsocket from "isomorphic-ws";

export class Client {
  readonly baseUrl: string;
  readonly wsUrl: string;
  readonly provider: anchor.AnchorProvider;
  readonly rpcUrl: string;
  private apiKey: string;

  constructor(
    provider: anchor.AnchorProvider,
    cluster: string,
    rpcUrl: string,
    apiKey: string
  ) {
    this.provider = provider;
    this.rpcUrl = rpcUrl;
    this.apiKey = apiKey;

    switch (cluster) {
      case "mainnet-beta": {
        //this.baseUrl = "https://api.items.itsboots.xyz"; this points to the old api gateway still in the CDK and cert itself, we will update in a subsequent operation
        this.baseUrl =
          "https://w2badi4dgl.execute-api.us-east-1.amazonaws.com/prod";
        this.wsUrl =
          "wss://7mbqz4vp5e.execute-api.us-east-1.amazonaws.com/main";
        break;
      }
      case "devnet": {
        //this.baseUrl = "https://dev.api.items.itsboots.xyz"; this points to the old api gateway still in the CDK (cert is migrated), we will update in a subsequent operation
        this.baseUrl =
          "https://hwheczmzx7.execute-api.us-east-1.amazonaws.com/prod";
        //this.wsUrl = "wss://dev.ws.items.itsboots.xyz"; this cert is broken
        this.wsUrl =
          "wss://493dq7ya5a.execute-api.us-east-1.amazonaws.com/main";
        break;
      }
      case "localnet": {
        this.baseUrl = "http://localhost:3000";
        this.wsUrl = "ws://localhost:3001";
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

    const response = await fetch(`${this.baseUrl}/checkIngredients?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    if (response.status === 404) {
      return [];
    }

    const recipes: Recipe[] = await response.json();

    return recipes;
  }

  async build(
    itemClass: anchor.web3.PublicKey,
    ingredientArgs: IngredientArg[]
  ): Promise<any> {
    // check ingredients and find a valid recipe for the item class we want to build
    const buildableRecipes = await this.checkIngredients(
      itemClass,
      ingredientArgs
    );
    if (buildableRecipes.length <= 0) {
      console.error("no buildable recipes found");
      throw new Error(`no buildable recipes found`);
    }

    const recipe = buildableRecipes[0];
    if (recipe === undefined) {
      console.error("no buildable recipes found");
      throw new Error(`no buildable recipes found`);
    }

    console.log(
      "building item class: %s from recipe: %s",
      itemClass.toString(),
      JSON.stringify(recipe)
    );

    // get start build tx and sign it
    const serializedTx = await this.startBuild(
      itemClass,
      recipe.recipeIndex,
      ingredientArgs
    );
    const tx = anchor.web3.Transaction.from(
      Buffer.from(serializedTx, "base64")
    );
    const signedTx = await this.provider.wallet.signTransaction(tx);

    // open websocket connection
    // browser check
    const isNode =
      typeof process !== "undefined" && process?.versions?.node != null;
    let socket: any;
    if (isNode) {
      console.log("Node env found");
      socket = new IsoWebsocket(this.wsUrl);
    } else {
      console.log("Client side env found");
      socket = new WebSocket(this.wsUrl);
    }

    const buildRequest = {
      requestType: "build",
      data: {
        ingredients: JSON.stringify(recipe.ingredients),
        startBuildTx: signedTx.serialize().toString("base64"),
        build: getBuild(itemClass, this.provider.publicKey).toString(),
      },
    };

    // on connection open, send the signed start build tx
    socket.onopen = (event) => {
      console.log("socket status:", JSON.stringify(socket));
      console.log("websocket event received: %s", JSON.stringify(event));
      console.log("sending build request");
      socket.send(JSON.stringify({ buildRequest: buildRequest }));
    };

    socket.onclose = (event) => {
      console.log("socket status:", JSON.stringify(socket));
      console.log("close:", JSON.stringify(event));
    };

    socket.onerror = (event) => {
      console.log("socket status:", JSON.stringify(socket));
      console.log("websocket error:", JSON.stringify(event));
    };

    // wait for a response from the websocket api
    const itemMint = await new Promise((resolve, reject) => {
      socket.onmessage = (event) => {
        try {
          console.log("received event: %s", JSON.stringify(event));
          resolve(event.data.toString());
        } catch (e) {
          reject(e);
        }
      };
    });
    console.log("itemMint: %s", itemMint);

    return itemMint;
  }

  async continueBuild(
    itemClass: anchor.web3.PublicKey,
    ingredientArgs: IngredientArg[],
    builder?: anchor.web3.PublicKey
  ) {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      builder: builder.toString(),
    });

    // return the current build data
    const response = await fetch(`${this.baseUrl}/build?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

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
      for (const ingredient of missingIngredients) {
        await this.verifyIngredient(
          this.provider.publicKey,
          itemClass,
          ingredient.itemMint,
          ingredient.itemClass
        );

        await this.addIngredient(
          this.provider.publicKey,
          itemClass,
          ingredient
        );
      }

      // if payment is not paid do that now
      if (buildData.payment !== null) {
        if (!buildData.payment.paid) {
          console.log(build.toString());
          await this.addPayment(build);
        }
      }

      itemMint = await this.driveBuild(build);
    } else {
      itemMint = await this.driveBuild(build);
    }

    return itemMint;
  }

  async cancelBuild(
    itemClass: anchor.web3.PublicKey,
    builder: anchor.web3.PublicKey
  ) {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      builder: builder.toString(),
    });

    // fetch the current build data
    const response = await fetch(`${this.baseUrl}/build?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    const body = await errors.handleResponse(response);

    const buildData: Build = JSON.parse(body.buildData);
    const build = new anchor.web3.PublicKey(body.build);

    // if the build is not in progress then you must continue
    if (buildData.status !== BuildStatus.InProgress) {
      throw new Error(`Build Cannot be cancelled, please call 'continueBuild'`);
    }

    // return any build ingredients that were added
    await this.returnOrDestroyIngredients(build);

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
    const response = await fetch(`${this.baseUrl}/build?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    if (response.status === 400) {
      return [null, null];
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
    const response = await fetch(`${this.baseUrl}/item?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    if (response.status === 400) {
      return [null, null];
    }

    const body = await errors.handleResponse(response);

    const itemData: ItemV1 = JSON.parse(body.itemData);
    const item = new anchor.web3.PublicKey(body.item);

    return [item, itemData];
  }

  async getItemClass(itemClass: anchor.web3.PublicKey): Promise<ItemClassV1> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
    });

    // return the current build data
    const response = await fetch(`${this.baseUrl}/itemClass?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    if (response.status === 400) {
      return null;
    }

    const body = await errors.handleResponse(response);

    const itemClassData: ItemClassV1 = JSON.parse(body.itemClassData);

    return itemClassData;
  }

  async getRecipe(recipe: anchor.web3.PublicKey): Promise<Recipe> {
    const params = new URLSearchParams({
      recipe: recipe.toString(),
    });

    // return the current build data
    const response = await fetch(`${this.baseUrl}/recipe?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    if (response.status === 400) {
      return null;
    }

    const body = await errors.handleResponse(response);

    const recipeData: Recipe = JSON.parse(body.recipeData);

    return recipeData;
  }

  async startBuild(
    itemClass: anchor.web3.PublicKey,
    recipeIndex: anchor.BN,
    ingredientArgs: IngredientArg[]
  ): Promise<string> {
    const startBuildTxResponse = await fetch(`${this.baseUrl}/startBuild`, {
      method: "POST",
      headers: createHeaders(this.rpcUrl, this.apiKey),
      body: JSON.stringify({
        itemClass: itemClass.toString(),
        builder: this.provider.wallet.publicKey.toString(),
        recipeIndex: recipeIndex.toString(),
        ingredientArgs: JSON.stringify(ingredientArgs),
      }),
    });

    const body = await errors.handleResponse(startBuildTxResponse);

    return body.tx;
  }

  // escrow items from builder to the build pda
  async addIngredient(
    builder: anchor.web3.PublicKey,
    itemClass: anchor.web3.PublicKey,
    ingredient: Ingredient
  ): Promise<void> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      builder: builder.toString(),
      payer: this.provider.publicKey.toString(),
      ingredientMint: ingredient.itemMint.toString(),
      ingredientItemClass: ingredient.itemClass.toString(),
      amount: ingredient.amount.toString(),
    });

    const response = await fetch(`${this.baseUrl}/addIngredient?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });
    const body = await errors.handleResponse(response);

    // send ingredient to build
    const addIngredientTxSig = await this.send(body.tx);
    console.log("addIngredientTxSig: %s", addIngredientTxSig);
  }

  // TODO: we only support native sol right now
  async addPayment(build: anchor.web3.PublicKey): Promise<void> {
    console.log("adding payment to build: %s", build.toString());
    const params = new URLSearchParams({
      build: build.toString(),
      builder: this.provider.publicKey.toString(),
    });

    try {
      const response = await fetch(`${this.baseUrl}/addPayment?` + params, {
        headers: createHeaders(this.rpcUrl, this.apiKey),
      });

      const body = await errors.handleResponse(response);

      const txSig = await this.send(body.tx);
      console.log("addPaymentTxSig: %s", txSig);
    } catch (e) {
      console.error(e);
    }
  }

  // mark build as complete, contract checks that required ingredients have been escrowed
  async completeBuild(build: anchor.web3.PublicKey): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    const response = await fetch(`${this.baseUrl}/completeBuild?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    const body = await errors.handleResponse(response);

    console.log("completeBuildTxSig: %s", body.txSig);
  }

  // the builder will receive the output of the build here
  async receiveItem(
    build: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    const response = await fetch(`${this.baseUrl}/receiveItem?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    const body = await errors.handleResponse(response);
    console.log("receiveItemTxSig: %s", body.txSig);

    return body.itemMint;
  }

  // clean up all build artifacts
  async cleanBuild(build: anchor.web3.PublicKey): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    const response = await fetch(`${this.baseUrl}/cleanBuild?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    const body = await errors.handleResponse(response);
    console.log("cleanBuildTxSig: %s", body.txSig);

    return body.itemMint;
  }

  // apply the post build effects to each ingredient
  // things like cooldowns and degradation
  async applyBuildEffects(build: anchor.web3.PublicKey): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    const response = await fetch(`${this.baseUrl}/applyBuildEffect?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    const body = await errors.handleResponse(response);
    console.log("applyBuildEffectTxSig: %s", body.txSig);
  }

  async verifyIngredient(
    builder: anchor.web3.PublicKey,
    itemClass: anchor.web3.PublicKey,
    ingredientMint: anchor.web3.PublicKey,
    ingredientItemClass: anchor.web3.PublicKey
  ): Promise<void> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      ingredientMint: ingredientMint.toString(),
      ingredientItemClass: ingredientItemClass.toString(),
      builder: builder.toString(),
      payer: this.provider.publicKey.toString(),
    });

    const response = await fetch(`${this.baseUrl}/verifyIngredient?` + params, {
      headers: createHeaders(this.rpcUrl, this.apiKey),
    });

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("verifyIngredientTxSig: %s", txSig);
  }

  async returnOrDestroyIngredients(
    build: anchor.web3.PublicKey
  ): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    let done = false;
    while (!done) {
      const response = await fetch(
        `${this.baseUrl}/returnOrDestroyIngredients?` + params,
        {
          headers: createHeaders(this.rpcUrl, this.apiKey),
        }
      );

      const body = await errors.handleResponse(response);

      // if done signal is returned, exit
      if (body.done) {
        return;
      }

      console.log("returnOrDestroyIngredientsTxSig: %s", body.txSig);
      done = body.done;
    }
  }

  async endBuild(build: anchor.web3.PublicKey): Promise<void> {
    // apply build effects to the ingredients used
    await this.applyBuildEffects(build);

    // return or destroy the build ingredients in accordance with the effects
    await this.returnOrDestroyIngredients(build);

    // clean up
    await this.cleanBuild(build);
  }

  // drive build to completion, these are all permissionless steps
  async driveBuild(
    build: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    // complete build
    await this.completeBuild(build);

    // receive item
    const itemMint = await this.receiveItem(build);

    // apply build effects to the ingredients used
    await this.applyBuildEffects(build);

    // return or destroy the build ingredients in accordance with the effects
    await this.returnOrDestroyIngredients(build);

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
      headers: createHeaders(this.rpcUrl, this.apiKey),
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
  for (const currentIngredient of buildData.ingredients) {
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
    for (const recipeIngredient of recipeIngredients) {
      if (recipeIngredient.itemClass.equals(currentIngredient.itemClass)) {
        missingIngredients.push(recipeIngredient);
      }
    }
  }

  return missingIngredients;
}

function createHeaders(rpcUrl: string, apiKey: string) {
  const headers = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "x-rpc-url": rpcUrl,
  };

  return headers;
}
