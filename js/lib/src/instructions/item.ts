import { web3, AnchorProvider, BN, Address } from "@project-serum/anchor";
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import * as splToken from "spl-token-latest";
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
  getPack,
} from "../utils/pda";
import {
  MPL_AUTH_RULES_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "../constants/programIds";
import { AnchorPermissivenessType } from "../../src/state/common";
import { ContractCommon } from "../contract/common";
import { ItemClassWrapper } from "../contract/item";
import * as cmp from "@solana/spl-account-compression";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import { Constants, Utils } from "../main";
import { sha256 } from "js-sha256";

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
        accounts.parentOfParentClass ||
        (args.parentOfParentClassIndex && accounts.parentOfParentClassMint
          ? (
              await getItemPDA(
                accounts.parentOfParentClassMint,
                args.parentOfParentClassIndex
              )
            )[0]
          : null),
      metadataUpdateAuthority: accounts.metadataUpdateAuthority,
      parentUpdateAuthority: accounts.parentUpdateAuthority,
      program: this.program,
    });
    const edition = await getEdition(accounts.itemMint);
    const editionSize =
      await this.program.client.provider.connection.getAccountInfo(edition);
    if (!editionSize) {
      remainingAccounts.push({
        pubkey: accounts.mintAuthority || accounts.metadataUpdateAuthority,
        isWritable: false,
        isSigner: true,
      });
      remainingAccounts.push({
        pubkey: TOKEN_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      });
    }

    return [
      await this.program.client.methods
        .createItemClass(args)
        .accounts({
          itemClass: itemClassKey,
          itemMint: accounts.itemMint,
          metadata: await getMetadata(accounts.itemMint),
          edition,
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
            parentHolderOrTokenHolder: accounts.parentHolderOrTokenHolder,
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
        parentHolderOrTokenHolder: accounts.parentHolderOrTokenHolder,
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

    const edition = await getEdition(accounts.newItemMint);
    const editionSize =
      await this.program.client.provider.connection.getAccountInfo(edition);
    if (!editionSize) {
      remainingAccounts.push({
        pubkey: accounts.mintAuthority || accounts.metadataUpdateAuthority,
        isWritable: false,
        isSigner: true,
      });
      remainingAccounts.push({
        pubkey: TOKEN_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      });
    }

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
        parentHolderOrTokenHolder: accounts.parentHolderOrTokenHolder,
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
        parentHolderOrTokenHolder: accounts.parentHolderOrTokenHolder,
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
    const instructions = [];

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
        parentHolderOrTokenHolder: accounts.parentHolderOrTokenHolder,
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
        parentHolderOrTokenHolder: accounts.parentHolderOrTokenHolder,
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

    const usages = args.itemClass.object.itemClassData.config?.usages;
    const maybeSelectedUsage = usages ? usages[args.usageIndex] : null;
    const validationKey = maybeSelectedUsage?.validation?.key;

    const validationProgram: PublicKey = validationKey
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
        parentHolderOrTokenHolder: accounts.parentHolderOrTokenHolder,
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
        parentHolderOrTokenHolder: accounts.parentHolderOrTokenHolder,
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

  //
  // V1
  //

  async createItemClassV1(
    args: CreateItemClassV1Args
  ): Promise<[web3.PublicKey, web3.Keypair, web3.TransactionInstruction[]]> {
    const items = web3.Keypair.generate();

    const maxDepth = 16;
    const maxBufferSize = 64;

    const treeSpace = cmp.getConcurrentMerkleTreeAccountSize(
      maxDepth,
      maxBufferSize
      //maxDepth // store max depth of tree in the canopy
    );

    const treeLamports =
      await this.program.client.provider.connection.getMinimumBalanceForRentExemption(
        treeSpace
      );

    const createMembersAccountIx = await web3.SystemProgram.createAccount({
      fromPubkey: this.program.client.provider.publicKey!,
      newAccountPubkey: items.publicKey,
      lamports: treeLamports,
      space: treeSpace,
      programId: cmp.PROGRAM_ID,
    });

    const itemClass = Utils.PDA.getItemClassV1(items.publicKey);

    const recipe = Utils.PDA.getRecipe(itemClass, new BN(0));

    const ingredients: any[] = [];
    for (const ingredientArg of args.recipeArgs.ingredientArgs) {
      let degradationBuildEffect;
      if (ingredientArg.buildEffect.degradation) {
        degradationBuildEffect = {
          on: { rate: ingredientArg.buildEffect.degradation.rate },
        };
      } else {
        degradationBuildEffect = { off: {} };
      }

      let cooldownBuildEffect;
      if (ingredientArg.buildEffect.cooldown) {
        cooldownBuildEffect = {
          on: { seconds: ingredientArg.buildEffect.cooldown.seconds },
        };
      } else {
        cooldownBuildEffect = { off: {} };
      }

      const ingredient = {
        itemClass: ingredientArg.itemClass,
        requiredAmount: ingredientArg.requiredAmount,
        buildEffect: {
          degradation: degradationBuildEffect,
          cooldown: cooldownBuildEffect,
        },
      };

      ingredients.push(ingredient);
    }

    const ixArgs = {
      recipeArgs: {
        buildEnabled: args.recipeArgs.buildEnabled,
        payment: args.recipeArgs.payment,
        ingredients: ingredients,
      },
      outputMode: formatItemClassV1OutputMode(args.outputMode),
    };

    const ix = await this.program.client.methods
      .createItemClassV1(ixArgs)
      .accounts({
        items: items.publicKey,
        itemClass: itemClass,
        recipe: recipe,
        authority: this.program.client.provider.publicKey!,
        rent: web3.SYSVAR_RENT_PUBKEY,
        accountCompression: cmp.PROGRAM_ID,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return [itemClass, items, [createMembersAccountIx, ix]];
  }

  async addItemsToItemClass(
    accounts: AddItemsToItemClass
  ): Promise<web3.TransactionInstruction[]> {
    const itemClassData = await this.program.client.account.itemClassV1.fetch(
      accounts.itemClass
    );
    const itemClassItems = new web3.PublicKey(itemClassData.items);

    const ixns: web3.TransactionInstruction[] = [];
    for (const itemMint of accounts.itemMints) {
      const ix = await this.program.client.methods
        .addItemToItemClass()
        .accounts({
          itemMint: itemMint,
          itemClass: accounts.itemClass,
          items: itemClassItems,
          authority: this.program.client.provider.publicKey!,
          logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
          accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        })
        .instruction();

      ixns.push(ix);
    }

    return ixns;
  }

  async addPackToItemClass(
    accounts: AddPackToItemClassAccounts,
    args: AddPackToItemClassArgs
  ): Promise<[web3.TransactionInstruction, web3.PublicKey]> {
    const itemClassData = await this.program.client.account.itemClassV1.fetch(
      accounts.itemClass
    );
    const itemClassItems = new web3.PublicKey(itemClassData.items);

    const packIndex = new BN((itemClassData.outputMode as any).index);

    const packAccount = getPack(accounts.itemClass, packIndex);

    const ix = await this.program.client.methods
      .addPackToItemClass(args)
      .accounts({
        pack: packAccount,
        itemClass: accounts.itemClass,
        items: itemClassItems,
        authority: this.program.client.provider.publicKey!,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .instruction();

    return [ix, packAccount];
  }

  async startBuild(
    accounts: StartBuildAccounts,
    args: StartBuildArgs
  ): Promise<web3.TransactionInstruction> {
    const recipe = Utils.PDA.getRecipe(accounts.itemClass, args.recipeIndex);

    const build = Utils.PDA.getBuild(accounts.itemClass, accounts.builder);

    const ix = await this.program.client.methods
      .startBuild(args)
      .accounts({
        build: build,
        recipe: recipe,
        itemClass: accounts.itemClass,
        builder: accounts.builder,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix;
  }

  async addIngredient(
    accounts: AddIngredientAccounts,
    args: AddIngredientArgs
  ): Promise<web3.TransactionInstruction[]> {
    const item = Utils.PDA.getItemV1(accounts.ingredientMint);
    const build = Utils.PDA.getBuild(accounts.itemClass, accounts.builder);

    // detect what type of token we are adding
    const tokenStandard = await Utils.Item.getTokenStandard(
      this.program.client.provider.connection,
      accounts.ingredientMint
    );

    const ixns: web3.TransactionInstruction[] = [];
    if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
      const pNftIxns = await this.addIngredientPnft(accounts, build, item);
      ixns.push(...pNftIxns);
    } else {
      const ix = await this.addIngredientSpl(accounts, build, item, args);
      ixns.push(ix);
    }

    return ixns;
  }

  private async addIngredientSpl(
    accounts: AddIngredientAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey,
    args: AddIngredientArgs
  ): Promise<web3.TransactionInstruction> {
    const ingredientSource = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      accounts.builder
    );
    const ingredientDestination = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      build,
      true
    );

    const ix = await this.program.client.methods
      .addIngredientSpl(args)
      .accounts({
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientSource: ingredientSource,
        ingredientDestination: ingredientDestination,
        build: build,
        item: item,
        builder: accounts.builder,
        payer: accounts.payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

    return ix;
  }

  private async addIngredientPnft(
    accounts: AddIngredientAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey
  ): Promise<web3.TransactionInstruction[]> {
    const [ingredientMetadata, _ingredientMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const ingredientMetadataData = await mpl.Metadata.fromAccountAddress(
      this.program.client.provider.connection,
      ingredientMetadata,
      "confirmed"
    );

    const [ingredientME, _ingredientMEBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("edition"),
        ],
        mpl.PROGRAM_ID
      );

    const ingredientSource = splToken.getAssociatedTokenAddressSync(
      accounts.ingredientMint,
      accounts.builder
    );

    const ingredientDestination = splToken.getAssociatedTokenAddressSync(
      accounts.ingredientMint,
      build,
      true
    );

    const [ingredientSourceTokenRecord, _ingredientSourceTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("token_record"),
          ingredientSource.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [
      ingredientDestinationTokenRecord,
      _ingredientDestinationTokenRecordBump,
    ] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        accounts.ingredientMint.toBuffer(),
        Buffer.from("token_record"),
        ingredientDestination.toBuffer(),
      ],
      mpl.PROGRAM_ID
    );

    // double CU and fee

    const increaseCUIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    const addPriorityFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 5000,
    });

    const ix = await this.program.client.methods
      .addIngredientPnft()
      .accounts({
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientMetadata: ingredientMetadata,
        ingredientEdition: ingredientME,
        authRules: ingredientMetadataData.programmableConfig.ruleSet,
        ingredientSource: ingredientSource,
        ingredientSourceTokenRecord: ingredientSourceTokenRecord,
        ingredientDestination: ingredientDestination,
        ingredientDestinationTokenRecord: ingredientDestinationTokenRecord,
        build: build,
        item: item,
        payer: accounts.payer,
        builder: accounts.builder,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadata: TOKEN_METADATA_PROGRAM_ID,
        authRulesProgram: Constants.ProgramIds.MPL_AUTH_RULES_PROGRAM_ID,
      })
      .instruction();

    return [increaseCUIx, addPriorityFeeIx, ix];
  }

  async verifyIngredient(
    accounts: VerifyIngredientAccounts,
    args: VerifyIngredientArgs
  ): Promise<web3.TransactionInstruction> {
    const ingredientItemClassData =
      await this.program.client.account.itemClassV1.fetch(
        accounts.ingredientItemClass
      );
    const ingredientItemClassItems = new web3.PublicKey(
      ingredientItemClassData.items
    );

    const build = Utils.PDA.getBuild(accounts.itemClass, accounts.builder);

    const proofAsRemainingAccounts = [];
    for (const node of args.proof) {
      const nodeAccount = {
        pubkey: new web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
      };
      proofAsRemainingAccounts.push(nodeAccount);
    }

    const ixArgs = {
      root: args.root,
      leafIndex: args.leafIndex,
    };

    const ix = await this.program.client.methods
      .verifyIngredient(ixArgs)
      .accounts({
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientItemClassItems: ingredientItemClassItems,
        build: build,
        payer: accounts.payer,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async verifyIngredientTest(
    accounts: VerifyIngredientTestAccounts,
    args: VerifyIngredientArgs
  ): Promise<web3.TransactionInstruction> {
    const ingredientItemClassData =
      await this.program.client.account.itemClassV1.fetch(
        accounts.ingredientItemClass
      );
    const ingredientItemClassItems = new web3.PublicKey(
      ingredientItemClassData.items
    );

    const proofAsRemainingAccounts = [];
    for (const node of args.proof) {
      const nodeAccount = {
        pubkey: new web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
      };
      proofAsRemainingAccounts.push(nodeAccount);
    }

    const ixArgs = {
      root: Buffer.from(args.root.toString()),
      leafIndex: args.leafIndex,
    };

    const ix = await this.program.client.methods
      .verifyIngredientTest(ixArgs)
      .accounts({
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientItemClassItems: ingredientItemClassItems,
        payer: accounts.payer,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async completeBuildItem(
    accounts: CompleteBuildItemAccounts,
    args: CompleteBuildItemArgs
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );

    const itemClass = new web3.PublicKey(buildData.itemClass);

    const itemClassData = await this.program.client.account.itemClassV1.fetch(
      itemClass
    );
    const itemClassItems = new web3.PublicKey(itemClassData.items);

    const proofAsRemainingAccounts = [];
    for (const node of args.proof) {
      const nodeAccount = {
        pubkey: new web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
      };
      proofAsRemainingAccounts.push(nodeAccount);
    }

    const ixArgs = {
      root: args.root,
      leafIndex: args.leafIndex,
    };

    const ix = await this.program.client.methods
      .completeBuildItem(ixArgs)
      .accounts({
        itemMint: accounts.itemMint,
        itemClass: itemClass,
        itemClassItems: itemClassItems,
        build: accounts.build,
        payer: accounts.payer,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async completeBuildPack(
    accounts: CompleteBuildPackAccounts,
    args: CompleteBuildPackArgs
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );

    const itemClass = new web3.PublicKey(buildData.itemClass);

    const itemClassData = await this.program.client.account.itemClassV1.fetch(
      itemClass
    );
    const itemClassItems = new web3.PublicKey(itemClassData.items);

    const proofAsRemainingAccounts = [];
    for (const node of args.proof) {
      const nodeAccount = {
        pubkey: new web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
      };
      proofAsRemainingAccounts.push(nodeAccount);
    }

    const ixArgs = {
      root: args.root,
      leafIndex: args.leafIndex,
      packContents: args.packContents,
      packContentsHashNonce: args.packContentsHashNonce,
    };

    const ix = await this.program.client.methods
      .completeBuildPack(ixArgs)
      .accounts({
        pack: accounts.pack,
        itemClass: itemClass,
        itemClassItems: itemClassItems,
        build: accounts.build,
        payer: accounts.payer,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async receiveItem(
    accounts: ReceiveItemAccounts
  ): Promise<web3.TransactionInstruction[][]> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );

    const ixnGroups: web3.TransactionInstruction[][] = [];
    for (let item of (buildData.output as any).items) {
      // if received already, dont send again
      if (item.received === true) {
        continue;
      }

      const itemMint = new web3.PublicKey(item.mint);

      // detect what type of token we are adding
      const tokenStandard = await Utils.Item.getTokenStandard(
        this.program.client.provider.connection,
        new web3.PublicKey(item.mint)
      );

      if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
        const pNftIxns = await this.receiveItemPNft(
          accounts.build,
          accounts.payer,
          itemMint
        );
        ixnGroups.push(pNftIxns);
      } else {
        const splIx = await this.receiveItemSpl(
          accounts.build,
          accounts.payer,
          itemMint
        );
        ixnGroups.push([splIx]);
      }
    }

    return ixnGroups;
  }

  private async receiveItemPNft(
    build: web3.PublicKey,
    payer: web3.PublicKey,
    itemMint: web3.PublicKey
  ): Promise<web3.TransactionInstruction[]> {
    const buildData = await this.program.client.account.build.fetch(build);

    const itemClass = new web3.PublicKey(buildData.itemClass);
    const builder = new web3.PublicKey(buildData.builder);

    const [itemMetadata, _itemMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );
    const itemMetadataData = await mpl.Metadata.fromAccountAddress(
      this.program.client.provider.connection,
      itemMetadata,
      "confirmed"
    );

    const [itemME, _itemMEBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        itemMint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

    const itemSource = splToken.getAssociatedTokenAddressSync(
      itemMint,
      itemClass,
      true
    );
    const itemDestination = await splToken.getAssociatedTokenAddress(
      itemMint,
      builder
    );

    const [itemSourceTokenRecord, _itemSourceTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMint.toBuffer(),
          Buffer.from("token_record"),
          itemSource.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [itemDestinationTokenRecord, _itemDestinationTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMint.toBuffer(),
          Buffer.from("token_record"),
          itemDestination.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    // double CU and fee

    const increaseCUIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    const addPriorityFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 5000,
    });

    const ix = await this.program.client.methods
      .receiveItemPnft()
      .accounts({
        itemMint: itemMint,
        itemMetadata: itemMetadata,
        itemEdition: itemME,
        authRules: itemMetadataData.programmableConfig.ruleSet,
        itemSource: itemSource,
        itemSourceTokenRecord: itemSourceTokenRecord,
        itemDestination: itemDestination,
        itemDestinationTokenRecord: itemDestinationTokenRecord,
        itemClass: itemClass,
        build: build,
        builder: builder,
        payer: payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadata: TOKEN_METADATA_PROGRAM_ID,
        authRulesProgram: MPL_AUTH_RULES_PROGRAM_ID,
      })
      .instruction();

    return [increaseCUIx, addPriorityFeeIx, ix];
  }

  private async receiveItemSpl(
    build: web3.PublicKey,
    payer: web3.PublicKey,
    itemMint: web3.PublicKey
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(build);

    const itemClass = new web3.PublicKey(buildData.itemClass);
    const builder = new web3.PublicKey(buildData.builder);

    const itemSource = splToken.getAssociatedTokenAddressSync(
      itemMint,
      itemClass,
      true
    );
    const itemDestination = await splToken.getAssociatedTokenAddress(
      itemMint,
      builder
    );

    return await this.program.client.methods
      .receiveItemSpl()
      .accounts({
        itemMint: itemMint,
        itemSource: itemSource,
        itemDestination: itemDestination,
        itemClass: itemClass,
        build: build,
        builder: builder,
        payer: payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();
  }

  async applyBuildEffect(
    accounts: ApplyBuildEffectAccounts
  ): Promise<web3.TransactionInstruction> {
    const item = Utils.PDA.getItemV1(accounts.ingredientMint);

    const ix = await this.program.client.methods
      .applyBuildEffect()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        build: accounts.build,
        payer: accounts.payer,
      })
      .instruction();
    return ix;
  }

  async returnIngredient(
    accounts: ReturnIngredientAccounts
  ): Promise<web3.TransactionInstruction[]> {
    const item = Utils.PDA.getItemV1(accounts.ingredientMint);

    // detect what type of token we are adding
    const tokenStandard = await Utils.Item.getTokenStandard(
      this.program.client.provider.connection,
      accounts.ingredientMint
    );

    const ixns: web3.TransactionInstruction[] = [];
    if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
      const pNftIxns = await this.returnIngredientPNft(
        accounts,
        accounts.build,
        item
      );
      ixns.push(...pNftIxns);
    } else {
      const ix = await this.returnIngredientSpl(accounts, accounts.build, item);
      ixns.push(ix);
    }

    return ixns;
  }

  private async returnIngredientPNft(
    accounts: ReturnIngredientAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey
  ): Promise<web3.TransactionInstruction[]> {
    const [itemMetadata, _itemMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const itemMetadataData = await mpl.Metadata.fromAccountAddress(
      this.program.client.provider.connection,
      itemMetadata,
      "confirmed"
    );

    const [itemME, _itemMEBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        accounts.ingredientMint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

    const buildData = await this.program.client.account.build.fetch(build);
    const builder = new web3.PublicKey(buildData.builder);

    const itemSource = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      build,
      true
    );
    const itemDestination = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      builder
    );

    const [itemSourceTokenRecord, _itemSourceTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("token_record"),
          itemSource.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [itemDestinationTokenRecord, _itemDestinationTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("token_record"),
          itemDestination.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    // double CU and fee

    const increaseCUIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    const addPriorityFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 5000,
    });

    const ix = await this.program.client.methods
      .returnIngredientPnft()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        itemMetadata: itemMetadata,
        itemEdition: itemME,
        authRules: itemMetadataData.programmableConfig.ruleSet,
        itemSource: itemSource,
        itemSourceTokenRecord: itemSourceTokenRecord,
        itemDestination: itemDestination,
        itemDestinationTokenRecord: itemDestinationTokenRecord,
        build: build,
        builder: builder,
        payer: accounts.payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadata: TOKEN_METADATA_PROGRAM_ID,
        authRulesProgram: Constants.ProgramIds.MPL_AUTH_RULES_PROGRAM_ID,
      })
      .instruction();

    return [increaseCUIx, addPriorityFeeIx, ix];
  }

  private async returnIngredientSpl(
    accounts: ReturnIngredientAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(build);
    const builder = new web3.PublicKey(buildData.builder);

    const itemSource = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      build,
      true
    );
    const itemDestination = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      builder
    );

    const ix = await this.program.client.methods
      .returnIngredientSpl()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        itemSource: itemSource,
        itemDestination: itemDestination,
        build: build,
        builder: builder,
        payer: accounts.payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();
    return ix;
  }

  async destroyIngredient(
    accounts: DestroyIngredientAccounts
  ): Promise<web3.TransactionInstruction[]> {
    const item = Utils.PDA.getItemV1(accounts.ingredientMint);

    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );
    const builder = new web3.PublicKey(buildData.builder);

    const tokenStandard = await Utils.Item.getTokenStandard(
      this.program.client.provider.connection,
      accounts.ingredientMint
    );

    const itemSource = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      accounts.build,
      true
    );

    const ixns: web3.TransactionInstruction[] = [];
    if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
      const pNftIx = await this.destroyIngredientPnft(
        accounts,
        item,
        itemSource
      );
      ixns.push(pNftIx);
    } else {
      const ix = await this.destroyIngredientSpl(
        accounts,
        item,
        builder,
        itemSource
      );
      ixns.push(ix);
    }

    return ixns;
  }

  private async destroyIngredientPnft(
    accounts: DestroyIngredientAccounts,
    item: web3.PublicKey,
    itemAta: web3.PublicKey
  ): Promise<web3.TransactionInstruction> {
    const [itemMetadata, _itemMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [itemME, _itemMEBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        accounts.ingredientMint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

    const [itemTokenRecord, _itemTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("token_record"),
          itemAta.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const itemMetadataData = await mpl.Metadata.fromAccountAddress(
      this.program.client.provider.connection,
      itemMetadata
    );

    const [collectionMetadata, _collectionMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMetadataData.collection.key.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const ix = await this.program.client.methods
      .destroyIngredientPnft()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        itemMetadata: itemMetadata,
        collectionMetadata: collectionMetadata,
        itemEdition: itemME,
        itemAta: itemAta,
        itemTokenRecord: itemTokenRecord,
        build: accounts.build,
        payer: accounts.payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenMetadata: TOKEN_METADATA_PROGRAM_ID,
      })
      .instruction();

    return ix;
  }

  private async destroyIngredientSpl(
    accounts: DestroyIngredientAccounts,
    item: web3.PublicKey,
    builder: web3.PublicKey,
    itemSource: web3.PublicKey
  ): Promise<web3.TransactionInstruction> {
    const ix = await this.program.client.methods
      .destroyIngredientSpl()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        itemSource: itemSource,
        build: accounts.build,
        builder: builder,
        payer: accounts.payer,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return ix;
  }

  async createRecipe(
    accounts: CreateRecipeAccounts,
    args: CreateRecipeArgs
  ): Promise<web3.TransactionInstruction> {
    const ingredients: any[] = [];
    for (const ingredientArg of args.args.ingredientArgs) {
      let degradationBuildEffect;
      if (ingredientArg.buildEffect.degradation) {
        degradationBuildEffect = {
          on: { rate: ingredientArg.buildEffect.degradation.rate },
        };
      } else {
        degradationBuildEffect = { off: {} };
      }

      let cooldownBuildEffect;
      if (ingredientArg.buildEffect.cooldown) {
        cooldownBuildEffect = {
          on: { seconds: ingredientArg.buildEffect.cooldown.seconds },
        };
      } else {
        cooldownBuildEffect = { off: {} };
      }

      const ingredient = {
        itemClass: ingredientArg.itemClass,
        requiredAmount: ingredientArg.requiredAmount,
        buildEffect: {
          degradation: degradationBuildEffect,
          cooldown: cooldownBuildEffect,
        },
      };

      ingredients.push(ingredient);
    }

    const ixArgs = {
      buildEnabled: args.args.buildEnabled,
      ingredients: ingredients,
      payment: args.args.payment,
    };

    const itemClassData = await this.program.client.account.itemClassV1.fetch(
      accounts.itemClass
    );

    // get new recipe pda based off item class recipe index
    const newRecipe = Utils.PDA.getRecipe(
      accounts.itemClass,
      (itemClassData.recipeIndex as BN).add(new BN(1))
    );

    const ix = await this.program.client.methods
      .createRecipe(ixArgs)
      .accounts({
        recipe: newRecipe,
        itemClass: accounts.itemClass,
        authority: accounts.authority,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    return ix;
  }

  async closeBuild(
    accounts: CloseBuildAccounts
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );
    const builder = new web3.PublicKey(buildData.builder);

    const ix = await this.program.client.methods
      .closeBuild()
      .accounts({
        build: accounts.build,
        builder: builder,
        payer: accounts.payer,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix;
  }

  async addPayment(
    accounts: AddPaymentAccounts
  ): Promise<web3.TransactionInstruction> {
    const ix = await this.program.client.methods
      .addPayment()
      .accounts({
        build: accounts.build,
        builder: accounts.builder,
        treasury: accounts.treasury,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    return ix;
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
  parentOfParentClass: web3.PublicKey | null;
  parentOfParentClassMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
  parentUpdateAuthority: web3.PublicKey | null;
  mintAuthority?: web3.PublicKey | null;
  parentHolderOrTokenHolder?: web3.PublicKey;
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
  parentHolderOrTokenHolder?: web3.PublicKey;
}

export interface UpdateItemClassAdditionalArgs {
  permissionless: boolean;
}

export interface CreateItemEscrowArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: string;
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
  mintAuthority?: web3.PublicKey | null;
  parentHolderOrTokenHolder?: web3.PublicKey;
}

export interface CreateItemEscrowAdditionalArgs {}

export interface CompleteItemEscrowBuildPhaseArgs {
  classIndex: BN;
  newItemIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: string;
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
  parentHolderOrTokenHolder?: web3.PublicKey;
}

export interface CompleteItemEscrowBuildPhaseAdditionalArgs {}

export interface DeactivateItemEscrowArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: string;
  amountToMake: BN;
  itemClassMint: web3.PublicKey;
  newItemMint: web3.PublicKey;
  newItemToken: web3.PublicKey;
}

export interface DeactivateItemEscrowAccounts {
  parentHolderOrTokenHolder?: web3.PublicKey;
}

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
  parentHolderOrTokenHolder?: web3.PublicKey;
}

export interface UpdateValidForUseIfWarmupPassedAdditionalArgs {}

export interface AddCraftItemToEscrowArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftItemIndex: BN;
  craftEscrowIndex: BN;
  craftItemClassIndex: BN;
  craftItemClassMint: web3.PublicKey;
  componentScope: string;
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
  parentHolderOrTokenHolder?: web3.PublicKey;
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
  componentScope: string;
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
  parentHolderOrTokenHolder?: web3.PublicKey;
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
  parentHolderOrTokenHolder?: web3.PublicKey;
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
  parentHolderOrTokenHolder?: web3.PublicKey;
}

export interface EndItemActivationAdditionalArgs {}

export interface DrainItemEscrowArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: string;
  amountToMake: BN;
  itemClassMint: web3.PublicKey;
  newItemMint: web3.PublicKey;
  newItemToken: web3.PublicKey;
}

export interface DrainItemEscrowAccounts {
  originator: web3.PublicKey | null;
  parentHolderOrTokenHolder?: web3.PublicKey;
}

export interface DrainItemEscrowAdditionalArgs {}

export interface StartItemEscrowBuildPhaseArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  craftEscrowIndex: BN;
  componentScope: string;
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
  parentHolderOrTokenHolder?: web3.PublicKey;
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

//
// V1
//

export interface CreateItemClassV1Args {
  recipeArgs: RecipeArgs;
  outputMode: ItemClassV1OutputMode;
}

export interface RecipeArgs {
  buildEnabled: boolean;
  payment: Payment | null;
  ingredientArgs: RecipeIngredientDataArgs[];
}

export type ItemClassV1OutputMode =
  | { kind: "Item" }
  | { kind: "Pack"; index: BN };

export function formatItemClassV1OutputMode(mode: ItemClassV1OutputMode): any {
  switch (mode.kind) {
    case "Item":
      return { item: {} };
    case "Pack":
      return { pack: { index: mode.index } };
  }
}

export interface PaymentState {
  paid: boolean;
  paymentDetails: Payment;
}

export interface Payment {
  treasury: web3.PublicKey;
  amount: BN;
}

export interface RecipeIngredientDataArgs {
  itemClass: web3.PublicKey;
  requiredAmount: BN;
  buildEffect: BuildEffect;
}

export interface BuildEffect {
  degradation: Degradation | null;
  cooldown: Cooldown | null;
}

export interface Degradation {
  rate: BN;
}

export interface Cooldown {
  seconds: BN;
}

export interface BuildOutput {
  items: BuildOutputItem[];
}

export interface BuildOutputItem {
  mint: web3.PublicKey;
  amount: BN;
  received: boolean;
}

export interface StartBuildAccounts {
  itemClass: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface StartBuildArgs {
  recipeIndex: BN;
}

export interface AddIngredientAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  itemClass: web3.PublicKey;
  payer: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface AddIngredientArgs {
  amount: BN;
}

export interface VerifyIngredientAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  itemClass: web3.PublicKey;
  payer: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface VerifyIngredientArgs {
  root: Buffer;
  leafIndex: number;
  proof: Buffer[];
}

export interface VerifyIngredientTestAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface CompleteBuildItemAccounts {
  itemMint: web3.PublicKey;
  payer: web3.PublicKey;
  build: web3.PublicKey;
}

export interface CompleteBuildItemArgs {
  root: Buffer;
  leafIndex: number;
  proof: Buffer[];
}

export interface CompleteBuildPackAccounts {
  pack: web3.PublicKey;
  payer: web3.PublicKey;
  build: web3.PublicKey;
}

export interface CompleteBuildPackArgs {
  root: Buffer;
  leafIndex: number;
  proof: Buffer[];
  packContents: PackContents;
  packContentsHashNonce: Uint8Array;
}

export interface ReceiveItemAccounts {
  build: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface AddItemsToItemClass {
  itemClass: web3.PublicKey;
  itemMints: web3.PublicKey[];
}

export interface AddPackToItemClassAccounts {
  itemClass: web3.PublicKey;
}

export interface AddPackToItemClassArgs {
  contentsHash: Buffer;
}

export class PackContents {
  readonly entries: PackContentsEntry[];

  constructor(entries: PackContentsEntry[]) {
    this.entries = entries;
  }

  hash(nonce: Uint8Array): Buffer {
    // match this with the program code
    if (nonce.length !== 16) {
      throw new Error(`nonce must be 16 bytes`);
    }
    const contentBuffers = this.entries.map((entry) =>
      Buffer.concat([
        entry.mint.toBuffer(),
        entry.amount.toArrayLike(Buffer, "le", 8),
      ])
    );

    const digest = sha256.digest(
      Buffer.concat([...contentBuffers, Buffer.from(nonce)])
    );
    const hash = Buffer.from(digest);

    return hash;
  }
}

export interface PackContentsEntry {
  mint: web3.PublicKey;
  amount: BN;
}

export interface ApplyBuildEffectAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  build: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface ReturnIngredientAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  build: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface CreateRecipeAccounts {
  itemClass: web3.PublicKey;
  authority: web3.PublicKey;
}

export interface CreateRecipeArgs {
  args: RecipeArgs;
}

export interface DestroyIngredientAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  payer: web3.PublicKey;
  build: web3.PublicKey;
}

export interface CloseBuildAccounts {
  build: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface AddPaymentAccounts {
  build: web3.PublicKey;
  builder: web3.PublicKey;
  treasury: web3.PublicKey;
}
