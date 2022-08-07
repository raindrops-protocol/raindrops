import { Program } from "@raindrop-studios/sol-kit";
import { web3 } from "@project-serum/anchor";

import * as NamespaceInstruction from "../instructions/namespace";
import { NAMESPACE_ID } from "../constants/programIds";
import { NAMESPACE_PREFIX } from "../constants/namespace";
import { Namespace } from "../state/namespace";
import { getNamespacePDA } from "../utils/pda";

export class NamespaceProgram extends Program.Program {
  declare instruction: NamespaceInstruction.Instruction;
  static NAMESPACE_PREFIX = NAMESPACE_PREFIX;
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

  async createNamespaceGatekeeper(accounts: NamespaceInstruction.CreateNamespaceGatekeeperAccounts): Promise<void> {
    const instruction = await this.instruction.createNamespaceGatekeeper(accounts);

    await this.sendWithRetry(
      instruction,
      []
    );
  }

  async addToNamespaceGatekeeper(args: NamespaceInstruction.AddToNamespaceGatekeeperArgs, accounts: NamespaceInstruction.AddToNamespaceGatekeeperAccounts): Promise<void> {
    const instruction = await this.instruction.addToNamespaceGatekeeper(args, accounts);
    await this.sendWithRetry(
      instruction,
      []
    );
  }

  async removeFromNamespaceGatekeeper(args: NamespaceInstruction.RemoveFromNamespaceGatekeeperArgs, accounts: NamespaceInstruction.RemoveFromNamespaceGatekeeperAccounts): Promise<void> {
    const instruction = await this.instruction.removeFromNamespaceGatekeeper(args, accounts);

    await this.sendWithRetry(
      instruction,
      []
    );
  }

  async joinNamespace(accounts: NamespaceInstruction.JoinNamespaceAccounts): Promise<void> {
    const instruction = await this.instruction.joinNamespace(accounts);

    await this.sendWithRetry(
      instruction,
      []
    );
  }

  async leaveNamespace(accounts: NamespaceInstruction.LeaveNamespaceAccounts): Promise<void> {
    const instruction = await this.instruction.leaveNamespace(accounts);

    await this.sendWithRetry(
      instruction,
      []
    );
  }

  async cacheArtifact(accounts: NamespaceInstruction.CacheArtifactAccounts): Promise<void> {
    const instruction = await this.instruction.cacheArtifact(accounts);

    await this.sendWithRetry(
      instruction,
      []
    );
  }

  async uncacheArtifact(accounts: NamespaceInstruction.UncacheArtifactAccounts): Promise<void> {
    const instruction = await this.instruction.uncacheArtifact(accounts);

    await this.sendWithRetry(
      instruction,
      []
    );
  }
};
