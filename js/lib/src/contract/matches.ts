import { web3 } from "@project-serum/anchor";
import { Program, SendOptions } from "@raindrop-studios/sol-kit";
import * as MatchesInstruction from "../instructions/matches";
import { PREFIX } from "../constants/matches";
import { MATCHES_ID } from "../constants/programIds";
import { SendTransactionResult } from "@raindrop-studios/sol-kit/dist/src/transaction";
import { Match, WinOracle } from "../state/matches";

export class MatchesProgram extends Program.Program {
  declare instruction: MatchesInstruction.Instruction;
  static PREFIX = PREFIX;
  PROGRAM_ID = MATCHES_ID;

  constructor() {
    super();

    this.instruction = new MatchesInstruction.Instruction({ program: this });
  }

  async fetchMatch(match: web3.PublicKey): Promise<Match> {
    const matchObj = await this.client.account.match.fetch(match);
    return new Match(match, matchObj);
  }

  async fetchWinOracle(winOracle: web3.PublicKey): Promise<WinOracle> {
    const winOracleObj = await this.client.account.winOracle.fetch(winOracle);
    return new WinOracle(winOracle, winOracleObj);
  }

  async createMatch(
    args: MatchesInstruction.CreateMatchArgs,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.createMatch(args);

    return await this.sendWithRetry(ix.instructions, ix.signers, options);
  }

  async joinMatch(
    args: MatchesInstruction.JoinMatchArgs,
    accounts: MatchesInstruction.JoinMatchAccounts,
    additionalArgs: MatchesInstruction.JoinMatchAdditionalArgs,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.joinMatch(args, accounts, additionalArgs);

    return await this.sendWithRetry(ix.instructions, ix.signers, options);
  }

  async leaveMatch(
    args: MatchesInstruction.LeaveMatchArgs,
    accounts: MatchesInstruction.LeaveMatchAccounts,
    additionalArgs: MatchesInstruction.LeaveMatchAdditionalArgs,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.leaveMatch(
      args,
      accounts,
      additionalArgs
    );

    return await this.sendWithRetry(ix.instructions, ix.signers, options);
  }

  async drainMatch(
    accounts: MatchesInstruction.DrainMatchAccounts,
    additionalArgs: MatchesInstruction.DrainMatchAdditionalArgs,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.drainMatch({}, accounts, additionalArgs);

    return await this.sendWithRetry(ix.instructions, ix.signers, options);
  }

  async updateMatchFromOracle(
    accounts: MatchesInstruction.UpdateMatchFromOracleAccounts,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.updateMatchFromOracle({}, accounts, {});

    return await this.sendWithRetry(ix.instructions, ix.signers, options);
  }

  async createOrUpdateOracle(
    args: MatchesInstruction.CreateOrUpdateOracleArgs,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.createOrUpdateOracle(args);

    return await this.sendWithRetry(ix.instructions, ix.signers, options);
  }

  async disburseTokensByOracle(
    args: MatchesInstruction.DisburseTokensByOracleArgs,
    accounts: MatchesInstruction.DisburseTokensByOracleAccounts,
    additionalArgs: MatchesInstruction.DisburseTokensByOracleAdditionalArgs,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.disburseTokensByOracle(
      args,
      accounts,
      additionalArgs
    );

    return await this.sendWithRetry(ix.instructions, ix.signers, options);
  }
}
