import * as anchor from "@project-serum/anchor";
import * as errors from "./errors";

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
        this.baseUrl = "https://items-dev.raindrops.xyz";
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

  // for the given item class, return all of the possible build options for the builder
  // BuildOptions can be used to build the client side selection UI flow
  async getBuildOptions(
    itemClass: anchor.web3.PublicKey
  ): Promise<BuildOptions> {
    let params = new URLSearchParams({
      itemClass: itemClass.toString(),
      builder: this.provider.publicKey.toString(),
    });

    const response = await fetch(`${this.baseUrl}/buildOptions?` + params);

    return await errors.handleResponse(response);
  }

  // after selecting a schema, begin the transaction flow
  async build(schema: Schema): Promise<anchor.web3.PublicKey> {
    // start build
    const build = await this.startBuild(schema.address);

    // add build items
    await this.addBuildMaterials(build, schema.materials);

    // complete build
    await this.completeBuild(build);

    // receive item
    const itemMint = await this.receiveItem(build);

    // clean up
    await this.closeBuild(build);

    return itemMint;
  }

  // start the build process for an item class via the schema
  private async startBuild(
    schema: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    let params = new URLSearchParams({
      schema: schema.toString(),
      builder: this.provider.publicKey.toString(),
    });

    const response = await fetch(`${this.baseUrl}/startBuild?` + params);

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("startBuildTxSig: %s", txSig);

    return body.build;
  }

  // escrow items from builder to the build pda
  private async addBuildMaterials(
    build: anchor.web3.PublicKey,
    materials: Material[]
  ): Promise<void> {
    for (let material of materials) {
      for (let materialMint of material.itemMints) {
        let params = new URLSearchParams({
          build: build.toString(),
          builder: this.provider.publicKey.toString(),
          materialMint: materialMint.toString(),
          materialItemClass: material.itemClass.toString(),
        });

        const response = await fetch(
          `${this.baseUrl}/addBuildMaterial?` + params
        );
        const body = await errors.handleResponse(response);

        // first we send the verify tx
        const verifyBuildItemTxSig = await this.send(body.txns[0]);
        console.log("verifyBuildItemTxSig: %s", verifyBuildItemTxSig);

        // escrow happens here
        const addBuildMaterialTxSig = await this.send(body.txns[1]);
        console.log("addBuildMaterialTxSig: %s", addBuildMaterialTxSig);
      }
    }
  }

  // mark build as complete, contract checks that required materials have been escrowed
  private async completeBuild(build: anchor.web3.PublicKey): Promise<void> {
    let params = new URLSearchParams({
      build: build.toString(),
      builder: this.provider.publicKey.toString(),
    });

    const response = await fetch(`${this.baseUrl}/completeBuild?` + params);

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("completeBuildTxSig: %s", txSig);
  }

  // the builder will receive the output of the build here
  private async receiveItem(
    build: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    let params = new URLSearchParams({
      build: build.toString(),
      builder: this.provider.publicKey.toString(),
    });

    const response = await fetch(`${this.baseUrl}/receiveItem?` + params);

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("receiveItemTxSig: %s", txSig);

    return body.itemMint;
  }

  // begin process of closing the build accounts
  private async closeBuild(build: anchor.web3.PublicKey): Promise<void> {
    let params = new URLSearchParams({
      build: build.toString(),
      payer: this.provider.publicKey.toString(),
    });

    await this.applyBuildEffects(build);

    const response = await fetch(`${this.baseUrl}/closeBuild?` + params);

    const body = await errors.handleResponse(response);

    const txSig = await this.send(body.tx);
    console.log("closeBuildTxSig: %s", txSig);

    return body.itemMint;
  }

  // apply the post build effects to each material
  // things like cooldowns and degredation
  private async applyBuildEffects(build: anchor.web3.PublicKey): Promise<void> {
    let params = new URLSearchParams({
      build: build.toString(),
      payer: this.provider.publicKey.toString(),
    });

    const response = await fetch(`${this.baseUrl}/applyBuildEffects?` + params);

    const body = await errors.handleResponse(response);

    // these transactions can happen concurrently
    const txPromises: Promise<any>[] = [];
    for (let tx of body.txns) {
      const txPromise = this.send(tx);
      txPromises.push(txPromise);
    }
    await Promise.all(txPromises);

    return body.itemMint;
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

export interface BuildOptions {
  itemClass: anchor.web3.PublicKey;
  schemas: Schema[];
}

export interface Schema {
  address: anchor.web3.PublicKey;
  schemaIndex: anchor.BN;
  itemClass: anchor.web3.PublicKey;
  materials: Material[];
}

export interface Material {
  itemClass: anchor.web3.PublicKey;
  itemMints: anchor.web3.PublicKey[];
  requiredAmount: anchor.BN;
}
