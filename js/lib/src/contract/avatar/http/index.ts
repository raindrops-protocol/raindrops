import * as anchor from "@project-serum/anchor";
import fetch from "cross-fetch";
import { AvatarRpc } from "../";
import { Variant, VariantMetadata } from "../rpc";
import IsoWebsocket from "isomorphic-ws";
import { plainToClass } from "class-transformer";

const TIMEOUT_MS = 300000; // 5min

export class AvatarClient {
  readonly baseUrl: string;
  readonly wsUrl: string;
  readonly provider: anchor.AnchorProvider;
  private apiKey: string;

  constructor(
    provider: anchor.AnchorProvider,
    cluster: string,
    apiKey: string
  ) {
    this.provider = provider;
    this.apiKey = apiKey;

    switch (cluster) {
      case "mainnet-beta": {
        this.baseUrl = "https://kqgbsx2z0h.execute-api.us-east-1.amazonaws.com/prod";
        this.wsUrl = "wss://gxccwmjxba.execute-api.us-east-1.amazonaws.com/main";
        break;
      }
      case "devnet": {
        this.baseUrl =
          "https://uzoro7sal5.execute-api.us-east-1.amazonaws.com/prod";
        this.wsUrl =
          "wss://ad1zl1bcf9.execute-api.us-east-1.amazonaws.com/main";
        break;
      }
      case "localnet": {
        this.baseUrl = "http://localhost:4000";
        this.wsUrl = "ws://localhost:4001";
        break;
      }
      default: {
        throw new Error(
          `${cluster} is not a valid Solana cluster option. Choose either 'mainnet-beta', 'devnet' or 'localnet'`
        );
      }
    }
  }

  private async send(txBase64: string, txName: string): Promise<string> {
    const tx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));
    const signedTx = await this.provider.wallet.signTransaction(tx);

    const response = await fetch(`${this.baseUrl}/${txName}`, {
      method: "POST",
      headers: createHeaders(this.apiKey),
      body: JSON.stringify({ tx: signedTx.serialize().toString("base64") }),
    });

    const body = await handleResponse(response);

    return body.txSig;
  }

  async createAvatarClass(
    avatarClassMint: anchor.web3.PublicKey,
    attributeMetadata: AvatarRpc.AttributeMetadata[],
    variantMetadata: AvatarRpc.VariantMetadata[],
    globalRenderingConfigUri: string,
    remoteSignerLambdaArn: string
  ): Promise<[anchor.web3.PublicKey, anchor.web3.PublicKey]> {
    const getTxResponse = await fetch(`${this.baseUrl}/createAvatarClass`, {
      method: "POST",
      headers: createHeaders(this.apiKey),
      body: JSON.stringify({
        mint: avatarClassMint,
        authority: this.provider.wallet.publicKey.toString(),
        globalRenderingConfigUri: globalRenderingConfigUri,
        attributeMetadata: attributeMetadata,
        variantMetadata: variantMetadata,
      }),
    });

    const getTxBody = await handleResponse(getTxResponse);

    const tx = anchor.web3.Transaction.from(
      Buffer.from(getTxBody.tx, "base64")
    );
    const signedTx = await this.provider.wallet.signTransaction(tx);

    const postResponse = await fetch(`${this.baseUrl}/sendCreateAvatarClass`, {
      method: "POST",
      headers: createHeaders(this.apiKey),
      body: JSON.stringify({
        tx: signedTx.serialize().toString("base64"),
        remoteSignerLambdaArn: remoteSignerLambdaArn,
      }),
    });

    const postBody = await handleResponse(postResponse);

    return [
      new anchor.web3.PublicKey(getTxBody.avatarClass),
      new anchor.web3.PublicKey(postBody.avatarClassStorageOwner),
    ];
  }

  async createAvatar(
    avatarClass: anchor.web3.PublicKey,
    avatarMint: anchor.web3.PublicKey,
    variants: AvatarRpc.Variant[]
  ): Promise<anchor.web3.PublicKey> {
    const getTxResponse = await fetch(`${this.baseUrl}/createAvatar`, {
      method: "POST",
      headers: createHeaders(this.apiKey),
      body: JSON.stringify({
        mint: avatarMint,
        avatarClass: avatarClass,
        authority: this.provider.wallet.publicKey.toString(),
        variants: variants,
      }),
    });

    const body = await handleResponse(getTxResponse);

    const txSig = await this.send(body.tx, "sendCreateAvatar");
    console.log("createAvatarTxSig: %s", txSig);

    return new anchor.web3.PublicKey(body.avatar);
  }

  async createTrait(
    avatarClass: anchor.web3.PublicKey,
    traitMint: anchor.web3.PublicKey,
    componentUri: string,
    attributeIds: number[],
    traitStatus: AvatarRpc.TraitStatus,
    variantMetadata: VariantMetadata[],
    equipPaymentDetails?: AvatarRpc.PaymentDetails,
    removePaymentDetails?: AvatarRpc.PaymentDetails
  ): Promise<anchor.web3.PublicKey> {
    const getTxResponse = await fetch(`${this.baseUrl}/createTrait`, {
      method: "POST",
      headers: createHeaders(this.apiKey),
      body: JSON.stringify({
        avatarClass: avatarClass,
        authority: this.provider.wallet.publicKey.toString(),
        traitMint: traitMint,
        componentUri: componentUri,
        attributeIds: attributeIds,
        traitStatus: traitStatus,
        variantMetadata: variantMetadata,
        equipPaymentDetails: equipPaymentDetails,
        removePaymentDetails: removePaymentDetails,
      }),
    });

    const body = await handleResponse(getTxResponse);

    const txSig = await this.send(body.tx, "sendCreateTrait");
    console.log("createTraitTxSig: %s", txSig);

    return new anchor.web3.PublicKey(body.trait);
  }

  async equipTrait(
    avatar: anchor.web3.PublicKey,
    traitMint: anchor.web3.PublicKey
  ) {
    const params = new URLSearchParams({
      avatar: avatar.toString(),
      authority: this.provider.wallet.publicKey.toString(),
      traitMint: traitMint.toString(),
    });

    const response = await fetch(`${this.baseUrl}/equipTrait?` + params);

    const body = await handleResponse(response);

    const txSig = await this.send(body.tx, "equipTrait");
    console.log("equipTraitTxSig: %s", txSig);
  }

  async removeTrait(
    avatar: anchor.web3.PublicKey,
    traitMint: anchor.web3.PublicKey
  ) {
    const params = new URLSearchParams({
      avatar: avatar.toString(),
      authority: this.provider.wallet.publicKey.toString(),
      traitMint: traitMint.toString(),
    });

    const response = await fetch(`${this.baseUrl}/removeTrait?` + params, {
      headers: createHeaders(this.apiKey),
    });

    const body = await handleResponse(response);

    const txSig = await this.send(body.tx, "removeTrait");
    console.log("removeTraitTxSig: %s", txSig);
  }

  async beginUpdate(
    avatar: anchor.web3.PublicKey,
    updates: BeginUpdateRequest[]
  ): Promise<string> {
    // create beginUpdate txn
    const response = await fetch(`${this.baseUrl}/beginUpdate`, {
      method: "POST",
      headers: createHeaders(this.apiKey),
      body: JSON.stringify({
        avatar: avatar,
        updates: updates,
      }),
    });

    // sign and reserialize all txns
    const body = await handleResponse(response);
    const beginUpdateRestResponse: BeginUpdateRestResponse[] = JSON.parse(
      body.response
    );
    for (const res of beginUpdateRestResponse) {
      // sign the tx
      const tx = anchor.web3.Transaction.from(Buffer.from(res.tx, "base64"));
      const signedTx = await this.provider.wallet.signTransaction(tx);
      res.tx = signedTx.serialize().toString("base64");
    }

    // open websocket connection
    // browser check
    let socket: any;
    const isNode =
      typeof process !== "undefined" && process?.versions?.node != null;
    if (isNode) {
      console.log("Node env");
      socket = new IsoWebsocket(this.wsUrl);
    } else {
      console.log("Client side env");
      socket = new WebSocket(this.wsUrl);
    }

    const request: AvatarRequest = {
      metadata: {
        requestType: "update",
        avatar: avatar,
      },
      data: beginUpdateRestResponse,
    };

    // on connection open, send the signed beginUpdate tx
    socket.onopen = (_event) => {
      const requestStr = JSON.stringify({ request: request });
      console.log("sending update request: %s", requestStr);
      socket.send(JSON.stringify({ request: requestStr }));
    };

    // wait for a response from the websocket api
    const finalImage = await new Promise((resolve, reject) => {
      // Set up the timeout to reject the promise
      const timeout = setTimeout(() => {
        reject(new Error("Timeout reached"));
      }, TIMEOUT_MS);

      socket.onmessage = (event) => {
        try {
          clearTimeout(timeout); // Clear the timeout when the message is received
          socket.close();
          const finalImage = {
            imageUrl: event.data.toString(),
          };
          resolve(JSON.stringify(finalImage));
        } catch (e) {
          reject(e);
        }
      };
    });
    console.log("update and render complete");

    return finalImage as string;
  }

  async getAvatarClass(
    avatarClass: anchor.web3.PublicKey
  ): Promise<AvatarRpc.AvatarClass> {
    const params = new URLSearchParams({
      avatarClass: avatarClass.toString(),
    });

    const response = await fetch(`${this.baseUrl}/avatarClass?` + params, {
      headers: createHeaders(this.apiKey),
    });

    const body = await handleResponse(response);

    const avatarClassDataObj: AvatarRpc.AvatarClass = JSON.parse(
      body.avatarClass
    );
    const avatarClassData = plainToClass(
      AvatarRpc.AvatarClass,
      avatarClassDataObj
    );

    return avatarClassData;
  }

  async getAvatar(avatar: anchor.web3.PublicKey): Promise<AvatarRpc.Avatar> {
    const params = new URLSearchParams({
      avatar: avatar.toString(),
    });

    const response = await fetch(`${this.baseUrl}/avatar?` + params, {
      headers: createHeaders(this.apiKey),
    });

    const body = await handleResponse(response);

    const avatarDataObj: AvatarRpc.Avatar = JSON.parse(body.avatar);
    const avatarData = plainToClass(AvatarRpc.Avatar, avatarDataObj);

    return avatarData;
  }

  async getTrait(trait: anchor.web3.PublicKey): Promise<AvatarRpc.Trait> {
    const params = new URLSearchParams({
      trait: trait.toString(),
    });

    const response = await fetch(`${this.baseUrl}/trait?` + params, {
      headers: createHeaders(this.apiKey),
    });

    const body = await handleResponse(response);

    const traitDataObj: AvatarRpc.Trait = JSON.parse(body.trait);

    // convert the underlying payment methods into the class instance
    if (traitDataObj.equipPaymentDetails !== null) {
      const paymentMethodData = plainToClass(
        AvatarRpc.PaymentMethod,
        traitDataObj.equipPaymentDetails.paymentMethodData
      );
      traitDataObj.equipPaymentDetails.paymentMethodData = paymentMethodData;
    }

    if (traitDataObj.removePaymentDetails !== null) {
      const paymentMethodData = plainToClass(
        AvatarRpc.PaymentMethod,
        traitDataObj.removePaymentDetails.paymentMethodData
      );
      traitDataObj.removePaymentDetails.paymentMethodData = paymentMethodData;
    }

    const traitData = plainToClass(AvatarRpc.Trait, traitDataObj);

    return traitData;
  }

  async getUpdateState(
    updateState: anchor.web3.PublicKey
  ): Promise<AvatarRpc.UpdateState> {
    const params = new URLSearchParams({
      updateState: updateState.toString(),
    });

    const response = await fetch(`${this.baseUrl}/updateState?` + params, {
      headers: createHeaders(this.apiKey),
    });

    const body = await handleResponse(response);

    const updateStateDataObj: AvatarRpc.UpdateState = JSON.parse(
      body.updateState
    );
    const updateStateData = plainToClass(
      AvatarRpc.UpdateState,
      updateStateDataObj
    );

    return updateStateData;
  }

  async getPaymentMethod(
    paymentMethod: anchor.web3.PublicKey
  ): Promise<AvatarRpc.PaymentMethod> {
    const params = new URLSearchParams({
      paymentMethod: paymentMethod.toString(),
    });

    const response = await fetch(`${this.baseUrl}/paymentMethod?` + params, {
      headers: createHeaders(this.apiKey),
    });

    const body = await handleResponse(response);

    const paymentMethodDataObj: AvatarRpc.PaymentMethod = JSON.parse(
      body.paymentMethod
    );
    const paymentMethodData = plainToClass(
      AvatarRpc.PaymentMethod,
      paymentMethodDataObj
    );

    return paymentMethodData;
  }

  async render(avatar: anchor.web3.PublicKey): Promise<any> {
    // open websocket connection
    // browser check
    let socket: any;
    const isNode =
      typeof process !== "undefined" && process?.versions?.node != null;
    if (isNode) {
      console.log("Node env");
      socket = new IsoWebsocket(this.wsUrl);
    } else {
      console.log("Client side env");
      socket = new WebSocket(this.wsUrl);
    }

    const request: AvatarRequest = {
      metadata: {
        requestType: "render",
        avatar: avatar,
      },
      data: null,
    };

    // on connection open, send the signed render tx
    socket.onopen = (_event) => {
      const requestStr = JSON.stringify({ request: request });
      console.log("sending render request: %s", requestStr);
      socket.send(JSON.stringify({ request: requestStr }));
    };

    // wait for a response from the websocket api
    const finalImage = await new Promise((resolve, reject) => {
      // Set up the timeout to reject the promise
      const timeout = setTimeout(() => {
        reject(new Error("Timeout reached"));
      }, TIMEOUT_MS);

      socket.onmessage = (event) => {
        try {
          clearTimeout(timeout); // Clear the timeout when the message is received
          socket.close();
          const finalImage = {
            imageUrl: event.data.toString(),
          };
          resolve(JSON.stringify(finalImage));
        } catch (e) {
          reject(e);
        }
      };
    });
    console.log("render complete");

    return finalImage;
  }

  async preview(
    avatar: anchor.web3.PublicKey,
    traitMintOverrides: anchor.web3.PublicKey[],
    variantOverrides: Variant[]
  ): Promise<any> {
    const traitOverridesStr: string[] = [];
    for (const traitOverride of traitMintOverrides) {
      traitOverridesStr.push(traitOverride.toString());
    }

    // open websocket connection
    // browser check
    let socket: any;
    const isNode =
      typeof process !== "undefined" && process?.versions?.node != null;
    if (isNode) {
      console.log("Node env");
      socket = new IsoWebsocket(this.wsUrl);
    } else {
      console.log("Client side env");
      socket = new WebSocket(this.wsUrl);
    }

    const request: AvatarRequest = {
      metadata: {
        requestType: "preview",
        avatar: avatar,
      },
      data: {
        traitOverrides: JSON.stringify(traitOverridesStr),
        variantOverrides: JSON.stringify(variantOverrides),
      },
    };

    // on connection open, send the signed render tx
    socket.onopen = (_event) => {
      const requestStr = JSON.stringify({ request: request });
      console.log("sending render preview request: %s", requestStr);
      socket.send(JSON.stringify({ request: requestStr }));
    };

    // wait for a response from the websocket api
    const previewImage = await new Promise((resolve, reject) => {
      // Set up the timeout to reject the promise
      const timeout = setTimeout(() => {
        reject(new Error("Timeout reached"));
      }, TIMEOUT_MS);

      socket.onmessage = (event) => {
        try {
          clearTimeout(timeout); // Clear the timeout when the message is received
          socket.close();
          const previewImage = {
            imageUrl: event.data.toString(),
          };
          resolve(JSON.stringify(previewImage));
        } catch (e) {
          reject(e);
        }
      };
    });
    console.log("preview complete");

    return previewImage;
  }
}

function createHeaders(apiKey: string) {
  const headers = {
    "content-type": "application/json",
    "x-api-key": apiKey,
  };

  return headers;
}

async function handleResponse(res: Response): Promise<any> {
  if (res.status !== 200) {
    throw new Error(`${await res.text()}`);
  }

  return await res.json();
}

// copied from api
interface AvatarRequest {
  metadata: AvatarRequestMetadata;
  data: any;
}

// copied from api
interface AvatarRequestMetadata {
  requestType: string;
  avatar: anchor.web3.PublicKey;
}

export interface BeginUpdateRequest {
  paymentData: [anchor.web3.PublicKey, string][];
  updateTarget: AvatarRpc.UpdateTarget;
}

// what we expect returned from the rest api
// this is then used to send our request to our avatar transformer via the websocket api
export interface BeginUpdateRestResponse {
  tx: string;
  paymentData: [anchor.web3.PublicKey, anchor.BN][];
  updateTarget: AvatarRpc.UpdateTarget;
}
