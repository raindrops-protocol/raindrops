import { web3, Program, BN, Provider, Wallet } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";

import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { ITEM_ID } from "../constants/programIds";
import { PermissivenessType } from "../state/common";
import { ItemClassData } from "../state/item";
import { getEdition, getItemPDA, getMetadata } from "../utils/pda";
import { generateRemainingAccountsForCreateClass } from "./common";
import log from "loglevel";
import { getCluster } from "../utils/connection";

export class ItemClass {
  program: Program;
  state: any; // Todo replace with interface
}

export class Item {
  program: Program;
  state: any; // Todo replace with interface
}

export interface CreateItemClassArgs {
  itemClassBump: number | null;
  classIndex: BN;
  parentClassIndex: null | BN;
  space: BN;
  desiredNamespaceArraySize: BN;
  updatePermissivenessToUse: null | PermissivenessType;
  storeMint: boolean;
  storeMetadataFields: boolean;
  itemClassData: ItemClassData;
}

export interface CreateItemClassAccounts {
  itemMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  parentOfParentClassMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
  parentUpdateAuthority: web3.PublicKey | null;
}

export interface CreateItemClassAdditionalArgs {
  parentOfParentClassIndex: BN | null;
}

export class ItemProgram {
  id: web3.PublicKey;
  program: Program;

  constructor(args: { id: web3.PublicKey; program: Program }) {
    this.id = args.id;
    this.program = args.program;
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
        parent: accounts.parent || SystemProgram.programId,
        payer: this.program.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
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
