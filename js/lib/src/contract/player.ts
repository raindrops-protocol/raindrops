import { AnchorProvider, BN, Wallet, web3 } from "@project-serum/anchor";
import { Program } from "@raindrop-studios/sol-kit";
import { PublicKey, Signer, TransactionInstruction } from "@solana/web3.js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

import * as PlayerInstruction from "../instructions/player";
import * as Utils from "../utils";
import { PLAYER_ID } from "../constants/programIds";
import { getPlayerItemAccount } from "../utils/pda";

const {
  PDA: {
    getAtaForMint,
    getItemActivationMarker,
    getItemPDA,
    getMetadata,
    getPlayerPDA,
  },
} = Utils;

export class PlayerProgram extends Program.Program {
  declare instruction: PlayerInstruction.Instruction;
  PROGRAM_ID = PLAYER_ID;

  constructor() {
    super();
    this.instruction = new PlayerInstruction.Instruction({ program: this });
  }

  async getMetadataUpdateAuthority(mint: PublicKey) {
    const metadata = await this.client.provider.connection.getAccountInfo(
      await getMetadata(mint)
    );

    const mdObj = Metadata.fromAccountInfo(metadata)[0];

    return mdObj.updateAuthority;
  }

  async createPlayerClass(
    args: PlayerInstruction.CreatePlayerClassArgs,
    accounts: PlayerInstruction.CreatePlayerClassAccounts,
    additionalArgs = {},
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    const { instructions, signers } = await this.instruction.createPlayerClass(
      args,
      accounts,
      additionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async fetchPlayerClass(mint: web3.PublicKey, index: BN): Promise<any | null> {
    const playerClass = (await getPlayerPDA(mint, index))[0];

    const playerClassObj = await this.client.account.playerClass.fetch(
      playerClass
    );

    return playerClassObj;
  }

  async buildPlayer(
    args: PlayerInstruction.BuildPlayerArgs,
    accounts: PlayerInstruction.BuildPlayerAccounts,
    additionalArgs: PlayerInstruction.BuildPlayerAdditionalArgs,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    const { instructions, signers } = await this.instruction.buildPlayer(
      args,
      accounts,
      additionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async updatePlayerClass(
    args: PlayerInstruction.UpdatePlayerClassArgs,
    accounts: PlayerInstruction.UpdatePlayerClassAccounts,
    additionalArgs: PlayerInstruction.UpdatePlayerClassAdditionalArgs,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    const { instructions, signers } = await this.instruction.updatePlayerClass(
      args,
      accounts,
      additionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async updatePlayer(
    args: PlayerInstruction.UpdatePlayerArgs,
    accounts: PlayerInstruction.UpdatePlayerAccounts,
    additionalArgs: PlayerInstruction.UpdatePlayerAdditionalArgs,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    const { instructions, signers } = await this.instruction.updatePlayer(
      args,
      accounts,
      additionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async drainPlayer(
    args: PlayerInstruction.DrainPlayerArgs,
    accounts: PlayerInstruction.DrainPlayerAccounts,
    additionalArgs = {},
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    const { instructions, signers } = await this.instruction.drainPlayer(
      args,
      accounts,
      additionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async drainPlayerClass(
    args: PlayerInstruction.DrainPlayerClassArgs,
    accounts: PlayerInstruction.DrainPlayerClassAccounts,
    additionalArgs = {},
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    const { instructions, signers } = await this.instruction.drainPlayerClass(
      args,
      accounts,
      additionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async toggleEquipItem(
    args: PlayerInstruction.ToggleEquipItemArgs,
    accounts: Partial<PlayerInstruction.ToggleEquipItemAccounts>,
    additionalArgs: Partial<PlayerInstruction.ToggleEquipItemAdditionalArgs>,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    if (!accounts.metadataUpdateAuthority) {
      accounts.metadataUpdateAuthority = await this.getMetadataUpdateAuthority(
        args.playerMint
      );
    }

    await this.setPlayerClassIndexIfNecessary(
      args.playerMint,
      args.index,
      additionalArgs
    );

    if (!additionalArgs.itemClassIndex) {
      const item = await additionalArgs.itemProgram.client.account.item.fetch(
        (
          await getItemPDA(args.itemMint, args.itemIndex)
        )[0]
      );

      additionalArgs.itemClassIndex = item.classIndex as BN;
    }

    if (!accounts?.validationProgram) {
      const itemClass = await additionalArgs.itemProgram.fetchItemClass(
        args.itemClassMint,
        additionalArgs.itemClassIndex
      );

      const usage =
        args.itemUsage ||
        itemClass.object.itemClassData.config.usages[args.itemUsageIndex];

      if (usage) {
        accounts.validationProgram = usage?.validation?.key;
      }
    }

    const { instructions, signers } = await this.instruction.toggleEquipItem(
      args as PlayerInstruction.ToggleEquipItemArgs,
      accounts as PlayerInstruction.ToggleEquipItemAccounts,
      additionalArgs as PlayerInstruction.ToggleEquipItemAdditionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async resetPlayerStats(
    args: PlayerInstruction.ResetPlayerStatsArgs,
    accounts: Partial<PlayerInstruction.ResetPlayerStatsAccounts>,
    additionalArgs: Partial<PlayerInstruction.ResetPlayerStatsAdditionalArgs>,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    if (!accounts.metadataUpdateAuthority) {
      accounts.metadataUpdateAuthority = await this.getMetadataUpdateAuthority(
        args.playerMint
      );
    }

    await this.setPlayerClassIndexIfNecessary(
      args.playerMint,
      args.index,
      additionalArgs
    );

    const { instructions, signers } = await this.instruction.resetPlayerStats(
      args as PlayerInstruction.ResetPlayerStatsArgs,
      accounts as PlayerInstruction.ResetPlayerStatsAccounts,
      additionalArgs as PlayerInstruction.ResetPlayerStatsAdditionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async useItem(
    args: PlayerInstruction.UseItemArgs,
    accounts: Partial<PlayerInstruction.UseItemAccounts>,
    additionalArgs: Partial<PlayerInstruction.UseItemAdditionalArgs>,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    if (!accounts.metadataUpdateAuthority) {
      accounts.metadataUpdateAuthority = await this.getMetadataUpdateAuthority(
        args.playerMint
      );
    }

    await this.setPlayerClassIndexIfNecessary(
      args.playerMint,
      args.index,
      additionalArgs
    );

    if (!accounts?.validationProgram) {
      const itemClass = await additionalArgs.itemProgram.fetchItemClass(
        args.itemClassMint,
        args.itemClassIndex
      );

      const usage = args.itemUsageIndex
        ? itemClass.object.itemClassData.config.usages[args.itemUsageIndex]
        : null;

      if (usage) {
        accounts.validationProgram = usage?.validation?.key;
      }
    }

    const { instructions, signers } = await this.instruction.useItem(
      args as PlayerInstruction.UseItemArgs,
      accounts as PlayerInstruction.UseItemAccounts,
      additionalArgs as PlayerInstruction.UseItemAdditionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async updateValidForUseIfWarmupPassedOnItem(
    args: PlayerInstruction.UpdateValidForUseIfWarmupPassedOnItemArgs,
    accounts: Partial<PlayerInstruction.UpdateValidForUseIfWarmupPassedOnItemAccounts>,
    additionalArgs: Partial<PlayerInstruction.UpdateValidForUseIfWarmupPassedOnItemAdditionalArgs>,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    if (!accounts.metadataUpdateAuthority) {
      accounts.metadataUpdateAuthority = await this.getMetadataUpdateAuthority(
        args.playerMint
      );
    }

    await this.setPlayerClassIndexIfNecessary(
      args.playerMint,
      args.index,
      additionalArgs
    );

    const { instructions, signers } =
      await this.instruction.updateValidForUseIfWarmupPassedOnItem(
        args as PlayerInstruction.UpdateValidForUseIfWarmupPassedOnItemArgs,
        accounts as PlayerInstruction.UpdateValidForUseIfWarmupPassedOnItemAccounts,
        additionalArgs as PlayerInstruction.UpdateValidForUseIfWarmupPassedOnItemAdditionalArgs
      );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async addItem(
    args: PlayerInstruction.AddItemArgs,
    accounts: Partial<PlayerInstruction.AddItemAccounts>,
    additionalArgs: Partial<PlayerInstruction.AddItemAdditionalArgs>,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    if (!accounts.itemMint) {
      throw new Error("Missing itemMint in accounts");
    }

    if (!additionalArgs.itemProgram) {
      throw new Error("Missing itemProgram in additionalArgs");
    }

    if (!accounts.itemAccount) {
      accounts.itemAccount = (
        await getAtaForMint(
          accounts.itemMint,
          (this.client.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
    }

    if (!accounts?.metadataUpdateAuthority) {
      accounts.metadataUpdateAuthority = await this.getMetadataUpdateAuthority(
        args.playerMint
      );
    }

    await this.setPlayerClassIndexIfNecessary(
      args.playerMint,
      args.index,
      additionalArgs
    );

    await this.setItemInfoIfNecessary(args, accounts, additionalArgs);

    if (!accounts?.validationProgram) {
      const playerClass = (await this.client.account.playerClass.fetch(
        (
          await getPlayerPDA(
            additionalArgs.playerClassMint,
            additionalArgs.classIndex
          )
        )[0]
      )) as any;

      if (playerClass.data.config.addToPackValidation) {
        accounts.validationProgram =
          playerClass.data.config.addToPackValidation;
      }
    }

    if (!additionalArgs.totalItemsAvailable) {
      additionalArgs.totalItemsAvailable = new BN(
        (
          await this.client.provider.connection.getTokenAccountBalance(
            accounts.itemAccount
          )
        ).value.uiAmount
      );
    }

    const { instructions, signers } = await this.instruction.addItem(
      args,
      accounts as PlayerInstruction.AddItemAccounts,
      additionalArgs as PlayerInstruction.AddItemAdditionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async removeItem(
    args: PlayerInstruction.RemoveItemArgs,
    accounts: Partial<PlayerInstruction.RemoveItemAccounts>,
    additionalArgs: Partial<PlayerInstruction.RemoveItemAdditionalArgs>,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    if (!accounts.itemMint) {
      throw new Error("Missing itemMint");
    }

    if (!additionalArgs.itemProgram) {
      throw new Error("Missing itemProgram in additionalArgs");
    }

    if (!accounts.itemAccount) {
      accounts.itemAccount = (
        await getAtaForMint(
          accounts.itemMint,
          (this.client.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
    }

    if (!accounts?.metadataUpdateAuthority) {
      accounts.metadataUpdateAuthority = await this.getMetadataUpdateAuthority(
        args.playerMint
      );
    }

    await this.setPlayerClassIndexIfNecessary(
      args.playerMint,
      args.index,
      additionalArgs
    );

    await this.setItemInfoIfNecessary(args, accounts, additionalArgs);

    if (!accounts?.validationProgram) {
      const playerClass = (await this.client.account.playerClass.fetch(
        (
          await getPlayerPDA(
            additionalArgs.playerClassMint,
            additionalArgs.classIndex
          )
        )[0]
      )) as any;

      if (playerClass.data.config.addToPackValidation) {
        accounts.validationProgram =
          playerClass.data.config.addToPackValidation;
      }
    }

    const { instructions, signers } = await this.instruction.removeItem(
      args,
      accounts as PlayerInstruction.RemoveItemAccounts,
      additionalArgs as PlayerInstruction.RemoveItemAdditionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async setPlayerClassIndexIfNecessary(
    playerMint: PublicKey,
    index: BN,
    additionalArgs: any
  ) {
    if (!additionalArgs.classIndex || !additionalArgs.playerClassMint) {
      const player = await this.client.account.player.fetch(
        (
          await getPlayerPDA(playerMint, index)
        )[0]
      );
      additionalArgs.classIndex = player.classIndex as BN;

      if (!additionalArgs.playerClassMint) {
        const playerClass = await this.client.account.playerClass.fetch(
          player.parent as PublicKey
        );

        if (!playerClass.mint) {
          throw new Error(
            "Unable to derive player class mint from player class, please pass it in"
          );
        } else {
          additionalArgs.playerClassMint = playerClass.mint as PublicKey;
        }
      }
    }
  }

  async setItemInfoIfNecessary(args: any, accounts: any, additionalArgs: any) {
    if (!additionalArgs.itemClassIndex || !additionalArgs.itemClassMint) {
      const item = await additionalArgs.itemProgram.client.account.item.fetch(
        (
          await getItemPDA(accounts.itemMint, args.itemIndex)
        )[0]
      );

      additionalArgs.itemClassIndex = item.classIndex as BN;

      if (!additionalArgs.itemClassMint) {
        const itemClass =
          await additionalArgs.itemProgram.client.account.itemClass.fetch(
            item.parent as PublicKey
          );

        if (!itemClass.mint) {
          throw new Error(
            "Unable to derive item class mint from item, please pass it in"
          );
        } else {
          additionalArgs.itemClassMint = itemClass.mint as PublicKey;
        }
      }
    }
  }

  async addItemEffect(
    args: PlayerInstruction.AddItemEffectArgs,
    accounts: Partial<PlayerInstruction.AddItemEffectAccounts>,
    additionalArgs: Partial<PlayerInstruction.AddItemEffectAdditionalArgs>,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    if (!accounts?.metadataUpdateAuthority) {
      accounts.metadataUpdateAuthority = await this.getMetadataUpdateAuthority(
        args.playerMint
      );
    }

    if (!accounts.itemMint) {
      throw new Error("Must pass itemMint!");
    }

    await this.setPlayerClassIndexIfNecessary(
      args.playerMint,
      args.index,
      additionalArgs
    );

    if (!additionalArgs.amount) {
      const item = (await getItemPDA(accounts.itemMint, args.itemIndex))[0];
      const player = (await getPlayerPDA(args.playerMint, args.index))[0];
      const itemActivationMarkerPDA = (
        await getItemActivationMarker({
          itemMint: accounts.itemMint,
          itemAccount: (await getPlayerItemAccount({ item, player }))[0],
          index: args.itemIndex,
          usageIndex: new BN(args.itemUsageIndex),
          amount: additionalArgs.amount,
        })
      )[0];
      const itemMarker =
        await additionalArgs.itemProgram.client.account.itemActivationMarker.fetch(
          itemActivationMarkerPDA
        );

      additionalArgs.amount = itemMarker.amount as BN;
    }

    if (!accounts?.callbackProgram) {
      const itemClass = await additionalArgs.itemProgram.fetchItemClass(
        args.itemClassMint,
        args.itemClassIndex
      );

      const usage =
        itemClass.object.itemClassData.config.usages[args.itemUsageIndex];

      if (usage) {
        accounts.callbackProgram = usage.callback?.key;
      }
    }

    const { instructions, signers } = await this.instruction.addItemEffect(
      args,
      accounts as PlayerInstruction.AddItemEffectAccounts,
      additionalArgs as PlayerInstruction.AddItemEffectAdditionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }

  async subtractItemEffect(
    _args = {},
    accounts: Partial<PlayerInstruction.SubtractItemEffectAccounts>,
    additionalArgs: PlayerInstruction.SubtractItemEffectAdditionalArgs,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{
    rpc: () => Promise<{ txid: string; slot: number }>;
    instructions: TransactionInstruction[];
    signers: Signer[];
  }> {
    if (!accounts.playerClass) {
      const player = await this.client.account.player.fetch(accounts.player);
      accounts.playerClass = player.parent as PublicKey;
    }

    const { instructions, signers } = await this.instruction.subtractItemEffect(
      _args,
      accounts as PlayerInstruction.SubtractItemEffectAccounts,
      additionalArgs as PlayerInstruction.SubtractItemEffectAdditionalArgs
    );

    return {
      instructions,
      signers,
      rpc: () => this.sendWithRetry(instructions, signers, options),
    };
  }
}

export async function getPlayerProgram(
  anchorWallet: NodeWallet | web3.Keypair,
  env: string,
  customRpcUrl: string
): Promise<PlayerProgram> {
  if ((anchorWallet as web3.Keypair).secretKey) {
    return PlayerProgram.getProgramWithWalletKeyPair(
      PlayerProgram,
      anchorWallet as web3.Keypair,
      env,
      customRpcUrl
    );
  }

  return PlayerProgram.getProgramWithWallet(
    PlayerProgram,
    anchorWallet as Wallet,
    env,
    customRpcUrl
  );
}
