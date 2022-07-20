import { web3 } from "@project-serum/anchor";
import { Program } from "@raindrop-studios/sol-kit";

import * as PlayerInstrucition from "./instructions/player";
import { Player } from "../state/player";

export class Redemption extends Program.Program {
  declare instruction: RedemptionInstruction.Instruction;
  static PREFIX = "trash_with_frens_redemption";
  PROGRAM_ID = REDEMPTION_PROGRAM_ID;

  constructor() {
    super();
    this.instruction = new RedemptionInstruction.Instruction({ program: this });
  }

  async initialize(
    args: RedemptionInstruction.InitializeArgs,
    accounts: RedemptionInstruction.InitializeAccounts,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{ txid: string; slot: number }> {
    const instruction = await this.instruction.initialize(args, accounts);

    return this.sendWithRetry(instruction, [], options);
  }

  async enableTreasury(
    accounts: RedemptionInstruction.TreasuryAuthorityAccounts,
    options?: { commitment: web3.Commitment; timeout?: number }
  ): Promise<{ txid: string; slot: number }> {
    const instruction = await this.instruction.enableTreasury(accounts);

    return this.sendWithRetry(instruction, [accounts.updateAuthority], options);
  }
}
