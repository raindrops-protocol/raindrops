import { web3, AnchorProvider, BN } from "@project-serum/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  Program,
  Instruction as SolKitInstruction,
  InstructionUtils,
} from "@raindrop-studios/sol-kit";
import { AnchorPermissivenessType } from "../state/common";
import {
  getAtaForMint,
  getEdition,
  getItemActivationMarker,
  getItemPDA,
  getMetadata,
  getPlayerItemAccount,
  getPlayerItemActivationMarker,
} from "../utils/pda";
import { ContractCommon } from "../contract/common";
import { getPlayerPDA } from "../utils/pda";
import { ITEM_ID, TOKEN_PROGRAM_ID } from "../constants/programIds";
import { ItemProgram } from "../contract";
const {
  generateRemainingAccountsForCreateClass,
  generateRemainingAccountsGivenPermissivenessToUse,
} = ContractCommon;

const PLAYER_CLASS_DATA_ARGS_CONVERT_TO_BNS = [
  "playerClassData.settings.stakingWarmUpDuration",
  "playerClassData.settings.stakingCooldownDuration",
  "playerClassData.config.basicStats.[].statType.integer.min",
  "playerClassData.config.basicStats.[].statType.integer.max",
  "playerClassData.config.basicStats.[].statType.integer.starting",
  "playerClassData.config.basicStats.[].statType.integer.stakingAmountScaler",
  "playerClassData.config.basicStats.[].statType.integer.stakingDurationScaler",
  "playerClassData.config.basicStats.[].statType.bool.stakingFlip",
  "playerClassData.config.bodyParts.[].totalItemSpots",
  "playerClassData.config.equipValidation.code",
  "playerClassData.config.addToPackValidation.code",
];

const PLAYER_DATA_ARGS_CONVERT_TO_BNS = [
  "newData.basicStats.[].state.integer.current",
  "newData.basicStats.[].state.integer.calculatedIntermediate",
  "newData.basicStats.[].state.integer.calculated",
];

const PLAYER_CLASS_DATA_ARGS_CONVERT_TO_PUBKEYS = [
  "playerClassData.config.equipValidation.key",
  "playerClassData.config.addToPackValidation.key",
];
export interface ToggleEquipItemArgs {
  itemIndex: BN;
  itemMint: PublicKey;
  itemClassMint: PublicKey;
  index: BN;
  playerMint: PublicKey;
  amount: BN;
  equipping: boolean;
  bodyPartIndex: number;
  equipItemPermissivenessToUse: null | AnchorPermissivenessType;
  itemUsageIndex: number;
  // not implemented yet sdk-side
  itemUsageProof: null;
  itemUsage: null;
}

export interface UpdateValidForUseIfWarmupPassedOnItemArgs {
  itemIndex: BN;
  itemMint: PublicKey;
  itemUsageIndex: number;
  itemClassIndex: BN;
  amount: BN;
  itemClassMint: PublicKey;
  useItemPermissivenessToUse: null | AnchorPermissivenessType;
  index: BN;
  playerMint: PublicKey;
  // not implemented yet sdk-side
  itemUsageProof: null;
  itemUsage: null;
}

export interface UpdateValidForUseIfWarmupPassedOnItemAccounts {
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface UpdateValidForUseIfWarmupPassedOnItemAdditionalArgs {
  playerClassMint: PublicKey;
  classIndex: BN;
}

export interface UseItemArgs {
  itemIndex: BN;
  itemClassIndex: BN;
  itemClassMint: PublicKey;
  itemMarkerSpace: number;
  useItemPermissivenessToUse: null | AnchorPermissivenessType;
  amount: BN;
  itemUsageIndex: number;
  target: null | PublicKey;
  index: BN;
  playerMint: PublicKey;
  // TODO null for now, no merkle yet on sdk leel
  itemUsageInfo: null;
}

export interface UseItemAccounts {
  itemMint: PublicKey;
  validationProgram: PublicKey;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface UseItemAdditionalArgs {
  playerClassMint: PublicKey;
  classIndex: BN;
  itemProgram: ItemProgram;
}

export interface AddItemEffectArgs {
  itemIndex: BN;
  itemClassIndex: BN;
  index: BN;
  playerMint: PublicKey;
  itemMint: PublicKey;
  itemClassMint: PublicKey;
  itemUsageIndex: number;
  useItemPermissivenessToUse: null | AnchorPermissivenessType;
  space: BN;
  // TODO not implemented yet in this sdk
  itemUsageProof: null;
  itemUsage: null;
}

export interface AddItemArgs {
  itemIndex: BN;
  index: BN;
  playerMint: PublicKey;
  amount: BN;
  addItemPermissivenessToUse: null | AnchorPermissivenessType;
}

export interface RemoveItemArgs {
  itemIndex: BN;
  index: BN;
  playerMint: PublicKey;
  amount: BN;
  removeItemPermissivenessToUse: null | AnchorPermissivenessType;
}

export interface CreatePlayerClassArgs {
  classIndex: BN;
  parentOfParentClassIndex: null | BN;
  parentClassIndex: null | BN;
  space: BN;
  desiredNamespaceArraySize: number;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
  storeMint: boolean;
  storeMetadataFields: boolean;
  playerClassData: any;
}

export interface BuildPlayerArgs {
  classIndex: BN;
  parentClassIndex: null | BN;
  newPlayerIndex: null | BN;
  space: BN;
  playerClassMint: web3.PublicKey;
  buildPermissivenessToUse: null | AnchorPermissivenessType;
  storeMint: boolean;
  storeMetadataFields: boolean;
}

export interface UpdatePlayerClassArgs {
  classIndex: BN;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
  parentClassIndex: null | BN;
  playerClassData: any | null;
}

export interface UpdatePlayerArgs {
  classIndex: BN;
  index: BN;
  playerMint: PublicKey;
  playerClassMint: PublicKey;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
  newData: any | null;
}

export interface DrainPlayerClassArgs {
  classIndex: BN;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
  parentClassIndex: null | BN;
  playerClassMint: PublicKey | null;
}

export interface DrainPlayerArgs {
  classIndex: BN;
  index: BN;
  playerMint: PublicKey;
  playerClassMint: PublicKey;
  updatePermissivenessToUse: null | AnchorPermissivenessType;
}

export interface CreatePlayerClassAccounts {
  playerMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  parentOfParentClassMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
  parentUpdateAuthority: web3.PublicKey | null;
}

export interface AddItemEffectAccounts {
  callbackProgram: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface SubtractItemEffectAccounts {
  player: PublicKey;
  playerClass: PublicKey;
  item: PublicKey;
  receiver: PublicKey | null;
}

export interface SubtractItemEffectAdditionalArgs {
  amount: BN;
  itemUsageIndex: number;
}

export interface AddItemEffectAdditionalArgs {
  amount: BN;
  playerClassMint: PublicKey;
  classIndex: BN;
  itemProgram: ItemProgram;
}

export interface ToggleEquipItemAccounts {
  metadataUpdateAuthority: web3.PublicKey | null;
  validationProgram: web3.PublicKey | null;
}

export interface ToggleEquipItemAdditionalArgs {
  playerClassMint: PublicKey;
  classIndex: BN;
  itemClassIndex: BN;
  itemProgram: ItemProgram;
}

export interface UpdatePlayerClassAccounts {
  playerMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface DrainPlayerClassAccounts {
  playerMint: web3.PublicKey;
  parent: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface DrainPlayerAccounts {
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface UpdatePlayerClassAdditionalArgs {
  permissionless: boolean;
}

export interface UpdatePlayerAdditionalArgs {
  permissionless: boolean;
}

export interface BuildPlayerAccounts {
  newPlayerMint: web3.PublicKey;
  newPlayerToken: web3.PublicKey | null;
  newPlayerTokenHolder: web3.PublicKey | null;
  parentMint: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface UpdatePlayerAccounts {
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface AddItemAccounts {
  itemMint: PublicKey;
  itemAccount: PublicKey;
  itemTransferAuthority: null | Keypair;
  validationProgram: null | PublicKey;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface RemoveItemAccounts {
  itemMint: PublicKey;
  itemAccount: PublicKey;
  validationProgram: null | PublicKey;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface AddItemAdditionalArgs {
  playerClassMint: PublicKey;
  classIndex: BN;
  itemClassMint: PublicKey;
  itemClassIndex: BN;
  itemProgram: ItemProgram;
}

export interface RemoveItemAdditionalArgs {
  playerClassMint: PublicKey;
  classIndex: BN;
  itemClassMint: PublicKey;
  itemClassIndex: BN;
  itemProgram: ItemProgram;
}

export class Instruction extends SolKitInstruction {
  constructor(args: { program: Program.Program }) {
    super(args);
  }

  async createPlayerClass(
    args: CreatePlayerClassArgs,
    accounts: CreatePlayerClassAccounts,
    _additionalArgs = {}
  ) {
    const remainingAccounts = await generateRemainingAccountsForCreateClass({
      permissivenessToUse: args.updatePermissivenessToUse,
      tokenMint: accounts.playerMint,
      parentMint: accounts.parentMint,
      parent: accounts.parent,
      parentOfParentClassMint: accounts.parentOfParentClassMint,
      parentOfParentClassIndex: args.parentOfParentClassIndex,
      parentOfParentClass:
        args.parentOfParentClassIndex && accounts.parentOfParentClassMint
          ? (
              await getPlayerPDA(
                accounts.parentOfParentClassMint,
                args.parentOfParentClassIndex
              )
            )[0]
          : null,
      metadataUpdateAuthority: accounts.metadataUpdateAuthority,
      parentUpdateAuthority: accounts.parentUpdateAuthority,
      program: this.program,
    });

    InstructionUtils.convertNumbersToBNs(args, [
      "classIndex",
      "parentOfParentClassIndex",
      "parentClassIndex",
      "space",
      ...PLAYER_CLASS_DATA_ARGS_CONVERT_TO_BNS,
    ]);

    InstructionUtils.convertStringsToPublicKeys(
      args,
      PLAYER_CLASS_DATA_ARGS_CONVERT_TO_PUBKEYS
    );

    const [playerClassKey, _] = await getPlayerPDA(
      accounts.playerMint,
      args.classIndex
    );

    return {
      instructions: [
        await this.program.client.methods
          .createPlayerClass(args)
          .accounts({
            playerClass: playerClassKey,
            playerMint: accounts.playerMint,
            metadata: await getMetadata(accounts.playerMint),
            edition: await getEdition(accounts.playerMint),
            parent: accounts.parent || playerClassKey,
            payer: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            systemProgram: SystemProgram.programId,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async updatePlayerClass(
    args: UpdatePlayerClassArgs,
    accounts: UpdatePlayerClassAccounts,
    additionalArgs: UpdatePlayerClassAdditionalArgs = { permissionless: true }
  ) {
    const remainingAccounts = additionalArgs.permissionless
      ? [{ pubkey: accounts.parent, isWritable: false, isSigner: false }]
      : await generateRemainingAccountsGivenPermissivenessToUse({
          permissivenessToUse: args.updatePermissivenessToUse,
          tokenMint: accounts.playerMint,
          parentMint: accounts.parentMint,
          parentIndex: args.parentClassIndex,
          parent: accounts.parent,
          metadataUpdateAuthority: accounts.metadataUpdateAuthority,
          program: this.program.client,
        });

    InstructionUtils.convertNumbersToBNs(args, [
      "classIndex",
      "parentClassIndex",
      ...PLAYER_CLASS_DATA_ARGS_CONVERT_TO_BNS,
    ]);

    InstructionUtils.convertStringsToPublicKeys(
      args,
      PLAYER_CLASS_DATA_ARGS_CONVERT_TO_PUBKEYS
    );

    const playerClassKey = (
      await getPlayerPDA(accounts.playerMint, args.classIndex)
    )[0];

    return {
      instructions: [
        await this.program.client.methods
          .updatePlayerClass(args)
          .accounts({
            playerClass: playerClassKey,
            parent: accounts.parent || web3.SystemProgram.programId,
            playerMint: accounts.playerMint,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async drainPlayerClass(
    args: DrainPlayerClassArgs,
    accounts: DrainPlayerClassAccounts,
    _additionalArgs = {}
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.updatePermissivenessToUse,
        tokenMint: accounts.playerMint,
        parentMint: accounts.parentMint,
        parentIndex: args.parentClassIndex,
        parent: accounts.parent,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    InstructionUtils.convertNumbersToBNs(args, [
      "classIndex",
      "parentClassIndex",
    ]);

    const playerClassKey = (
      await getPlayerPDA(accounts.playerMint, args.classIndex)
    )[0];

    return {
      instructions: [
        await this.program.client.methods
          .drainPlayerClass(args)
          .accounts({
            playerClass: playerClassKey,
            parentClass:
              accounts.parent || accounts.parentMint
                ? (
                    await getPlayerPDA(
                      accounts.parentMint,
                      args.parentClassIndex
                    )
                  )[0]
                : playerClassKey,
            receiver: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async buildPlayer(
    args: BuildPlayerArgs,
    accounts: BuildPlayerAccounts,
    _additionalArgs = {}
  ) {
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.buildPermissivenessToUse,
        tokenMint: args.playerClassMint,
        parentMint: accounts.parentMint,
        parentIndex: args.parentClassIndex,
        parent:
          accounts.parentMint && !!args.parentClassIndex
            ? (
                await getPlayerPDA(accounts.parentMint, args.parentClassIndex)
              )[0]
            : null,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    InstructionUtils.convertNumbersToBNs(args, [
      "classIndex",
      "parentClassIndex",
      "newPlayerIndex",
      "space",
    ]);

    const [playerClassKey, _] = await getPlayerPDA(
      args.playerClassMint,
      args.classIndex
    );

    const [newPlayer, __] = await getPlayerPDA(
      accounts.newPlayerMint,
      args.newPlayerIndex
    );

    return {
      instructions: [
        await this.program.client.methods
          .buildPlayer(args)
          .accounts({
            playerClass: playerClassKey,
            newPlayer,
            newPlayerMint: accounts.newPlayerMint,
            newPlayerMetadata: await getMetadata(accounts.newPlayerMint),
            newPlayerEdition: await getEdition(accounts.newPlayerMint),
            newPlayerToken: accounts.newPlayerToken,
            newPlayerTokenHolder: accounts.newPlayerTokenHolder,
            payer: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            systemProgram: SystemProgram.programId,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async updatePlayer(
    args: UpdatePlayerArgs,
    accounts: UpdatePlayerAccounts,
    additionalArgs: UpdatePlayerAdditionalArgs = { permissionless: true }
  ) {
    const parent = (
      await getPlayerPDA(args.playerClassMint, args.classIndex)
    )[0];
    const remainingAccounts = additionalArgs.permissionless
      ? [{ pubkey: parent, isWritable: false, isSigner: false }]
      : await generateRemainingAccountsGivenPermissivenessToUse({
          permissivenessToUse: args.updatePermissivenessToUse,
          tokenMint: args.playerMint,
          parentMint: args.playerClassMint,
          parentIndex: args.classIndex,
          parent,
          metadataUpdateAuthority: accounts.metadataUpdateAuthority,
          program: this.program.client,
        });

    InstructionUtils.convertNumbersToBNs(args, [
      "classIndex",
      "index",
      ...PLAYER_DATA_ARGS_CONVERT_TO_BNS,
    ]);

    const playerKey = (await getPlayerPDA(args.playerMint, args.index))[0];

    return {
      instructions: [
        await this.program.client.methods
          .updatePlayer(args)
          .accounts({
            player: playerKey,
            playerClass: parent,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async drainPlayer(
    args: DrainPlayerArgs,
    accounts: DrainPlayerAccounts,
    _additionalArgs = {}
  ) {
    const parent = (
      await getPlayerPDA(args.playerClassMint, args.classIndex)
    )[0];
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.updatePermissivenessToUse,
        tokenMint: args.playerMint,
        parentMint: args.playerClassMint,
        parentIndex: args.classIndex,
        parent: parent,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    InstructionUtils.convertNumbersToBNs(args, ["classIndex", "index"]);

    const player = (await getPlayerPDA(args.playerMint, args.index))[0];

    return {
      instructions: [
        await this.program.client.methods
          .drainPlayer(args)
          .accounts({
            playerClass: parent,
            player,
            receiver: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async toggleEquipItem(
    args: ToggleEquipItemArgs,
    accounts: ToggleEquipItemAccounts,
    additionalArgs: ToggleEquipItemAdditionalArgs
  ) {
    const parent = (
      await getPlayerPDA(
        additionalArgs.playerClassMint,
        additionalArgs.classIndex
      )
    )[0];
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.equipItemPermissivenessToUse,
        tokenMint: args.playerMint,
        parentMint: additionalArgs.playerClassMint,
        parentIndex: additionalArgs.classIndex,
        parent,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    InstructionUtils.convertNumbersToBNs(args, [
      "itemIndex",
      "index",
      "amount",
      "bodyPartIndex",
      "itemUsageIndex",
    ]);

    const player = (await getPlayerPDA(args.playerMint, args.index))[0];

    const item = (await getItemPDA(args.itemMint, args.itemIndex))[0];
    return {
      instructions: [
        await this.program.client.methods
          .toggleEquipItem(args)
          .accounts({
            playerClass: parent,
            player,
            item,
            itemClass: (
              await getItemPDA(
                args.itemClassMint,
                additionalArgs.itemClassIndex
              )
            )[0],
            playerItemAccount: (
              await getPlayerItemAccount({ item, player })
            )[0],
            validationProgram:
              accounts.validationProgram || SystemProgram.programId,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async useItem(
    args: UseItemArgs,
    accounts: UseItemAccounts,
    additionalArgs: UseItemAdditionalArgs
  ) {
    const parent = (
      await getPlayerPDA(
        additionalArgs.playerClassMint,
        additionalArgs.classIndex
      )
    )[0];
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.useItemPermissivenessToUse,
        tokenMint: args.playerMint,
        parentMint: additionalArgs.playerClassMint,
        parentIndex: additionalArgs.classIndex,
        parent,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    InstructionUtils.convertNumbersToBNs(args, [
      "itemIndex",
      "itemClassIndex",
      "amount",
      "itemMarkerSpace",
      "itemUsageIndex",
      "index",
    ]);

    const playerKey = (await getPlayerPDA(args.playerMint, args.index))[0];

    const item = (await getItemPDA(accounts.itemMint, args.itemIndex))[0];

    return {
      instructions: [
        await this.program.client.methods
          .useItem(args)
          .accounts({
            player: playerKey,
            playerClass: parent,
            item,
            itemClass: (
              await getItemPDA(args.itemClassMint, args.itemClassIndex)
            )[0],
            itemMint: accounts.itemMint,
            playerItemAccount: (
              await getPlayerItemAccount({ item, player: playerKey })
            )[0],
            itemActivationMarker: (
              await getItemActivationMarker({
                itemMint: accounts.itemMint,
                index: args.itemIndex,
                usageIndex: new BN(args.itemUsageIndex),
                amount: args.amount,
              })
            )[0],
            payer: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            systemProgram: SystemProgram.programId,
            itemProgram: ITEM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: SYSVAR_CLOCK_PUBKEY,
            rent: SYSVAR_RENT_PUBKEY,
            validationProgram:
              accounts.validationProgram || SystemProgram.programId,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async updateValidForUseIfWarmupPassedOnItem(
    args: UpdateValidForUseIfWarmupPassedOnItemArgs,
    accounts: UpdateValidForUseIfWarmupPassedOnItemAccounts,
    additionalArgs: UpdateValidForUseIfWarmupPassedOnItemAdditionalArgs
  ) {
    const parent = (
      await getPlayerPDA(
        additionalArgs.playerClassMint,
        additionalArgs.classIndex
      )
    )[0];
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.useItemPermissivenessToUse,
        tokenMint: args.playerMint,
        parentMint: additionalArgs.playerClassMint,
        parentIndex: additionalArgs.classIndex,
        parent,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    InstructionUtils.convertNumbersToBNs(args, [
      "itemIndex",
      "itemClassIndex",
      "amount",
      "itemUsageIndex",
      "index",
    ]);

    const playerKey = (await getPlayerPDA(args.playerMint, args.index))[0];

    const item = (await getItemPDA(args.itemMint, args.itemIndex))[0];

    return {
      instructions: [
        await this.program.client.methods
          .updateValidForUseIfWarmupPassedOnItem(args)
          .accounts({
            player: playerKey,
            playerClass: parent,
            item,
            itemClass: (
              await getItemPDA(args.itemClassMint, args.itemClassIndex)
            )[0],
            itemMint: args.itemMint,
            itemActivationMarker: (
              await getItemActivationMarker({
                itemMint: args.itemMint,
                index: args.itemIndex,
                usageIndex: new BN(args.itemUsageIndex),
                amount: args.amount,
              })
            )[0],
            itemProgram: ITEM_ID,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async addItemEffect(
    args: AddItemEffectArgs,
    accounts: AddItemEffectAccounts,
    additionalArgs: AddItemEffectAdditionalArgs
  ) {
    const parent = (
      await getPlayerPDA(
        additionalArgs.playerClassMint,
        additionalArgs.classIndex
      )
    )[0];
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.useItemPermissivenessToUse,
        tokenMint: args.playerMint,
        parentMint: additionalArgs.playerClassMint,
        parentIndex: additionalArgs.classIndex,
        parent,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    InstructionUtils.convertNumbersToBNs(args, [
      "itemIndex",
      "itemClassIndex",
      "index",
      "itemUsageIndex",
      "space",
    ]);

    const playerKey = (await getPlayerPDA(args.playerMint, args.index))[0];

    const item = (await getItemPDA(args.itemMint, args.itemIndex))[0];

    return {
      instructions: [
        await this.program.client.methods
          .addItemEffect(args)
          .accounts({
            player: playerKey,
            playerClass: parent,
            playerItemActivationMarker: (
              await getPlayerItemActivationMarker({
                item,
                player: playerKey,
                amount: additionalArgs.amount,
                itemUsageIndex: new BN(args.itemUsageIndex),
              })
            )[0],
            itemActivationMarker: (
              await getItemActivationMarker({
                itemMint: args.itemMint,
                index: args.itemIndex,
                usageIndex: new BN(args.itemUsageIndex),
                amount: additionalArgs.amount,
              })
            )[0],
            item,
            itemClass: (
              await getItemPDA(args.itemClassMint, args.itemClassIndex)
            )[0],
            payer: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            systemProgram: SystemProgram.programId,
            itemProgram: ITEM_ID,
            callbackProgram:
              accounts.callbackProgram || SystemProgram.programId,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }

  async subtractItemEffect(
    _args = {},
    accounts: SubtractItemEffectAccounts,
    additionalArgs: SubtractItemEffectAdditionalArgs
  ) {
    return {
      instructions: [
        await this.program.client.methods
          .subtractItemEffect()
          .accounts({
            player: accounts.player,
            playerClass: accounts.playerClass,
            playerItemActivationMarker: (
              await getPlayerItemActivationMarker({
                item: accounts.item,
                player: accounts.player,
                amount: additionalArgs.amount,
                itemUsageIndex: new BN(additionalArgs.itemUsageIndex),
              })
            )[0],
            item: accounts.item,
            receiver:
              accounts.receiver ||
              (this.program.client.provider as AnchorProvider).wallet.publicKey,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .instruction(),
      ],
      signers: [],
    };
  }

  async addItem(
    args: AddItemArgs,
    accounts: AddItemAccounts,
    additionalArgs: AddItemAdditionalArgs
  ) {
    const parent = (
      await getPlayerPDA(
        additionalArgs.playerClassMint,
        additionalArgs.classIndex
      )
    )[0];
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.addItemPermissivenessToUse,
        tokenMint: args.playerMint,
        parentMint: additionalArgs.playerClassMint,
        parentIndex: additionalArgs.classIndex,
        parent,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    InstructionUtils.convertNumbersToBNs(args, [
      "itemIndex",
      "index",
      "amount",
    ]);

    const playerKey = (await getPlayerPDA(args.playerMint, args.index))[0];

    const signers = [];
    const itemTransferAuthority =
      accounts.itemTransferAuthority || web3.Keypair.generate();
    signers.push(itemTransferAuthority);

    const item = (await getItemPDA(accounts.itemMint, args.itemIndex))[0];

    return {
      instructions: [
        await this.program.client.methods
          .addItem(args)
          .accounts({
            player: playerKey,
            playerClass: parent,
            item,
            itemClass: (
              await getItemPDA(
                additionalArgs.itemClassMint,
                additionalArgs.itemClassIndex
              )
            )[0],
            itemMint: accounts.itemMint,
            itemAccount: accounts.itemAccount,
            itemTransferAuthority: itemTransferAuthority.publicKey,
            playerItemAccount: (
              await getPlayerItemAccount({ item, player: playerKey })
            )[0],
            payer: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
            validationProgram:
              accounts.validationProgram || SystemProgram.programId,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers,
    };
  }

  async removeItem(
    args: RemoveItemArgs,
    accounts: RemoveItemAccounts,
    additionalArgs: RemoveItemAdditionalArgs
  ) {
    const parent = (
      await getPlayerPDA(
        additionalArgs.playerClassMint,
        additionalArgs.classIndex
      )
    )[0];
    const remainingAccounts =
      await generateRemainingAccountsGivenPermissivenessToUse({
        permissivenessToUse: args.removeItemPermissivenessToUse,
        tokenMint: args.playerMint,
        parentMint: additionalArgs.playerClassMint,
        parentIndex: additionalArgs.classIndex,
        parent,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        program: this.program.client,
      });

    InstructionUtils.convertNumbersToBNs(args, [
      "itemIndex",
      "index",
      "amount",
    ]);

    const playerKey = (await getPlayerPDA(args.playerMint, args.index))[0];

    const item = (await getItemPDA(accounts.itemMint, args.itemIndex))[0];

    return {
      instructions: [
        await this.program.client.methods
          .removeItem(args)
          .accounts({
            player: playerKey,
            playerClass: parent,
            item,
            itemClass: (
              await getItemPDA(
                additionalArgs.itemClassMint,
                additionalArgs.itemClassIndex
              )
            )[0],
            itemMint: accounts.itemMint,
            itemAccount: accounts.itemAccount,
            playerItemAccount: (
              await getPlayerItemAccount({ item, player: playerKey })
            )[0],
            payer: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
            validationProgram:
              accounts.validationProgram || SystemProgram.programId,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      ],
      signers: [],
    };
  }
}
