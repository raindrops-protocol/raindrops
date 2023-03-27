import * as anchor from "@project-serum/anchor";
import * as errors from "./errors";
import { Build, BuildMaterialData, BuildStatus } from "../state/item";
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

  // check this list of materials can build the item
  async checkMaterials(
    itemClass: anchor.web3.PublicKey,
    materials: MaterialArg[]
  ): Promise<Schema[]> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
    });

    for (const material of materials) {
      params.append("materialMints", material.itemMint.toString());
      params.append("materialAmounts", material.amount.toString());
    }

    const response = await fetch(`${this.baseUrl}/checkMaterials?` + params);

    if (response.status === 404) {
      return [];
    }

    //if (response.status !== 200 && response.status !== 304) {
    //  return [];
    //}

    const schemas: Schema[] = await response.json();

    return schemas;
  }

  // use these materials to build the item
  async build(
    itemClass: anchor.web3.PublicKey,
    materialArgs: MaterialArg[]
  ): Promise<anchor.web3.PublicKey> {
    // find valid schema with these materials
    const buildableSchemas = await this.checkMaterials(itemClass, materialArgs);
    if (buildableSchemas.length <= 0) {
      throw new Error(`No Schemas Found`);
    }

    // TODO: probably should have the builder pass in if there's N matching schemas
    const schema = buildableSchemas[0];
    console.log(
      "building item class: %s from schema: %s",
      itemClass.toString(),
      JSON.stringify(schema)
    );

    // start build
    const build = await this.startBuild(itemClass, schema.schemaIndex);
    console.log("build started: %s", build.toString());

    for (const material of schema.materials) {
      await this.verifyBuildMaterial(
        itemClass,
        material.itemMint,
        material.itemClass
      );

      // add build items
      await this.addBuildMaterial(itemClass, material);
    }

    // if a payment is required, pay it now
    if (schema.payment !== null) {
      await this.addPayment(build);
    }

    // drive build to completion
    const itemMint = await this.driveBuild(build);

    return itemMint;
  }

  async continueBuild(
    itemClass: anchor.web3.PublicKey,
    materialArgs: MaterialArg[]
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

    // if build status is still in progress, check the materials we have and add them
    let itemMint: anchor.web3.PublicKey;
    if (buildData.status === BuildStatus.InProgress) {

      // get the matching schema for this build
      const buildableSchemas = await this.checkMaterials(itemClass, materialArgs)
      const schema = buildableSchemas.find(schema => schema.schemaIndex === buildData.schemaIndex);

      // filter out already added materials
      const missingMaterials = getMissingBuildMaterials(schema.materials, buildData);

      // add the remaining materials
      for (let material of missingMaterials) {
        await this.verifyBuildMaterial(itemClass, material.itemMint, material.itemClass);

        await this.addBuildMaterial(itemClass, material);
      }

      // if payment is not paid do that now
      if (!buildData.payment.paid) {
        console.log(build.toString());
        await this.addPayment(build);
      }

      itemMint = await this.driveBuild(build)
    } else {
      itemMint = await this.driveBuild(build);
    }

    return itemMint
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
    };

    // return any build materials that were added
    await this.returnOrConsumeMaterials(build)

    // clean up build accounts
    await this.cleanBuild(build)
  }

  // start the build process for an item class via the schema
  private async startBuild(
    itemClass: anchor.web3.PublicKey,
    schemaIndex: anchor.BN
  ): Promise<anchor.web3.PublicKey> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      schemaIndex: schemaIndex.toString(),
      builder: this.provider.publicKey.toString(),
    });

    try {
      const response = await fetch(`${this.baseUrl}/startBuild?` + params);
      const body = await errors.handleResponse(response);
      const txSig = await this.send(body.tx);
      console.log("startBuildTxSig: %s", txSig);
      return body.build;
    } catch(e) {
      console.error(e)
    } 
  }

  // escrow items from builder to the build pda
  private async addBuildMaterial(
    itemClass: anchor.web3.PublicKey,
    material: Material
  ): Promise<void> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      builder: this.provider.publicKey.toString(),
      materialMint: material.itemMint.toString(),
      materialItemClass: material.itemClass.toString(),
      amount: material.amount.toString(),
    });

    const response = await fetch(`${this.baseUrl}/addBuildMaterial?` + params);
    const body = await errors.handleResponse(response);

    // send material to build
    const addBuildMaterialTxSig = await this.send(body.tx);
    console.log("addBuildMaterialTxSig: %s", addBuildMaterialTxSig);
  }

  // TODO: we only support native sol right now
  private async addPayment(build: anchor.web3.PublicKey): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
      builder: this.provider.publicKey.toString(),
    });

    const response = await fetch(`${this.baseUrl}/addPayment?` + params);

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("addPaymentTxSig: %s", txSig);
  }

  // mark build as complete, contract checks that required materials have been escrowed
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

  // apply the post build effects to each material
  // things like cooldowns and degredation
  private async applyBuildEffects(build: anchor.web3.PublicKey): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    const response = await fetch(`${this.baseUrl}/applyBuildEffect?` + params);

    const body = await errors.handleResponse(response);
    console.log("applyBuildEffectTxSig: %s", body.txSig);
  }

  private async verifyBuildMaterial(
    itemClass: anchor.web3.PublicKey,
    materialMint: anchor.web3.PublicKey,
    materialItemClass: anchor.web3.PublicKey
  ): Promise<void> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      materialMint: materialMint.toString(),
      materialItemClass: materialItemClass.toString(),
      builder: this.provider.publicKey.toString(),
    });

    const response = await fetch(
      `${this.baseUrl}/verifyBuildMaterial?` + params
    );

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("verifyBuildMaterialTxSig: %s", txSig);
  }

  private async returnOrConsumeMaterials(
    build: anchor.web3.PublicKey
  ): Promise<void> {
    const params = new URLSearchParams({
      build: build.toString(),
    });

    let done = false;
    while (!done) {
      const response = await fetch(
        `${this.baseUrl}/returnOrConsumeMaterials?` + params
      );

      const body = await errors.handleResponse(response);

      // if done signal is returned, exit
      if (body.done) {
        return;
      }

      console.log("returnOrConsumeMaterialsTxSig: %s", body.txSig);
      done = body.done;
    }
  }

  // drive build to completion, these are all permissionless steps
  private async driveBuild(build: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> {
    // complete build
    await this.completeBuild(build);

    // receive item
    const itemMint = await this.receiveItem(build);

    // apply build effects to the materials used
    await this.applyBuildEffects(build);

    // return or consume the build materials in accordance with the effects
    await this.returnOrConsumeMaterials(build);

    // clean up
    await this.cleanBuild(build);

    return itemMint; 
  }

  // sign and send a transaction received from the items api
  private async send(txBase64: string): Promise<string> {
    try {
      const tx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));
      await this.provider.wallet.signTransaction(tx);

      const response = await fetch(`${this.baseUrl}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tx: tx.serialize().toString("base64") }),
      });

      const body = await errors.handleResponse(response);

      return body.txSig;
    } catch (e) {
      console.error(e)
    } 
  }
}

export interface Schema {
  itemClass: anchor.web3.PublicKey;
  schemaIndex: anchor.BN;
  payment: Payment | null;
  materials: Material[];
}

export interface MaterialArg {
  itemMint: anchor.web3.PublicKey;
  amount: anchor.BN;
}

export interface Material {
  itemMint: anchor.web3.PublicKey;
  itemClass: anchor.web3.PublicKey;
  amount: anchor.BN;
}

export interface Payment {
  treasury: anchor.web3.PublicKey;
  amount: anchor.BN;
}

function getMissingBuildMaterials(schemaMaterials: Material[], buildData: Build): Material[] {
  const missingMaterials: Material[] = [];
  for (let currentBuildMaterial of buildData.materials) {
    console.log(currentBuildMaterial);

    // if this build material already has escrowed the required amount, we dont need it
    if (new anchor.BN(currentBuildMaterial.currentAmount).gte(new anchor.BN(currentBuildMaterial.requiredAmount))) {
      continue
    }

    // find the schema material which matches the build material required item class
    for (let schemaMaterial of schemaMaterials) {
      if (schemaMaterial.itemClass.equals(currentBuildMaterial.itemClass)) {
        missingMaterials.push(schemaMaterial);
      }
    }
  }

  return missingMaterials
}
