import {
  web3,
  Program,
  BN,
  Provider,
  Wallet,
  AnchorProvider,
  Address,
} from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";

import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { ITEM_ID, PLAYER_ID, TOKEN_PROGRAM_ID } from "../constants/programIds";
import { AnchorPermissivenessType } from "../state/common";
import { decodeItemClass, ItemClass } from "../state/item";
import {
  getAtaForMint,
  getCraftItemCounter,
  getCraftItemEscrow,
  getEdition,
  getItemActivationMarker,
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
import { Token } from "@solana/spl-token";
import { sendTransactionWithRetry } from "../utils/transactions";

function convertNumsToBNs(data: any) {
  if (data.itemClassData) {
    if (data.itemClassData.settings.stakingWarmUpDuration)
      data.itemClassData.settings.stakingWarmUpDuration = new BN(
        data.itemClassData.settings.stakingWarmUpDuration
      );

    if (data.itemClassData.settings.stakingCooldownDuration)
      data.itemClassData.settings.stakingCooldownDuration = new BN(
        data.itemClassData.settings.stakingCooldownDuration
      );

    data.itemClassData.config.components?.forEach((k) => {
      if (k.timeToBuild != null) {
        k.timeToBuild = new BN(k.timeToBuild);
      }
    });

    data.itemClassData.config.usages?.forEach((k) => {
      if (k.validation != null && k.validation != undefined) {
        k.validation.key = new web3.PublicKey(k.validation.key);
        k.validation.code = new BN(k.validation.code);
      }

      if (k.callback != null && k.callback != undefined) {
        k.callback.key = new web3.PublicKey(k.callback.key);
        k.callback.code = new BN(k.callback.code);
      }

      let u = k.itemClassType.consumable;

      if (u) {
        if (u.maxUses != null) u.maxUses = new BN(u.maxUses);
        if (u.maxPlayersPerUse != null)
          u.maxPlayersPerUse = new BN(u.maxPlayersPerUse);
        if (u.warmupDuration != null)
          u.warmupDuration = new BN(u.warmupDuration);
        if (u.cooldownDuration != null) {
          u.cooldownDuration = new BN(u.cooldownDuration);
        }
      }

      u = k.itemClassType.wearable;
      if (u) {
        if (u.limitPerPart) {
          u.limitPerPart = new BN(u.limitPerPart);
        }
      }
    });
  }
}
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

export interface UsageInfo {}

export interface BeginItemActivationArgs {
  classIndex: BN;
  index: BN;
  itemClassMint: web3.PublicKey;
  itemMarkerSpace: number;
  usagePermissivenessToUse: null | AnchorPermissivenessType;
  amount: BN;
  usageIndex: number;
  usageInfo: null;
}

export interface EndItemActivationArgs {
  classIndex: BN;
  index: BN;
  itemMint: web3.PublicKey;
  itemClassMint: web3.PublicKey;
  usagePermissivenessToUse: null | AnchorPermissivenessType;
  amount: BN;
  usageIndex: number;
  usageProof: null | web3.PublicKey[];
  usage: null;
}

export interface CreateItemClassArgs {
  classIndex: BN;
  parentOfParentClassIndex: null | BN;
  parentClassIndex: null | BN;
  space: BN;
  desiredNamespaceArraySize: number;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
  storeMint: boolean;
  storeMetadataFields: boolean;
  itemClassData: any;
}

export interface CreateItemEscrowArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: String;
  amountToMake: BN;
  namespaceIndex: BN | null;
  buildPermissivenessToUse: null | AnchorPermissivenessType;
  itemClassMint: web3.PublicKey;
}

export interface AddCraftItemToEscrowArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftItemIndex: BN;
  craftEscrowIndex: BN;
  craftItemClassIndex: BN;
  craftItemClassMint: web3.PublicKey;
  componentScope: String;
  amountToMake: BN;
  amountToContributeFromThisContributor: BN;
  newItemMint: web3.PublicKey;
  originator: web3.PublicKey;
  namespaceIndex: BN | null;
  buildPermissivenessToUse: null | AnchorPermissivenessType;
  itemClassMint: web3.PublicKey;
  componentProof: web3.PublicKey | null;
  // we use any bcause of the enum changes required
  // means redefining all these interfaces for anchor
  // too lazy
  component: any | null;
  craftUsageInfo: {
    craftUsageStateProof: web3.PublicKey;
    craftUsageState: {
      index: number;
      uses: BN;
      activatedAt: BN | null;
    };
    craftUsageProof: web3.PublicKey;
    craftUsage: any;
  } | null;
}

export interface RemoveCraftItemFromEscrowArgs {
  craftItemTokenMint: web3.PublicKey;
  classIndex: BN;
  parentClassIndex: null | BN;

  craftItemIndex: BN;
  craftEscrowIndex: BN;
  craftItemClassIndex: BN;
  craftItemClassMint: web3.PublicKey;
  componentScope: String;
  amountToMake: BN;
  amountContributedFromThisContributor: BN;
  newItemMint: web3.PublicKey;
  originator: web3.PublicKey;
  namespaceIndex: BN | null;
  buildPermissivenessToUse: null | AnchorPermissivenessType;
  itemClassMint: web3.PublicKey;
  componentProof: web3.PublicKey | null;
  // we use any bcause of the enum changes required
  // means redefining all these interfaces for anchor
  // too lazy
  component: any | null;
}

export interface StartItemEscrowBuildPhaseArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: String;
  amountToMake: BN;
  itemClassMint: web3.PublicKey;
  originator: web3.PublicKey;
  newItemMint: web3.PublicKey;
  buildPermissivenessToUse: null | AnchorPermissivenessType;
  endNodeProof: web3.PublicKey | null;
  totalSteps: BN | null;
}

export interface CompleteItemEscrowBuildPhaseArgs {
  classIndex: BN;
  newItemIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: String;
  amountToMake: BN;
  space: BN;
  itemClassMint: web3.PublicKey;
  originator: web3.PublicKey;
  buildPermissivenessToUse: null | AnchorPermissivenessType;
  storeMint: boolean;
  storeMetadataFields: boolean;
}

export interface DeactivateItemEscrowArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: String;
  amountToMake: BN;
  itemClassMint: web3.PublicKey;
  newItemMint: web3.PublicKey;
  newItemToken: web3.PublicKey;
}

export interface UpdateValidForUseIfWarmupPassedArgs {
  classIndex: BN;
  index: BN;
  usageIndex: number;
  itemClassMint: web3.PublicKey;
  itemMint: web3.PublicKey;
  amount: BN;
  usageProof: null | web3.PublicKey;
  usage: null;
}

export interface DrainItemEscrowArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: String;
  amountToMake: BN;
  itemClassMint: web3.PublicKey;
  newItemMint: web3.PublicKey;
  newItemToken: web3.PublicKey;
}

export interface UpdateItemClassArgs {
  classIndex: BN;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
  parentClassIndex: null | BN;
  itemClassData: any | null;
}

export interface UpdateItemArgs {
  classIndex: BN;
  index: BN;
  itemMint: web3.PublicKey;
  itemClassMint: web3.PublicKey;
}

export interface BeginItemActivationAccounts {
  itemMint: web3.PublicKey;
  itemAccount: null | web3.PublicKey;
  itemTransferAuthority: null | web3.Keypair;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface EndItemActivationAccounts {
  originator: web3.PublicKey;
  metadataUpdateAuthority: web3.PublicKey | null;
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

export interface AddCraftItemToEscrowAccounts {
  itemClassMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  craftItemTokenMint: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface UpdateValidForUseIfWarmupPassedAccounts {}

export interface RemoveCraftItemFromEscrowAccounts {
  itemClassMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface CompleteItemEscrowBuildPhaseAccounts {
  itemClassMint: web3.PublicKey;
  newItemMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface DeactivateItemEscrowAccounts {}

export interface DrainItemEscrowAccounts {
  originator: web3.PublicKey | null;
}

export interface UpdateItemClassAccounts {
  itemMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface UpdateItemAccounts {}

export interface StartItemEscrowBuildPhaseAccounts {
  itemClassMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface BeginItemActivationAdditionalArgs {}

export interface EndItemActivationAdditionalArgs {}

export interface CreateItemClassAdditionalArgs {}

export interface UpdateItemClassAdditionalArgs {
  permissionless: boolean;
}

export interface CreateItemEscrowAdditionalArgs {}

export interface StartItemEscrowBuildPhaseAdditionalArgs {}
export interface CompleteItemEscrowBuildPhaseAdditionalArgs {}

export interface UpdateItemAdditionalArgs {}
export interface AddCraftItemToEscrowAdditionalArgs {}
export interface RemoveCraftItemFromEscrowAdditionalArgs {}

export interface DeactivateItemEscrowAdditionalArgs {}

export interface DrainItemEscrowAdditionalArgs {}

export interface UpdateValidForUseIfWarmupPassedAdditionalArgs {}

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
    let itemClassObj = await (
      this.program.provider as AnchorProvider
    ).connection.getAccountInfo(itemClass);

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
        parentIndex: args.parentClassIndex,
        parent: accounts.parentMint
          ? (
              await getItemPDA(accounts.parentMint, args.parentClassIndex)
            )[0]
          : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program,
      });

    const itemClassKey = (
      await getItemPDA(accounts.itemClassMint, args.classIndex)
    )[0];

    const [itemEscrow, _] = await getItemEscrow({
      itemClassMint: accounts.itemClassMint,
      craftEscrowIndex: args.craftEscrowIndex,
      classIndex: args.classIndex,
      newItemMint: accounts.newItemMint,
      newItemToken:
        accounts.newItemToken ||
        (
          await getAtaForMint(
            accounts.newItemMint,
            (this.program.provider as AnchorProvider).wallet.publicKey
          )
        )[0],
      payer: (this.program.provider as AnchorProvider).wallet.publicKey,
      amountToMake: args.amountToMake,
      componentScope: args.componentScope,
    });

    await this.program.methods
      .createItemEscrow(args)
      .accounts({
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
              (this.program.provider as AnchorProvider).wallet.publicKey
            )
          )[0],
        newItemTokenHolder:
          accounts.newItemTokenHolder ||
          (this.program.provider as AnchorProvider).wallet.publicKey,
        payer: (this.program.provider as AnchorProvider).wallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async completeItemEscrowBuildPhase(
    args: CompleteItemEscrowBuildPhaseArgs,
    accounts: CompleteItemEscrowBuildPhaseAccounts,
    additionalArgs: CompleteItemEscrowBuildPhaseAdditionalArgs
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.buildPermissivenessToUse,
        tokenMint: accounts.itemClassMint,
        parentMint: accounts.parentMint,
        parentIndex: args.parentClassIndex,
        parent: accounts.parentMint
          ? (
              await getItemPDA(accounts.parentMint, args.parentClassIndex)
            )[0]
          : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program,
      });

    const itemClassKey = (
      await getItemPDA(accounts.itemClassMint, args.classIndex)
    )[0];

    const [newItem, _] = await getItemPDA(
      accounts.newItemMint,
      args.newItemIndex
    );

    const itemEscrow = (
      await getItemEscrow({
        itemClassMint: accounts.itemClassMint,
        classIndex: args.classIndex,
        craftEscrowIndex: args.craftEscrowIndex,
        newItemMint: accounts.newItemMint,
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              accounts.newItemMint,
              args.originator ||
                (this.program.provider as AnchorProvider).wallet.publicKey
            )
          )[0],
        payer:
          args.originator ||
          (this.program.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    await this.program.methods
      .completeItemEscrowBuildPhase(args)
      .accounts({
        itemClass: itemClassKey,
        itemEscrow,
        newItem,
        newItemMint: accounts.newItemMint,
        newItemMetadata: await getMetadata(accounts.newItemMint),
        newItemEdition: await getEdition(accounts.newItemMint),
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              accounts.newItemMint,
              args.originator ||
                (this.program.provider as AnchorProvider).wallet.publicKey
            )
          )[0],
        newItemTokenHolder:
          accounts.newItemTokenHolder ||
          args.originator ||
          (this.program.provider as AnchorProvider).wallet.publicKey,
        payer: (this.program.provider as AnchorProvider).wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async deactivateItemEscrow(
    args: DeactivateItemEscrowArgs,
    _accounts: DeactivateItemEscrowAccounts,
    _additionalArgs: DeactivateItemEscrowAdditionalArgs
  ) {
    args.newItemToken =
      args.newItemToken ||
      (
        await getAtaForMint(
          args.newItemMint,
          (this.program.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
    const itemEscrow = (
      await getItemEscrow({
        itemClassMint: args.itemClassMint,
        classIndex: args.classIndex,
        craftEscrowIndex: args.craftEscrowIndex,
        newItemMint: args.newItemMint,
        newItemToken: args.newItemToken,
        payer: (this.program.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    await this.program.methods
      .deactivateItemEscrow(args)
      .accounts({
        itemEscrow,
        originator: (this.program.provider as AnchorProvider).wallet.publicKey,
      })
      .rpc();
  }

  async updateValidForUseIfWarmupPassed(
    args: UpdateValidForUseIfWarmupPassedArgs,
    _accounts: UpdateValidForUseIfWarmupPassedAccounts = {},
    _additionalArgs: UpdateValidForUseIfWarmupPassedAdditionalArgs = {}
  ) {
    const itemActivationMarker = (
      await getItemActivationMarker({
        itemMint: args.itemMint,
        index: args.index,
        usageIndex: new BN(args.usageIndex),
        amount: args.amount,
      })
    )[0];

    await this.program.methods
      .updateValidForUseIfWarmupPassed(args)
      .accounts({
        item: (await getItemPDA(args.itemMint, args.index))[0],
        itemClass: (await getItemPDA(args.itemClassMint, args.classIndex))[0],
        itemActivationMarker,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();
  }

  async addCraftItemToEscrow(
    args: AddCraftItemToEscrowArgs,
    accounts: AddCraftItemToEscrowAccounts,
    additionalArgs: AddCraftItemToEscrowAdditionalArgs
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.buildPermissivenessToUse,
        tokenMint: accounts.itemClassMint,
        parentMint: accounts.parentMint,
        parentIndex: args.parentClassIndex,
        parent: accounts.parentMint
          ? (
              await getItemPDA(accounts.parentMint, args.parentClassIndex)
            )[0]
          : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program,
      });

    const itemClassKey = (
      await getItemPDA(accounts.itemClassMint, args.classIndex)
    )[0];
    const craftItemTokenAccount = (
      await getAtaForMint(
        accounts.craftItemTokenMint,
        (this.program.provider as AnchorProvider).wallet.publicKey
      )
    )[0];

    const [craftItemEscrow, _itemEscrowBump] = await getCraftItemEscrow({
      itemClassMint: accounts.itemClassMint,
      classIndex: args.classIndex,
      craftIndex: args.craftItemIndex,
      craftEscrowIndex: args.craftEscrowIndex,
      newItemMint: args.newItemMint,
      craftItemMint: accounts.craftItemTokenMint,
      craftItemToken: craftItemTokenAccount,
      payer: (this.program.provider as AnchorProvider).wallet.publicKey,
      amountToMake: args.amountToMake,
      amountToContributeFromThisContributor:
        args.amountToContributeFromThisContributor,
      componentScope: args.componentScope,
    });

    const [craftItemCounter, _craftBump] = await getCraftItemCounter({
      itemClassMint: accounts.itemClassMint,
      classIndex: args.classIndex,
      craftItemIndex: args.craftItemIndex,
      craftEscrowIndex: args.craftEscrowIndex,
      newItemMint: args.newItemMint,
      craftItemMint: accounts.craftItemTokenMint,
      componentScope: args.componentScope,
    });

    const itemEscrow = (
      await getItemEscrow({
        itemClassMint: accounts.itemClassMint,
        classIndex: args.classIndex,
        craftEscrowIndex: args.craftEscrowIndex,
        newItemMint: args.newItemMint,
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              args.newItemMint,
              args.originator ||
                (this.program.provider as AnchorProvider).wallet.publicKey
            )
          )[0],
        payer:
          args.originator ||
          (this.program.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    const craftItem = (
      await getItemPDA(accounts.craftItemTokenMint, args.craftItemIndex)
    )[0];
    const craftItemObj = await this.program.account.item.fetch(craftItem);
    const instructions = [],
      signers = [];
    const craftItemTransferAuthority = web3.Keypair.generate();

    signers.push(craftItemTransferAuthority);
    instructions.push(
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        craftItemTokenAccount,
        craftItemTransferAuthority.publicKey,
        (this.program.provider as AnchorProvider).wallet.publicKey,
        [],
        args.amountToContributeFromThisContributor.toNumber()
      )
    );
    instructions.push(
      await this.program.methods
        .addCraftItemToEscrow(args)
        .accounts({
          itemClass: itemClassKey,
          itemEscrow,
          craftItemCounter,
          newItemToken:
            accounts.newItemToken ||
            (
              await getAtaForMint(
                args.newItemMint,
                args.originator ||
                  (this.program.provider as AnchorProvider).wallet.publicKey
              )
            )[0],
          newItemTokenHolder:
            accounts.newItemTokenHolder ||
            args.originator ||
            (this.program.provider as AnchorProvider).wallet.publicKey,
          craftItemTokenAccountEscrow: craftItemEscrow,
          craftItemTokenMint: accounts.craftItemTokenMint,
          craftItemTokenAccount,
          craftItem,
          craftItemClass: craftItemObj.parent as Address,
          craftItemTransferAuthority: craftItemTransferAuthority.publicKey,
          payer: (this.program.provider as AnchorProvider).wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .remainingAccounts(remainingAccounts)
        .instruction()
    );

    instructions.push(
      Token.createRevokeInstruction(
        TOKEN_PROGRAM_ID,
        craftItemTokenAccount,
        (this.program.provider as AnchorProvider).wallet.publicKey,
        []
      )
    );

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async removeCraftItemFromEscrow(
    args: RemoveCraftItemFromEscrowArgs,
    accounts: RemoveCraftItemFromEscrowAccounts,
    additionalArgs: RemoveCraftItemFromEscrowAdditionalArgs
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.buildPermissivenessToUse,
        tokenMint: accounts.itemClassMint,
        parentMint: accounts.parentMint,
        parentIndex: args.parentClassIndex,
        parent: accounts.parentMint
          ? (
              await getItemPDA(accounts.parentMint, args.parentClassIndex)
            )[0]
          : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program,
      });

    const itemClassKey = (
      await getItemPDA(accounts.itemClassMint, args.classIndex)
    )[0];
    const craftItemTokenAccount = (
      await getAtaForMint(
        args.craftItemTokenMint,
        (this.program.provider as AnchorProvider).wallet.publicKey
      )
    )[0];

    const [craftItemEscrow, _itemEscrowBump] = await getCraftItemEscrow({
      itemClassMint: accounts.itemClassMint,
      classIndex: args.classIndex,
      craftIndex: args.craftItemIndex,
      craftEscrowIndex: args.craftEscrowIndex,
      newItemMint: args.newItemMint,
      craftItemMint: args.craftItemTokenMint,
      craftItemToken: craftItemTokenAccount,
      payer: (this.program.provider as AnchorProvider).wallet.publicKey,
      amountToMake: args.amountToMake,
      amountToContributeFromThisContributor:
        args.amountContributedFromThisContributor,
      componentScope: args.componentScope,
    });

    const [craftItemCounter, _craftBump] = await getCraftItemCounter({
      itemClassMint: accounts.itemClassMint,
      classIndex: args.classIndex,
      craftItemIndex: args.craftItemIndex,
      craftEscrowIndex: args.craftEscrowIndex,
      newItemMint: args.newItemMint,
      craftItemMint: args.craftItemTokenMint,
      componentScope: args.componentScope,
    });

    const itemEscrow = (
      await getItemEscrow({
        itemClassMint: accounts.itemClassMint,
        classIndex: args.classIndex,
        craftEscrowIndex: args.craftEscrowIndex,
        newItemMint: args.newItemMint,
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              args.newItemMint,
              args.originator ||
                (this.program.provider as AnchorProvider).wallet.publicKey
            )
          )[0],
        payer:
          args.originator ||
          (this.program.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    await this.program.methods
      .removeCraftItemFromEscrow(args)
      .accounts({
        itemClass: itemClassKey,
        itemEscrow,
        craftItemCounter,
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              args.newItemMint,
              args.originator ||
                (this.program.provider as AnchorProvider).wallet.publicKey
            )
          )[0],
        newItemTokenHolder:
          accounts.newItemTokenHolder ||
          args.originator ||
          (this.program.provider as AnchorProvider).wallet.publicKey,
        craftItemTokenAccountEscrow: craftItemEscrow,
        craftItemTokenAccount,
        craftItem: (
          await getItemPDA(args.craftItemTokenMint, args.craftItemIndex)
        )[0],
        craftItemClass: (
          await getItemPDA(args.craftItemClassMint, args.craftItemClassIndex)
        )[0],
        receiver: (this.program.provider as AnchorProvider).wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async beginItemActivation(
    args: BeginItemActivationArgs,
    accounts: BeginItemActivationAccounts,
    _additionalArgs: BeginItemActivationAdditionalArgs = {}
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.usagePermissivenessToUse,
        tokenMint: accounts.itemMint,
        parentMint: args.itemClassMint,
        parentIndex: args.classIndex,
        parent: (await getItemPDA(args.itemClassMint, args.classIndex))[0],
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program,
      });

    const itemClassKey = (
      await getItemPDA(args.itemClassMint, args.classIndex)
    )[0];

    const [itemActivationMarker, itemActivationBump] =
      await getItemActivationMarker({
        itemMint: accounts.itemMint,
        index: args.index,
        usageIndex: new BN(args.usageIndex),
        amount: args.amount,
      });

    const instructions = [],
      signers = [];
    const itemTransferAuthority =
      accounts.itemTransferAuthority || web3.Keypair.generate();

    if (
      accounts.itemAccount.equals(
        (
          await getAtaForMint(
            accounts.itemMint,
            (this.program.provider as AnchorProvider).wallet.publicKey
          )
        )[0]
      )
    ) {
      signers.push(itemTransferAuthority);

      instructions.push(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          accounts.itemAccount,
          itemTransferAuthority.publicKey,
          (this.program.provider as AnchorProvider).wallet.publicKey,
          [],
          args.amount.toNumber()
        )
      );
    }

    const itemKey = (await getItemPDA(accounts.itemMint, args.index))[0];

    const itemClass = await this.fetchItemClass(
      args.itemClassMint,
      args.classIndex
    );

    instructions.push(
      this.program.methods
        .beginItemActivation(args)
        .accounts({
          itemClass: itemClassKey,
          itemMint: accounts.itemMint,
          item: itemKey,
          itemAccount: accounts.itemAccount,
          itemTransferAuthority: itemTransferAuthority.publicKey,
          itemActivationMarker,
          payer: (this.program.provider as AnchorProvider).wallet.publicKey,
          playerProgram: PLAYER_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          validationProgram: itemClass.object.itemClassData.config.usages[
            args.usageIndex
          ].validation
            ? new web3.PublicKey(
                itemClass.object.itemClassData.config.usages[
                  args.usageIndex
                ].validation.key
              )
            : SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction()
    );

    if (
      accounts.itemAccount.equals(
        (
          await getAtaForMint(
            accounts.itemMint,
            (this.program.provider as AnchorProvider).wallet.publicKey
          )
        )[0]
      )
    ) {
      instructions.push(
        Token.createRevokeInstruction(
          TOKEN_PROGRAM_ID,
          accounts.itemAccount,
          (this.program.provider as AnchorProvider).wallet.publicKey,
          []
        )
      );
    }

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async endItemActivation(
    args: EndItemActivationArgs,
    accounts: EndItemActivationAccounts,
    _additionalArgs: EndItemActivationAdditionalArgs = {}
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.usagePermissivenessToUse,
        tokenMint: args.itemMint,
        parentMint: args.itemClassMint,
        parentIndex: args.classIndex,
        parent: (await getItemPDA(args.itemClassMint, args.classIndex))[0],
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program,
      });

    const itemClassKey = (
      await getItemPDA(args.itemClassMint, args.classIndex)
    )[0];

    const itemActivationMarker = (
      await getItemActivationMarker({
        itemMint: args.itemMint,
        index: args.index,
        usageIndex: new BN(args.usageIndex),
        amount: args.amount,
      })
    )[0];

    const itemKey = (await getItemPDA(args.itemMint, args.index))[0];
    await this.program.methods
      .endItemActivation(args)
      .accounts({
        itemClass: itemClassKey,
        item: itemKey,
        itemActivationMarker,
        receiver:
          accounts.originator ||
          (this.program.provider as AnchorProvider).wallet.publicKey,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async drainItemEscrow(
    args: DrainItemEscrowArgs,
    accounts: DrainItemEscrowAccounts,
    _additionalArgs: DrainItemEscrowAdditionalArgs = {}
  ) {
    const itemClassKey = (
      await getItemPDA(args.itemClassMint, args.classIndex)
    )[0];

    if (!args.newItemToken) {
      args.newItemToken = (
        await getAtaForMint(
          args.newItemMint,
          (this.program.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
    }

    const itemEscrow = (
      await getItemEscrow({
        itemClassMint: args.itemClassMint,
        classIndex: args.classIndex,
        craftEscrowIndex: args.craftEscrowIndex,
        newItemMint: args.newItemMint,
        newItemToken: args.newItemToken,
        payer: (this.program.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    await this.program.methods
      .drainItemEscrow(args)
      .accounts({
        itemEscrow,
        originator: accounts.originator,
      })
      .rpc();
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
        parentIndex: args.parentClassIndex,
        parent: accounts.parentMint
          ? (
              await getItemPDA(accounts.parentMint, args.parentClassIndex)
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
        craftEscrowIndex: args.craftEscrowIndex,
        newItemMint: args.newItemMint,
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              args.newItemMint,
              args.originator ||
                (this.program.provider as AnchorProvider).wallet.publicKey
            )
          )[0],
        payer:
          args.originator ||
          (this.program.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    await this.program.methods
      .startItemEscrowBuildPhase(args)
      .accounts({
        itemClass: itemClassKey,
        itemEscrow,
        newItemToken:
          accounts.newItemToken ||
          (
            await getAtaForMint(
              args.newItemMint,
              args.originator ||
                (this.program.provider as AnchorProvider).wallet.publicKey
            )
          )[0],
        newItemTokenHolder:
          accounts.newItemTokenHolder ||
          args.originator ||
          (this.program.provider as AnchorProvider).wallet.publicKey,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
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
      parentOfParentClassIndex: args.parentOfParentClassIndex,
      parentOfParentClass:
        args.parentOfParentClassIndex && accounts.parentOfParentClassMint
          ? (
              await getItemPDA(
                accounts.parentOfParentClassMint,
                args.parentOfParentClassIndex
              )
            )[0]
          : null,
      metadataUpdateAuthority: accounts.metadataUpdateAuthority,
      parentUpdateAuthority: accounts.parentUpdateAuthority,
      program: this.program,
    });

    convertNumsToBNs(args);

    const [itemClassKey, itemClassBump] = await getItemPDA(
      accounts.itemMint,
      args.classIndex
    );

    await this.program.methods
      .createItemClass(args)
      .accounts({
        itemClass: itemClassKey,
        itemMint: accounts.itemMint,
        metadata: await getMetadata(accounts.itemMint),
        edition: await getEdition(accounts.itemMint),
        parent: accounts.parent || itemClassKey,
        payer: (this.program.provider as AnchorProvider).wallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();

    return itemClassKey;
  }

  async updateItem(
    args: UpdateItemArgs,
    _accounts: UpdateItemAccounts,
    additionalArgs: UpdateItemAdditionalArgs
  ): Promise<web3.PublicKey> {
    const itemClassKey = (
      await getItemPDA(args.itemClassMint, args.classIndex)
    )[0];

    const itemKey = (await getItemPDA(args.itemMint, args.index))[0];

    await this.program.methods
      .updateItem(args)
      .accounts({
        accounts: {
          itemClass: itemClassKey,
          item: itemKey,
        },
      })
      .rpc();

    return itemClassKey;
  }

  async updateItemClass(
    args: UpdateItemClassArgs,
    accounts: UpdateItemClassAccounts,
    additionalArgs: UpdateItemClassAdditionalArgs
  ): Promise<web3.PublicKey> {
    const remainingAccounts = additionalArgs.permissionless
      ? [{ pubkey: accounts.parent, isWritable: false, isSigner: false }]
      : await generateRemainingAccountsGivenPermissivenessToUse({
          permissivenessToUse: args.updatePermissivenessToUse,
          tokenMint: accounts.itemMint,
          parentMint: accounts.parentMint,
          parentIndex: args.parentClassIndex,
          parent: accounts.parent,
          metadataUpdateAuthority: accounts.metadataUpdateAuthority,
          program: this.program,
        });

    convertNumsToBNs(args);

    const itemClassKey = (
      await getItemPDA(accounts.itemMint, args.classIndex)
    )[0];

    await this.program.methods
      .updateItemClass(args)
      .accounts({
        itemClass: itemClassKey,
        parent: accounts.parent || web3.SystemProgram.programId,
        itemMint: accounts.itemMint,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();

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

  const provider = new AnchorProvider(solConnection, anchorWallet, {
    preflightCommitment: "recent",
  });

  const idl = await Program.fetchIdl(ITEM_ID, provider);

  const program = new Program(idl, ITEM_ID, provider);

  return new ItemProgram({
    id: ITEM_ID,
    program,
  });
}
