import * as anchor from "@project-serum/anchor";
import { Program, SendOptions } from "@raindrop-studios/sol-kit";
import * as MatchesInstruction from "../instructions/matches";
import { PREFIX } from "../constants/matches";
import { MATCHES_ID } from "../constants/programIds";
import { SendTransactionResult } from "@raindrop-studios/sol-kit/dist/src/transaction";

export class MatchesProgram extends Program.Program {
  declare instruction: MatchesInstruction.Instruction;
  static PREFIX = PREFIX;
  PROGRAM_ID = MATCHES_ID;

  constructor() {
    super();

    this.instruction = new MatchesInstruction.Instruction({ program: this });
  }

  async createMatch(
    args: MatchesInstruction.CreateMatchArgs,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const ix = await this.instruction.createMatch(args);

    return await this.sendWithRetry(ix.instructions, ix.signers, options);
  }

  async createOracle(args: MatchesInstruction.CreateOrUpdateOracleArgs, options?: SendOptions): Promise<SendTransactionResult> {
    const ix = await this.instruction.createOrUpdateOracle(args);

    return await this.sendWithRetry(ix.instructions, ix.signers, options)
  }
}
