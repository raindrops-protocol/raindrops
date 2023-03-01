import { web3, AnchorProvider, BN, Address } from "@project-serum/anchor";
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
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

  async createItemClassV1(
    args: CreateItemClassV1Args
  ): Promise<[web3.PublicKey, web3.Keypair, web3.TransactionInstruction[]]> {
    const items = web3.Keypair.generate();

    const maxDepth = 14;
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

    const [itemClass, _itemClassBump] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("item_class_v1"), items.publicKey.toBuffer()],
      this.program.id
    );

    const [schema, _schemaBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("schema"),
        new BN(0).toArrayLike(Buffer, "le", 8),
        itemClass.toBuffer(),
      ],
      this.program.id
    );

    const materials: any[] = [];
    for (let materialArg of args.schemaArgs.materialArgs) {
      let degredationBuildEffect;
      if (materialArg.buildEffect.degredation) {
        degredationBuildEffect = {
          on: { amount: materialArg.buildEffect.degredation.amount },
        };
      } else {
        degredationBuildEffect = { off: {} };
      }

      let cooldownBuildEffect;
      if (materialArg.buildEffect.cooldown) {
        cooldownBuildEffect = {
          on: { seconds: materialArg.buildEffect.cooldown.seconds },
        };
      } else {
        cooldownBuildEffect = { off: {} };
      }

      let material = {
        itemClass: materialArg.itemClass,
        requiredAmount: materialArg.requiredAmount,
        buildEffect: {
          degredation: degredationBuildEffect,
          cooldown: cooldownBuildEffect,
        },
      };

      materials.push(material);
    }

    const ixArgs = {
      schemaArgs: {
        buildEnabled: args.schemaArgs.buildEnabled,
        materials: materials,
      },
    };

    const ix = await this.program.client.methods
      .createItemClassV1(ixArgs)
      .accounts({
        items: items.publicKey,
        itemClass: itemClass,
        schema: schema,
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
    for (let itemMint of accounts.itemMints) {
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

  async startBuild(
    accounts: StartBuildAccounts,
    args: StartBuildArgs
  ): Promise<web3.TransactionInstruction> {
    const [schema, _schemaBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("schema"),
        args.schemaIndex.toArrayLike(Buffer, "le", 8),
        accounts.itemClass.toBuffer(),
      ],
      this.program.id
    );

    const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        accounts.itemClass.toBuffer(),
        accounts.builder.toBuffer(),
      ],
      this.program.id
    );

    const ix = await this.program.client.methods
      .startBuild(args)
      .accounts({
        build: build,
        schema: schema,
        itemClass: accounts.itemClass,
        builder: accounts.builder,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix;
  }

  async addBuildMaterial(
    accounts: AddBuildMaterialAccounts,
    args: AddBuildMaterialArgs
  ): Promise<web3.TransactionInstruction[]> {
    const [item, _itemBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("item_v1"),
        accounts.materialItemClass.toBuffer(),
        accounts.materialMint.toBuffer(),
      ],
      this.program.id
    );

    const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        accounts.itemClass.toBuffer(),
        accounts.builder.toBuffer(),
      ],
      this.program.id
    );

    // detect what type of token we are adding
    const tokenStandard = await Utils.Item.getTokenStandard(
      this.program.client.provider.connection,
      accounts.materialMint
    );

    let ixns: web3.TransactionInstruction[] = [];
    if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
      const pNftIxns = await this.addBuildMaterialPnft(accounts, build, item);
      ixns.push(...pNftIxns);
    } else {
      const splIxns = await this.addBuildMaterialSpl(accounts, build, item, args);
      ixns.push(...splIxns);
    }

    return ixns;
  }

  private async addBuildMaterialSpl(
    accounts: AddBuildMaterialAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey,
    args: AddBuildMaterialArgs
  ): Promise<web3.TransactionInstruction[]> {
    const materialSource = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.materialMint,
      accounts.builder
    );
    const materialDestination = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.materialMint,
      build,
      true
    );

    const ixns: web3.TransactionInstruction[] = [];

    // if the mint is wrapped sol we are just gonna transfer native sol for now
    // need this a created account incase owner doesnt have it
    if (accounts.materialMint.equals(Constants.ProgramIds.WRAPPED_SOL_MINT)) {
      const dummyWSOLAta = Token.createAssociatedTokenAccountInstruction(Constants.ProgramIds.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID, Constants.ProgramIds.TOKEN_PROGRAM_ID, accounts.materialMint, materialSource, accounts.builder, accounts.builder);
      ixns.push(dummyWSOLAta)
    };
    
    const ix = await this.program.client.methods
      .addBuildMaterialSpl(args)
      .accounts({
        materialMint: accounts.materialMint,
        materialItemClass: accounts.materialItemClass,
        materialSource: materialSource,
        materialDestination: materialDestination,
        build: build,
        item: item,
        itemClass: accounts.itemClass,
        builder: accounts.builder,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();
    ixns.push(ix)

    return ixns;
  }

  private async addBuildMaterialPnft(
    accounts: AddBuildMaterialAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey
  ): Promise<web3.TransactionInstruction[]> {
    const [materialMetadata, _materialMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.materialMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const materialMetadataData = await mpl.Metadata.fromAccountAddress(
      this.program.client.provider.connection,
      materialMetadata,
      "confirmed"
    );

    const [materialME, _materialMEBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        accounts.materialMint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

    const materialSource = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.materialMint,
      accounts.builder
    );
    const materialDestination = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.materialMint,
      build,
      true
    );

    const [materialSourceTokenRecord, _materialSourceTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.materialMint.toBuffer(),
          Buffer.from("token_record"),
          materialSource.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [
      materialDestinationTokenRecord,
      _materialDestinationTokenRecordBump,
    ] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        accounts.materialMint.toBuffer(),
        Buffer.from("token_record"),
        materialDestination.toBuffer(),
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
      .addBuildMaterialPnft()
      .accounts({
        materialMint: accounts.materialMint,
        materialItemClass: accounts.materialItemClass,
        materialMetadata: materialMetadata,
        materialEdition: materialME,
        authRules: materialMetadataData.programmableConfig.ruleSet,
        materialSource: materialSource,
        materialSourceTokenRecord: materialSourceTokenRecord,
        materialDestination: materialDestination,
        materialDestinationTokenRecord: materialDestinationTokenRecord,
        build: build,
        item: item,
        itemClass: accounts.itemClass,
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

  async verifyBuildMaterial(
    accounts: VerifyBuildMaterialAccounts,
    args: VerifyBuildMaterialArgs
  ): Promise<web3.TransactionInstruction> {
    const materialItemClassData =
      await this.program.client.account.itemClassV1.fetch(
        accounts.materialItemClass
      );
    const materialItemClassItems = new web3.PublicKey(
      materialItemClassData.items
    );

    const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        accounts.itemClass.toBuffer(),
        accounts.builder.toBuffer(),
      ],
      this.program.id
    );

    const proofAsRemainingAccounts = [];
    for (let node of args.proof) {
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
      .verifyBuildMaterial(ixArgs)
      .accounts({
        materialMint: accounts.materialMint,
        materialItemClass: accounts.materialItemClass,
        materialItemClassItems: materialItemClassItems,
        build: build,
        itemClass: accounts.itemClass,
        builder: accounts.builder,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async completeBuild(
    accounts: CompleteBuildAccounts,
    args: CompleteBuildArgs
  ): Promise<web3.TransactionInstruction> {
    const itemClassData = await this.program.client.account.itemClassV1.fetch(
      accounts.itemClass
    );
    const itemClassItems = new web3.PublicKey(itemClassData.items);

    const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        accounts.itemClass.toBuffer(),
        accounts.builder.toBuffer(),
      ],
      this.program.id
    );

    const buildData = await this.program.client.account.build.fetch(build);

    const [schema, _schemaBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("schema"),
        new BN(buildData.schemaIndex as string).toArrayLike(Buffer, "le", 8),
        accounts.itemClass.toBuffer(),
      ],
      this.program.id
    );

    const proofAsRemainingAccounts = [];
    for (let node of args.proof) {
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
      .completeBuild(ixArgs)
      .accounts({
        itemMint: accounts.itemMint,
        itemClass: accounts.itemClass,
        itemClassItems: itemClassItems,
        build: build,
        schema: schema,
        builder: accounts.builder,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async receiveItem(
    accounts: ReceiveItemAccounts
  ): Promise<web3.TransactionInstruction[]> {
    const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        accounts.itemClass.toBuffer(),
        accounts.builder.toBuffer(),
      ],
      this.program.id
    );

    const [itemMetadata, _itemMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.itemMint.toBuffer(),
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
        accounts.itemMint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

    const itemSource = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.itemMint,
      accounts.itemClass,
      true
    );
    const itemDestination = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.itemMint,
      accounts.builder
    );

    const [itemSourceTokenRecord, _itemSourceTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.itemMint.toBuffer(),
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
          accounts.itemMint.toBuffer(),
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
      .receiveItem()
      .accounts({
        itemMint: accounts.itemMint,
        itemMetadata: itemMetadata,
        itemEdition: itemME,
        authRules: itemMetadataData.programmableConfig.ruleSet,
        itemSource: itemSource,
        itemSourceTokenRecord: itemSourceTokenRecord,
        itemDestination: itemDestination,
        itemDestinationTokenRecord: itemDestinationTokenRecord,
        itemClass: accounts.itemClass,
        build: build,
        builder: accounts.builder,
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

  async applyBuildEffect(
    accounts: ApplyBuildEffectAccounts
  ): Promise<web3.TransactionInstruction> {
    const [item, _itemBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("item_v1"),
        accounts.materialItemClass.toBuffer(),
        accounts.materialMint.toBuffer(),
      ],
      this.program.id
    );

    const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        accounts.itemClass.toBuffer(),
        accounts.builder.toBuffer(),
      ],
      this.program.id
    );

    const ix = await this.program.client.methods
      .applyBuildEffect()
      .accounts({
        item: item,
        materialItemClass: accounts.materialItemClass,
        itemMint: accounts.materialMint,
        build: build,
        builder: accounts.builder,
        payer: accounts.payer,
      })
      .instruction();
    return ix;
  }

  async returnBuildMaterial(
    accounts: ReturnBuildMaterialAccounts
  ): Promise<web3.TransactionInstruction[]> {
    const [item, _itemBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("item_v1"),
        accounts.materialItemClass.toBuffer(),
        accounts.materialMint.toBuffer(),
      ],
      this.program.id
    );

    const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        accounts.itemClass.toBuffer(),
        accounts.builder.toBuffer(),
      ],
      this.program.id
    );

    // detect what type of token we are adding
    const tokenStandard = await Utils.Item.getTokenStandard(
      this.program.client.provider.connection,
      accounts.materialMint
    );

    let ixns: web3.TransactionInstruction[] = [];
    if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
      const pNftIxns = await this.returnBuildMaterialPNft(
        accounts,
        build,
        item
      );
      ixns.push(...pNftIxns);
    } else {
      const ix = await this.returnBuildMaterialSpl(accounts, build, item);
      ixns.push(ix);
    }

    return ixns;
  }

  private async returnBuildMaterialPNft(
    accounts: ReturnBuildMaterialAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey
  ): Promise<web3.TransactionInstruction[]> {
    const [itemMetadata, _itemMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.materialMint.toBuffer(),
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
        accounts.materialMint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

    const itemSource = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.materialMint,
      build,
      true
    );
    const itemDestination = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.materialMint,
      accounts.builder
    );

    const [itemSourceTokenRecord, _itemSourceTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.materialMint.toBuffer(),
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
          accounts.materialMint.toBuffer(),
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
      .returnBuildMaterialPnft()
      .accounts({
        item: item,
        itemMint: accounts.materialMint,
        itemMetadata: itemMetadata,
        itemEdition: itemME,
        authRules: itemMetadataData.programmableConfig.ruleSet,
        itemSource: itemSource,
        itemSourceTokenRecord: itemSourceTokenRecord,
        itemDestination: itemDestination,
        itemDestinationTokenRecord: itemDestinationTokenRecord,
        build: build,
        builder: accounts.builder,
        itemClass: accounts.itemClass,
        payer: this.program.client.provider.publicKey,
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

  private async returnBuildMaterialSpl(
    accounts: ReturnBuildMaterialAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey
  ): Promise<web3.TransactionInstruction> {
    const itemSource = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.materialMint,
      build,
      true
    );
    const itemDestination = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.materialMint,
      accounts.builder
    );

    const ix = await this.program.client.methods
      .returnBuildMaterialSpl()
      .accounts({
        item: item,
        itemMint: accounts.materialMint,
        itemSource: itemSource,
        itemDestination: itemDestination,
        build: build,
        builder: accounts.builder,
        itemClass: accounts.materialItemClass,
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

  async consumeBuildMaterial(
    accounts: ConsumeBuildMaterialAccounts
  ): Promise<web3.TransactionInstruction> {
    const [item, _itemBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("item_v1"),
        accounts.materialItemClass.toBuffer(),
        accounts.materialMint.toBuffer(),
      ],
      this.program.id
    );

    const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        accounts.itemClass.toBuffer(),
        accounts.builder.toBuffer(),
      ],
      this.program.id
    );

    const tokenStandard = await Utils.Item.getTokenStandard(
      this.program.client.provider.connection,
      accounts.materialMint
    );
    if (tokenStandard !== Utils.Item.TokenStandard.Spl) {
      throw new Error(`Burning pNFTs not supported yet`);
    }

    const itemSource = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      accounts.materialMint,
      build,
      true
    );

    const ix = this.program.client.methods
      .consumeBuildMaterialSpl()
      .accounts({
        item: item,
        itemMint: accounts.materialMint,
        itemSource: itemSource,
        build: build,
        builder: accounts.builder,
        itemClass: accounts.materialItemClass,
        payer: accounts.payer,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    return ix;
  }

  async addSchema(
    accounts: AddSchemaAccounts,
    args: AddSchemaArgs
  ): Promise<web3.TransactionInstruction> {
    const materials: any[] = [];
    for (let materialArg of args.args.materialArgs) {
      let degredationBuildEffect;
      if (materialArg.buildEffect.degredation) {
        degredationBuildEffect = {
          on: { amount: materialArg.buildEffect.degredation.amount },
        };
      } else {
        degredationBuildEffect = { off: {} };
      }

      let cooldownBuildEffect;
      if (materialArg.buildEffect.cooldown) {
        cooldownBuildEffect = {
          on: { seconds: materialArg.buildEffect.cooldown.seconds },
        };
      } else {
        cooldownBuildEffect = { off: {} };
      }

      let material = {
        itemClass: materialArg.itemClass,
        requiredAmount: materialArg.requiredAmount,
        buildEffect: {
          degredation: degredationBuildEffect,
          cooldown: cooldownBuildEffect,
        },
      };

      materials.push(material);
    }

    const ixArgs = {
      buildEnabled: args.args.buildEnabled,
      materials: materials,
    };

    const itemClassData = await this.program.client.account.itemClassV1.fetch(
      accounts.itemClass
    );

    // get new schema pda based off item class schema index
    const [newSchema, _bumpNewSchema] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("schema"),
        (itemClassData.schemaIndex as BN)
          .add(new BN(1))
          .toArrayLike(Buffer, "le", 8),
        accounts.itemClass.toBuffer(),
      ],
      this.program.id
    );

    const ix = await this.program.client.methods
      .addSchema(ixArgs)
      .accounts({
        schema: newSchema,
        itemClass: accounts.itemClass,
        authority: accounts.authority,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    return ix;
  }

  async closeBuild(accounts: CloseBuildAccounts): Promise<web3.TransactionInstruction> {
    const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        accounts.itemClass.toBuffer(),
        accounts.builder.toBuffer(),
      ],
      this.program.id
    );

    const ix = await this.program.client.methods.closeBuild().accounts({
      build: build,
      builder: accounts.builder,
      payer: accounts.payer,
      rent: web3.SYSVAR_RENT_PUBKEY,
      systemProgram: web3.SystemProgram.programId,
    }).instruction();

    return ix
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

export interface CreateItemClassV1Args {
  schemaArgs: SchemaArgs;
}

export interface SchemaArgs {
  buildEnabled: boolean;
  materialArgs: SchemaMaterialDataArgs[];
}

export interface SchemaMaterialDataArgs {
  itemClass: web3.PublicKey;
  requiredAmount: BN;
  buildEffect: BuildEffect;
}

export interface BuildEffect {
  degredation: Degredation | null;
  cooldown: Cooldown | null;
}

export interface Degredation {
  amount: BN;
}

export interface Cooldown {
  seconds: BN;
}

export interface StartBuildAccounts {
  itemClass: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface StartBuildArgs {
  schemaIndex: BN;
}

export interface AddBuildMaterialAccounts {
  materialMint: web3.PublicKey;
  materialItemClass: web3.PublicKey;
  itemClass: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface AddBuildMaterialArgs {
  amount: BN;
}

export interface VerifyBuildMaterialAccounts {
  materialMint: web3.PublicKey;
  materialItemClass: web3.PublicKey;
  itemClass: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface VerifyBuildMaterialArgs {
  root: Buffer;
  leafIndex: number;
  proof: Buffer[];
}

export interface CompleteBuildAccounts {
  itemMint: web3.PublicKey;
  itemClass: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface CompleteBuildArgs {
  root: Buffer;
  leafIndex: number;
  proof: Buffer[];
}

export interface ReceiveItemAccounts {
  itemMint: web3.PublicKey;
  itemClass: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface AddItemsToItemClass {
  itemClass: web3.PublicKey;
  itemMints: web3.PublicKey[];
}

export interface ApplyBuildEffectAccounts {
  materialMint: web3.PublicKey;
  materialItemClass: web3.PublicKey;
  builder: web3.PublicKey;
  itemClass: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface ReturnBuildMaterialAccounts {
  materialMint: web3.PublicKey;
  materialItemClass: web3.PublicKey;
  builder: web3.PublicKey;
  payer: web3.PublicKey;
  itemClass: web3.PublicKey;
}

export interface AddSchemaAccounts {
  itemClass: web3.PublicKey;
  authority: web3.PublicKey;
}

export interface AddSchemaArgs {
  args: SchemaArgs;
}

export interface ConsumeBuildMaterialAccounts {
  materialMint: web3.PublicKey;
  materialItemClass: web3.PublicKey;
  itemClass: web3.PublicKey;
  payer: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface CloseBuildAccounts {
  builder: web3.PublicKey;
  itemClass: web3.PublicKey;
  payer: web3.PublicKey;
}