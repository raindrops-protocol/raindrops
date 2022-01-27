import { web3, Program, BN, Provider, Wallet } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";

import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { ITEM_ID } from "../constants/programIds";
import { AnchorPermissivenessType, PermissivenessType } from "../state/common";
import { decodeItemClass, ItemClass, ItemClassData } from "../state/item";
import {
  getAtaForMint,
  getEdition,
  getItemEscrow,
  getItemPDA,
  getMetadata,
} from "../utils/pda";
import {
  generateRemainingAccountsForCreateClass,
  generateRemainingAccountsGivenPermissivenessToUse,
  ObjectWrapper,
} from "./common";
import log from "loglevel";
import { getCluster } from "../utils/connection";

export class ItemClassWrapper implements ObjectWrapper<ItemClass, ItemProgram> {
  program: ItemProgram;
  key: web3.PublicKey;
  object: ItemClass;
  data: Buffer;
  classIndex: number;

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

export interface CreateItemEscrowArgs {
  craftBump: number | null;
  classIndex: BN;
  index: BN;
  componentScope: String;
  amountToMake: BN;
  namespaceIndex: BN | null;
  buildPermissivenessToUse: null | AnchorPermissivenessType;
  itemClassMint: web3.PublicKey;
}

export interface StartItemEscrowBuildPhaseArgs {
  classIndex: BN;
  index: BN;
  componentScope: String;
  amountToMake: BN;
  itemClassMint: web3.PublicKey;
  originator: web3.PublicKey;
  newItemMint: web3.PublicKey;
  buildPermissivenessToUse: null | AnchorPermissivenessType;
  endNodeProof: web3.PublicKey | null;
  totalSteps: BN | null;
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

export interface CreateItemEscrowAccounts {
  itemClassMint: web3.PublicKey;
  newItemMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface UpdateItemClassAccounts {
  itemMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface StartItemEscrowBuildPhaseAccounts {
  itemClassMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface CreateItemClassAdditionalArgs {
  parentOfParentClassIndex: BN | null;
}

export interface UpdateItemClassAdditionalArgs {
  parentClassIndex: BN | null;
}

export interface CreateItemEscrowAdditionalArgs {
  parentClassIndex: BN | null;
}

export interface StartItemEscrowBuildPhaseAdditionalArgs {
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
  ): Promise<ItemClassWrapper> {
    let itemClass = (await getItemPDA(mint, index))[0];

    // Need a manual deserializer due to our hack we had to do.
    let itemClassObj = await this.program.provider.connection.getAccountInfo(
      itemClass
    );

    const ic = decodeItemClass(itemClassObj.data);
    ic.program = this.program;

    return new ItemClassWrapper({
      program: this,
      key: itemClass,
      data: itemClassObj.data,
      object: ic,
    });
  }

  async createItemEscrow(
    args: CreateItemEscrowArgs,
    accounts: CreateItemEscrowAccounts,
    additionalArgs: CreateItemEscrowAdditionalArgs
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.buildPermissivenessToUse,
        tokenMint: accounts.itemClassMint,
        parentMint: accounts.parentMint,
        parentIndex: additionalArgs.parentClassIndex,
        parent: accounts.parentMint
          ? (
              await getItemPDA(
                accounts.parentMint,
                additionalArgs.parentClassIndex
              )
            )[0]
          : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program,
      });

    const itemClassKey = (
      await getItemPDA(accounts.itemClassMint, args.classIndex)
    )[0];

    const [itemEscrow, itemEscrowBump] = await getItemEscrow({
      itemClassMint: accounts.itemClassMint,
      index: args.index,
      classIndex: args.classIndex,
      newItemMint: accounts.newItemMint,
      newItemToken:
        accounts.newItemToken ||
        (
          await getAtaForMint(
            accounts.newItemMint,
            this.program.provider.wallet.publicKey
          )
        )[0],
      payer: this.program.provider.wallet.publicKey,
      amountToMake: args.amountToMake,
      componentScope: args.componentScope,
    });

    args.craftBump = itemEscrowBump;
    console.log("acct", itemClassKey.toBase58());
    await this.program.rpc.createItemEscrow(args, {
      accounts: {
        itemClass: itemClassKey,
        itemClassMetadata: await getMetadata(accounts.itemClassMint),
        newItemMint: accounts.newItemMint,
        newItemMetadata: await getMetadata(accounts.newItemMint),
        newItemEdition: await getEdition(accounts.newItemMint),
        itemEscrow,
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              accounts.newItemMint,
              this.program.provider.wallet.publicKey
            )
          )[0],
        newItemTokenHolder:
          accounts.newItemTokenHolder || this.program.provider.wallet.publicKey,
        payer: this.program.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      },
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
    });
  }

  async startItemEscrowBuildPhase(
    args: StartItemEscrowBuildPhaseArgs,
    accounts: StartItemEscrowBuildPhaseAccounts,
    additionalArgs: StartItemEscrowBuildPhaseAdditionalArgs
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.buildPermissivenessToUse,
        tokenMint: accounts.itemClassMint,
        parentMint: accounts.parentMint,
        parentIndex: additionalArgs.parentClassIndex,
        parent: accounts.parentMint
          ? (
              await getItemPDA(
                accounts.parentMint,
                additionalArgs.parentClassIndex
              )
            )[0]
          : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program,
      });

    const itemClassKey = (
      await getItemPDA(accounts.itemClassMint, args.classIndex)
    )[0];

    const itemEscrow = (
      await getItemEscrow({
        itemClassMint: accounts.itemClassMint,
        classIndex: args.classIndex,
        index: args.index,
        newItemMint: args.newItemMint,
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              args.newItemMint,
              this.program.provider.wallet.publicKey
            )
          )[0],
        payer: this.program.provider.wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    await this.program.rpc.startItemEscrowBuildPhase(args, {
      accounts: {
        itemClass: itemClassKey,
        itemEscrow,
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              args.newItemMint,
              this.program.provider.wallet.publicKey
            )
          )[0],
        newItemTokenHolder:
          accounts.newItemTokenHolder || this.program.provider.wallet.publicKey,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
      },
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
    });
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
