import { web3, Program, BN, Provider, Wallet } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";

import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { ITEM_ID } from "../constants/programIds";
import { AnchorPermissivenessType, PermissivenessType } from "../state/common";
import { decodeItemClass, ItemClass, ItemClassData } from "../state/item";
import { getEdition, getItemPDA, getMetadata } from "../utils/pda";
import {
  generateRemainingAccountsForCreateClass,
  generateRemainingAccountsGivenPermissivenessToUse,
} from "./common";
import log from "loglevel";
import { getCluster } from "../utils/connection";

export interface ObjectWrapper<T> {
  program: Program;
  key: web3.PublicKey;
  object: T;
  data: Buffer;
}

export interface CreateItemClassArgs {
  itemClassBump: number | null;
  classIndex: BN;
  parentClassIndex: null | BN;
  space: BN;
  desiredNamespaceArraySize: number;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
  storeMint: boolean;
  storeMetadataFields: boolean;
  itemClassData: any;
}

export interface UpdateItemClassArgs {
  classIndex: BN;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
  itemClassData: any | null;
}

export interface CreateItemClassAccounts {
  itemMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  parentOfParentClassMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
  parentUpdateAuthority: web3.PublicKey | null;
}

export interface UpdateItemClassAccounts {
  itemMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface CreateItemClassAdditionalArgs {
  parentOfParentClassIndex: BN | null;
}

export interface UpdateItemClassAdditionalArgs {
  parentClassIndex: BN | null;
}

export class ItemProgram {
  id: web3.PublicKey;
  program: Program;

  constructor(args: { id: web3.PublicKey; program: Program }) {
    this.id = args.id;
    this.program = args.program;
  }

  async fetchItemClass(
    mint: web3.PublicKey,
    index: BN
  ): Promise<ObjectWrapper<ItemClass>> {
    let itemClass = (await getItemPDA(mint, index))[0];

    // Need a manual deserializer due to our hack we had to do.
    let itemClassObj = await this.program.provider.connection.getAccountInfo(
      itemClass
    );

    const ic = decodeItemClass(itemClassObj.data);
    ic.program = this.program;

    return {
      program: this.program,
      key: itemClass,
      data: itemClassObj.data,
      object: ic,
    };
  }

  async createItemClass(
    args: CreateItemClassArgs,
    accounts: CreateItemClassAccounts,
    additionalArgs: CreateItemClassAdditionalArgs
  ): Promise<web3.PublicKey> {
    const remainingAccounts = await generateRemainingAccountsForCreateClass({
      permissivenessToUse: args.updatePermissivenessToUse,
      tokenMint: accounts.itemMint,
      parentMint: accounts.parentMint,
      parent: accounts.parent,
      parentOfParentClassMint: accounts.parentOfParentClassMint,
      parentOfParentClassIndex: additionalArgs.parentOfParentClassIndex,
      parentOfParentClass:
        additionalArgs.parentOfParentClassIndex &&
        accounts.parentOfParentClassMint
          ? (
              await getItemPDA(
                accounts.parentOfParentClassMint,
                additionalArgs.parentOfParentClassIndex
              )
            )[0]
          : null,
      metadataUpdateAuthority: accounts.metadataUpdateAuthority,
      parentUpdateAuthority: accounts.parentUpdateAuthority,
      program: this.program,
    });

    const [itemClassKey, itemClassBump] = await getItemPDA(
      accounts.itemMint,
      args.classIndex
    );

    args.itemClassBump = itemClassBump;

    await this.program.rpc.createItemClass(args, {
      accounts: {
        itemClass: itemClassKey,
        itemMint: accounts.itemMint,
        metadata: await getMetadata(accounts.itemMint),
        edition: await getEdition(accounts.itemMint),
        parent: accounts.parent || itemClassKey,
        payer: this.program.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      },
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
    });

    return itemClassKey;
  }

  async updateItemClass(
    args: UpdateItemClassArgs,
    accounts: UpdateItemClassAccounts,
    additionalArgs: UpdateItemClassAdditionalArgs
  ): Promise<web3.PublicKey> {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.updatePermissivenessToUse,
        tokenMint: accounts.itemMint,
        parentMint: accounts.parentMint,
        parentIndex: additionalArgs.parentClassIndex,
        parent: accounts.parent,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program,
      });

    const [itemClassKey, itemClassBump] = await getItemPDA(
      accounts.itemMint,
      args.classIndex
    );

    await this.program.rpc.updateItemClass(args, {
      accounts: {
        itemClass: itemClassKey,
        itemMint: accounts.itemMint,
      },
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
    });

    return itemClassKey;
  }
}

export async function getItemProgram(
  anchorWallet: NodeWallet | web3.Keypair,
  env: string,
  customRpcUrl: string
): Promise<ItemProgram> {
  if (customRpcUrl) log.debug("USING CUSTOM URL", customRpcUrl);

  const solConnection = new web3.Connection(customRpcUrl || getCluster(env));

  if (anchorWallet instanceof web3.Keypair)
    anchorWallet = new NodeWallet(anchorWallet);

  const provider = new Provider(solConnection, anchorWallet, {
    preflightCommitment: "recent",
  });

  const idl = await Program.fetchIdl(ITEM_ID, provider);

  const program = new Program(idl, ITEM_ID, provider);

  return new ItemProgram({
    id: ITEM_ID,
    program,
  });
}
