import { web3, AnchorProvider, BN, Address } from "@project-serum/anchor";
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { Token } from "@solana/spl-token";
import {
  Program,
  Instruction as SolKitInstruction,
  InstructionUtils,
} from "@raindrop-studios/sol-kit";
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
import { TOKEN_PROGRAM_ID } from "../constants/programIds";
import { AnchorPermissivenessType } from "../../src/state/common";
import { ContractCommon } from "../contract/common";
import { ItemClassWrapper } from "../contract/item";

const {
  generateRemainingAccountsForCreateClass,
  generateRemainingAccountsGivenPermissivenessToUse,
} = ContractCommon;

const ITEM_CLASS_DATA_ARGS_CONVERT_TO_BNS = [
  "itemClassData.settings.stakingWarmUpDuration",
  "itemClassData.settings.stakingCooldownDuration",
  "itemClassData.config.components.[].timeToBuild",
  "itemClassData.config.usages.[].validation.code",
  "itemClassData.config.usages.[].callback.code",
  "itemClassData.config.usages.[].basicItemEffects.[].amount",
  "itemClassData.config.usages.[].basicItemEffects.[].stakingAmountNumerator",
  "itemClassData.config.usages.[].basicItemEffects.[].stakingAmountDivisor",
  "itemClassData.config.usages.[].basicItemEffects.[].stakingDurationDivisor",
  "itemClassData.config.usages.[].basicItemEffects.[].stakingDurationDivisor",
  "itemClassData.config.usages.[].basicItemEffects.[].activeDuration",
  "itemClassData.config.usages.[].itemClassType.consumable.maxUses",
  "itemClassData.config.usages.[].itemClassType.consumable.maxPlayersPerUse",
  "itemClassData.config.usages.[].itemClassType.consumable.warmupDuration",
  "itemClassData.config.usages.[].itemClassType.consumable.cooldownDuration",
  "itemClassData.config.usages.[].itemClassType.wearable.limitPerPart",
];

const ITEM_CLASS_DATA_ARGS_CONVERT_TO_PUBKEYS = [
  "itemClassData.config.usages.[].validation.key",
  "itemClassData.config.usages.[].callback.key",
];

export class Instruction extends SolKitInstruction {
  constructor(args: { program: Program.Program }) {
    super(args);
  }

  async createItemClass(
    args: CreateItemClassArgs,
    accounts: CreateItemClassAccounts,
    additionalArgs: CreateItemClassAdditionalArgs
  ) {
    const [itemClassKey, itemClassBump] = await getItemPDA(
      accounts.itemMint,
      args.classIndex
    );

    InstructionUtils.convertNumbersToBNs(args, [
      "desiredNamespaceArraySize",
      ...ITEM_CLASS_DATA_ARGS_CONVERT_TO_BNS,
    ]);
    InstructionUtils.convertStringsToPublicKeys(
      args,
      ITEM_CLASS_DATA_ARGS_CONVERT_TO_PUBKEYS
    );

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

    return [
      await this.program.client.methods
        .createItemClass(args)
        .accounts({
          itemClass: itemClassKey,
          itemMint: accounts.itemMint,
          metadata: await getMetadata(accounts.itemMint),
          edition: await getEdition(accounts.itemMint),
          parent: accounts.parent || itemClassKey,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
  }

  async updateItemClass(
    args: UpdateItemClassArgs,
    accounts: UpdateItemClassAccounts,
    additionalArgs: UpdateItemClassAdditionalArgs
  ) {
    const remainingAccounts: AccountMeta[] =
      additionalArgs.permissionless && accounts.parent
        ? [{ pubkey: accounts.parent, isWritable: false, isSigner: false }]
        : await generateRemainingAccountsGivenPermissivenessToUse({
            permissivenessToUse: args.updatePermissivenessToUse,
            tokenMint: accounts.itemMint,
            parentMint: accounts.parentMint,
            parentIndex: args.parentClassIndex,
            parent: accounts.parent,
            metadataUpdateAuthority: accounts.metadataUpdateAuthority,
            program: this.program.client,
          });

    InstructionUtils.convertNumbersToBNs(
      args,
      ITEM_CLASS_DATA_ARGS_CONVERT_TO_BNS
    );
    InstructionUtils.convertStringsToPublicKeys(
      args,
      ITEM_CLASS_DATA_ARGS_CONVERT_TO_PUBKEYS
    );

    const [itemClassKey, itemClassBump] = await getItemPDA(
      accounts.itemMint,
      args.classIndex
    );

    return [
      await this.program.client.methods
        .updateItemClass(args)
        .accounts({
          itemClass: itemClassKey,
          parent: accounts.parent || web3.SystemProgram.programId,
          itemMint: accounts.itemMint,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
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
        parent:
          accounts.parentMint && !!args.parentClassIndex
            ? (
                await getItemPDA(accounts.parentMint, args.parentClassIndex)
              )[0]
            : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
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
            (this.program.client.provider as AnchorProvider).wallet.publicKey
          )
        )[0],
      payer: (this.program.client.provider as AnchorProvider).wallet.publicKey,
      amountToMake: args.amountToMake,
      componentScope: args.componentScope,
    });

    return [
      await this.program.client.methods
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
                (this.program.client.provider as AnchorProvider).wallet
                  .publicKey
              )
            )[0],
          newItemTokenHolder:
            accounts.newItemTokenHolder ||
            (this.program.client.provider as AnchorProvider).wallet.publicKey,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
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
        parent:
          accounts.parentMint && !!args.parentClassIndex
            ? (
                await getItemPDA(accounts.parentMint, args.parentClassIndex)
              )[0]
            : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
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
                (this.program.client.provider as AnchorProvider).wallet
                  .publicKey
            )
          )[0],
        payer:
          args.originator ||
          (this.program.client.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    return [
      await this.program.client.methods
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
                  (this.program.client.provider as AnchorProvider).wallet
                    .publicKey
              )
            )[0],
          newItemTokenHolder:
            accounts.newItemTokenHolder ||
            args.originator ||
            (this.program.client.provider as AnchorProvider).wallet.publicKey,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
  }

  async deactivateItemEscrow(
    args: DeactivateItemEscrowArgs,
    accounts: DeactivateItemEscrowAccounts,
    additionalArgs: DeactivateItemEscrowAdditionalArgs
  ) {
    args.newItemToken =
      args.newItemToken ||
      (
        await getAtaForMint(
          args.newItemMint,
          (this.program.client.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
    const itemEscrow = (
      await getItemEscrow({
        itemClassMint: args.itemClassMint,
        classIndex: args.classIndex,
        craftEscrowIndex: args.craftEscrowIndex,
        newItemMint: args.newItemMint,
        newItemToken: args.newItemToken,
        payer: (this.program.client.provider as AnchorProvider).wallet
          .publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    return [
      await this.program.client.methods
        .deactivateItemEscrow(args)
        .accounts({
          itemEscrow,
          originator: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
        })
        .instruction(),
    ];
  }

  async updateValidForUseIfWarmupPassed(
    args: UpdateValidForUseIfWarmupPassedArgs,
    accounts: UpdateValidForUseIfWarmupPassedAccounts,
    additionalArgs: UpdateValidForUseIfWarmupPassedAdditionalArgs = {}
  ) {
    const itemActivationMarker = (
      await getItemActivationMarker({
        itemMint: args.itemMint,
        index: args.index,
        itemAccount: accounts.itemAccount,
        usageIndex: new BN(args.usageIndex),
        amount: args.amount,
      })
    )[0];

    return [
      await this.program.client.methods
        .updateValidForUseIfWarmupPassed(args)
        .accounts({
          item: (await getItemPDA(args.itemMint, args.index))[0],
          itemAccount:
            accounts.itemAccount ||
            (
              await getAtaForMint(
                args.itemMint,
                (this.program.client.provider as AnchorProvider).wallet
                  .publicKey
              )
            )[0],
          itemClass: (await getItemPDA(args.itemClassMint, args.classIndex))[0],
          itemActivationMarker,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .instruction(),
    ];
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
        parent:
          accounts.parentMint && !!args.parentClassIndex
            ? (
                await getItemPDA(accounts.parentMint, args.parentClassIndex)
              )[0]
            : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    const itemClassKey = (
      await getItemPDA(accounts.itemClassMint, args.classIndex)
    )[0];
    const craftItemTokenAccount = (
      await getAtaForMint(
        accounts.craftItemTokenMint,
        (this.program.client.provider as AnchorProvider).wallet.publicKey
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
      payer: (this.program.client.provider as AnchorProvider).wallet.publicKey,
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
                (this.program.client.provider as AnchorProvider).wallet
                  .publicKey
            )
          )[0],
        payer:
          args.originator ||
          (this.program.client.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    const craftItem = (
      await getItemPDA(accounts.craftItemTokenMint, args.craftItemIndex)
    )[0];
    const craftItemObj = await this.program.client.account.item.fetch(
      craftItem
    );
    let instructions = [];

    instructions.push(
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        craftItemTokenAccount,
        accounts.craftItemTransferAuthority,
        (this.program.client.provider as AnchorProvider).wallet.publicKey,
        [],
        args.amountToContributeFromThisContributor.toNumber()
      )
    );
    instructions.push(
      await this.program.client.methods
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
                  (this.program.client.provider as AnchorProvider).wallet
                    .publicKey
              )
            )[0],
          newItemTokenHolder:
            accounts.newItemTokenHolder ||
            args.originator ||
            (this.program.client.provider as AnchorProvider).wallet.publicKey,
          craftItemTokenAccountEscrow: craftItemEscrow,
          craftItemTokenMint: accounts.craftItemTokenMint,
          craftItemTokenAccount,
          craftItem,
          craftItemClass: craftItemObj.parent as Address,
          craftItemTransferAuthority: accounts.craftItemTransferAuthority,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
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
        (this.program.client.provider as AnchorProvider).wallet.publicKey,
        []
      )
    );

    return instructions;
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
        parent:
          accounts.parentMint && !!args.parentClassIndex
            ? (
                await getItemPDA(accounts.parentMint, args.parentClassIndex)
              )[0]
            : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    const itemClassKey = (
      await getItemPDA(accounts.itemClassMint, args.classIndex)
    )[0];
    const craftItemTokenAccount = (
      await getAtaForMint(
        args.craftItemTokenMint,
        (this.program.client.provider as AnchorProvider).wallet.publicKey
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
      payer: (this.program.client.provider as AnchorProvider).wallet.publicKey,
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
                (this.program.client.provider as AnchorProvider).wallet
                  .publicKey
            )
          )[0],
        payer:
          args.originator ||
          (this.program.client.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    return [
      await this.program.client.methods
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
                  (this.program.client.provider as AnchorProvider).wallet
                    .publicKey
              )
            )[0],
          newItemTokenHolder:
            accounts.newItemTokenHolder ||
            args.originator ||
            (this.program.client.provider as AnchorProvider).wallet.publicKey,
          craftItemTokenAccountEscrow: craftItemEscrow,
          craftItemTokenAccount,
          craftItem: (
            await getItemPDA(args.craftItemTokenMint, args.craftItemIndex)
          )[0],
          craftItemClass: (
            await getItemPDA(args.craftItemClassMint, args.craftItemClassIndex)
          )[0],
          receiver: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
  }

  async beginItemActivation(
    args: BeginItemActivationArgs,
    accounts: BeginItemActivationAccounts,
    _additionalArgs: BeginItemActivationAdditionalArgs = {}
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.usagePermissivenessToUse,
        tokenMint: args.itemMint,
        parentMint: args.itemClassMint,
        parentIndex: args.classIndex,
        parent: (await getItemPDA(args.itemClassMint, args.classIndex))[0],
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    const itemClassKey = (
      await getItemPDA(args.itemClassMint, args.classIndex)
    )[0];

    const [itemActivationMarker, _] = await getItemActivationMarker({
      itemMint: args.itemMint,
      itemAccount: accounts.itemAccount,
      index: args.index,
      usageIndex: new BN(args.usageIndex),
      amount: args.amount,
    });

    const itemKey = (await getItemPDA(args.itemMint, args.index))[0];

    const validationKey =
      args.itemClass.object.itemClassData.config.usages?.[args.usageIndex]
        .validation?.key;
    const validationProgram: PublicKey = !!validationKey
      ? new web3.PublicKey(validationKey)
      : SystemProgram.programId;

    return [
      await this.program.client.methods
        .beginItemActivation(args)
        .accounts({
          itemClass: itemClassKey,
          item: itemKey,
          itemAccount: (accounts.itemAccount ||
            (
              await getAtaForMint(
                args.itemMint,
                (this.program.client.provider as AnchorProvider).wallet
                  .publicKey
              )
            )[0]) as Address,
          itemActivationMarker,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          validationProgram,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
  }

  async endItemActivation(
    args: EndItemActivationArgs,
    accounts: EndItemActivationAccounts,
    _additionalArgs: EndItemActivationAdditionalArgs = {}
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.usagePermissivenessToUse,
        tokenMint: accounts.itemMint,
        parentMint: args.itemClassMint,
        parentIndex: args.classIndex,
        parent: (await getItemPDA(args.itemClassMint, args.classIndex))[0],
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    const itemClassKey = (
      await getItemPDA(args.itemClassMint, args.classIndex)
    )[0];

    const itemActivationMarker = (
      await getItemActivationMarker({
        itemMint: accounts.itemMint,
        itemAccount: accounts.itemAccount,
        index: args.index,
        usageIndex: new BN(args.usageIndex),
        amount: args.amount,
      })
    )[0];

    const itemKey = (await getItemPDA(accounts.itemMint, args.index))[0];

    const instructions: TransactionInstruction[] = [];
    const itemTransferAuthority = accounts.itemTransferAuthority;

    if (itemTransferAuthority) {
      instructions.push(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          accounts.itemAccount,
          itemTransferAuthority.publicKey,
          (this.program.client.provider as AnchorProvider).wallet.publicKey,
          [],
          args.amount.toNumber()
        )
      );
    }
    instructions.push(
      await this.program.client.methods
        .endItemActivation(args)
        .accounts({
          itemClass: itemClassKey,
          item: itemKey,
          itemMint: accounts.itemMint,
          itemTransferAuthority: itemTransferAuthority
            ? itemTransferAuthority.publicKey
            : (this.program.client.provider as AnchorProvider).wallet.publicKey,
          itemAccount:
            accounts.itemAccount ||
            (
              await getAtaForMint(accounts.itemMint, accounts.originator)
            )[0],
          itemActivationMarker,
          tokenProgram: TOKEN_PROGRAM_ID,
          receiver:
            accounts.originator ||
            (this.program.client.provider as AnchorProvider).wallet.publicKey,
        })
        .remainingAccounts(remainingAccounts)
        .instruction()
    );

    if (itemTransferAuthority) {
      instructions.push(
        Token.createRevokeInstruction(
          TOKEN_PROGRAM_ID,
          accounts.itemAccount,
          (this.program.client.provider as AnchorProvider).wallet.publicKey,
          []
        )
      );
    }

    return instructions;
  }

  async drainItemEscrow(
    args: DrainItemEscrowArgs,
    accounts: DrainItemEscrowAccounts,
    _additionalArgs: DrainItemEscrowAdditionalArgs = {}
  ) {
    if (!args.newItemToken) {
      args.newItemToken = (
        await getAtaForMint(
          args.newItemMint,
          (this.program.client.provider as AnchorProvider).wallet.publicKey
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
        payer: (this.program.client.provider as AnchorProvider).wallet
          .publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    return [
      await this.program.client.methods
        .drainItemEscrow(args)
        .accounts({
          itemEscrow,
          originator: accounts.originator as Address,
        })
        .instruction(),
    ];
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
        parent:
          accounts.parentMint && !!args.parentClassIndex
            ? (
                await getItemPDA(accounts.parentMint, args.parentClassIndex)
              )[0]
            : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
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
                (this.program.client.provider as AnchorProvider).wallet
                  .publicKey
            )
          )[0],
        payer:
          args.originator ||
          (this.program.client.provider as AnchorProvider).wallet.publicKey,
        amountToMake: args.amountToMake,
        componentScope: args.componentScope,
      })
    )[0];

    return [
      await this.program.client.methods
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
                  (this.program.client.provider as AnchorProvider).wallet
                    .publicKey
              )
            )[0],
          newItemTokenHolder:
            accounts.newItemTokenHolder ||
            args.originator ||
            (this.program.client.provider as AnchorProvider).wallet.publicKey,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
  }

  async updateItem(
    args: UpdateItemArgs,
    _accounts: UpdateItemAccounts = {},
    _additionalArgs: UpdateItemAdditionalArgs = {}
  ) {
    const itemClassKey = (
      await getItemPDA(args.itemClassMint, args.classIndex)
    )[0];

    const itemKey = (await getItemPDA(args.itemMint, args.index))[0];
    return [
      await this.program.client.methods
        .updateItem(args)
        .accounts({
          itemClass: itemClassKey,
          item: itemKey,
        })
        .instruction(),
    ];
  }
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

export interface CreateItemClassAccounts {
  itemMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  parentOfParentClassMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
  parentUpdateAuthority: web3.PublicKey | null;
}

export interface CreateItemClassAdditionalArgs {}

export interface UpdateItemClassArgs {
  classIndex: BN;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
  parentClassIndex: null | BN;
  itemClassData: any | null;
}

export interface UpdateItemClassAccounts {
  itemMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface UpdateItemClassAdditionalArgs {
  permissionless: boolean;
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

export interface CreateItemEscrowAccounts {
  itemClassMint: web3.PublicKey;
  newItemMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface CreateItemEscrowAdditionalArgs {}

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

export interface CompleteItemEscrowBuildPhaseAccounts {
  itemClassMint: web3.PublicKey;
  newItemMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface CompleteItemEscrowBuildPhaseAdditionalArgs {}

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

export interface DeactivateItemEscrowAccounts {}

export interface DeactivateItemEscrowAdditionalArgs {}

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

export interface UpdateValidForUseIfWarmupPassedAccounts {
  itemAccount: web3.PublicKey | null;
}

export interface UpdateValidForUseIfWarmupPassedAdditionalArgs {}

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

export interface AddCraftItemToEscrowAccounts {
  itemClassMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  craftItemTokenMint: web3.PublicKey;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
  craftItemTransferAuthority: web3.PublicKey;
}

export interface AddCraftItemToEscrowAdditionalArgs {}

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

export interface RemoveCraftItemFromEscrowAccounts {
  itemClassMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface RemoveCraftItemFromEscrowAdditionalArgs {}

export interface BeginItemActivationArgs {
  classIndex: BN;
  index: BN;
  itemClassMint: web3.PublicKey;
  itemMint: web3.PublicKey;
  itemMarkerSpace: number;
  usagePermissivenessToUse: null | AnchorPermissivenessType;
  amount: BN;
  usageIndex: number;
  usageInfo: null;
  itemClass: ItemClassWrapper;
  target: web3.PublicKey | null;
}

export interface BeginItemActivationAccounts {
  itemAccount: null | web3.PublicKey;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface BeginItemActivationAdditionalArgs {}

export interface EndItemActivationArgs {
  classIndex: BN;
  index: BN;
  itemClassMint: web3.PublicKey;
  usagePermissivenessToUse: null | AnchorPermissivenessType;
  amount: BN;
  usageIndex: number;
  usageInfo: null;
}

export interface EndItemActivationAccounts {
  originator: web3.PublicKey;
  itemMint: web3.PublicKey;
  itemAccount: null | web3.PublicKey;
  itemTransferAuthority: null | web3.Keypair;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface EndItemActivationAdditionalArgs {}

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

export interface DrainItemEscrowAccounts {
  originator: web3.PublicKey | null;
}

export interface DrainItemEscrowAdditionalArgs {}

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

export interface StartItemEscrowBuildPhaseAccounts {
  itemClassMint: web3.PublicKey;
  newItemToken: web3.PublicKey | null;
  newItemTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface StartItemEscrowBuildPhaseAdditionalArgs {}

export interface UpdateItemArgs {
  classIndex: BN;
  index: BN;
  itemMint: web3.PublicKey;
  itemClassMint: web3.PublicKey;
}

export interface UpdateItemAccounts {}

export interface UpdateItemAdditionalArgs {}
