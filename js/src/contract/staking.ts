import { web3 } from "@project-serum/anchor";
import { Program } from "@raindrop-studios/sol-kit";
import { STAKING_ID } from "../constants/programIds";
import { PREFIX } from "../constants/staking";
import * as StakingInstruction from "../instructions/staking";

export class StakingProgram extends Program.Program {
  declare instruction: StakingInstruction.Instruction;
  static PREFIX = PREFIX;
  PROGRAM_ID = STAKING_ID;

  constructor() {
    super();

    this.instruction = new StakingInstruction.Instruction({ program: this });
  }

  async beginArtifactStakeWarmup(
    args: StakingInstruction.BeginArtifactStakeWarmupArgs,
    accounts: StakingInstruction.BeginArtifactStakeWarmupAccounts,
    options?: { commitment: web3.Commitment; timeout?: number }
  ) {
    const instruction = await this.instruction.beginArtifactStakeWarmup(
      args,
      accounts
    );

    return await this.sendWithRetry(
      instruction,
      [accounts.stakingTransferAuthority],
      options
    );
  }

  async endArtifactStakeWarmup(
    args: StakingInstruction.EndArtifactStakeWarmupArgs,
    accounts: StakingInstruction.EndArtifactStakeWarmupAccounts,
    options?: { commitment: web3.Commitment; timeout?: number }
  ) {
    const instruction = await this.instruction.endArtifactStakeWarmup(
      args,
      accounts
    );

    return await this.sendWithRetry(instruction, [], options);
  }

  async beginArtifactStakeCooldown(
    args: StakingInstruction.BeginArtifactStakeCooldownArgs,
    accounts: StakingInstruction.BeginArtifactStakeCooldownAccounts,
    options?: { commitment: web3.Commitment; timeout?: number }
  ) {
    const instruction = await this.instruction.beginArtifactStakeCooldown(
      args,
      accounts
    );

    return await this.sendWithRetry(instruction, [], options);
  }

  async endARtifactStakeCooldown(
    args: StakingInstruction.EndArtifactStakeCooldownArgs,
    accounts: StakingInstruction.EndArtifactStakeCooldownAccounts,
    options?: { commitment: web3.Commitment; timeout?: number }
  ) {
    const instruction = await this.instruction.endArtifactStakeCooldown(
      args,
      accounts
    );

    return await this.sendWithRetry(instruction, [], options);
  }
}
