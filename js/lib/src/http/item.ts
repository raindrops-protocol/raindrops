import * as anchor from "@project-serum/anchor";
import * as errors from "./errors";
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

    if (response.status !== 200) {
      return [];
    }

    const buildableSchemas: Schema[] = await response.json();

    return buildableSchemas;
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
    if (schema.payment) {
      await this.addPayment(build);
    }

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

  // start the build process for an item class via the schema
  private async startBuild(
    itemClass: anchor.web3.PublicKey,
    schemaIndex: number
  ): Promise<anchor.web3.PublicKey> {
    const params = new URLSearchParams({
      itemClass: itemClass.toString(),
      schemaIndex: schemaIndex.toString(),
      builder: this.provider.publicKey.toString(),
    });

    const response = await fetch(`${this.baseUrl}/startBuild?` + params);

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("startBuildTxSig: %s", txSig);

    return body.build;
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

  // sign and send a transaction received from the items api
  private async send(txBase64: string): Promise<string> {
    const tx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));
    await this.provider.wallet.signTransaction(tx);

    const response = await fetch(`${this.baseUrl}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tx: tx.serialize().toString("base64") }),
    });

    const body = await errors.handleResponse(response);

    return body.txSig;
  }
}

export interface Schema {
  itemClass: anchor.web3.PublicKey;
  schemaIndex: number;
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
