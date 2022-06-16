import { Program } from "@raindrops-protocol/sol-kit";
import { web3 } from "@project-serum/anchor";

import * as NamespaceInstruction from "../instructions/namespace";
import { NAMESPACE_ID } from "../constants/programIds";
import { PREFIX } from "../constants/namespace";
import { Namespace } from "../state/namespace";
import { getNamespacePDA } from "../utils/pda";

export class NamespaceProgram extends Program.Program {
  declare instruction: NamespaceInstruction.Instruction;
  static PREFIX = PREFIX;
  PROGRAM_ID = NAMESPACE_ID;

  constructor() {
    super();

    this.instruction = new NamespaceInstruction.Instruction({ program: this });
  }

  async initializeNamespace(
    args: NamespaceInstruction.InitializeNamespaceArgs,
    accounts: NamespaceInstruction.InitializeNamespaceAccounts,
  ): Promise<void> {
    const instruction = await this.instruction.initializeNamespace(
      args,
      accounts
    );

    await this.sendWithRetry(
      instruction,
      []
    );
  }

  async fetchNamespace(mint: web3.PublicKey): Promise<Namespace> {
    let namespacePDA = (await getNamespacePDA(mint))[0];

    const namespaceObj = await this.client.account.namespace.fetch(namespacePDA);
    return new Namespace(namespacePDA, namespaceObj);
  };

  async updateNamespace(
    args: NamespaceInstruction.UpdateNamespaceArgs,
    accounts: NamespaceInstruction.UpdateNamespaceAccounts,
  ): Promise<void> {
    const instruction = await this.instruction.updateNamespace(
      args,
      accounts
    );

    await this.sendWithRetry(
      instruction,
      []
    );
  }
};
