import { Program, SendOptions } from "@raindrop-studios/sol-kit";
import { web3 } from "@project-serum/anchor";

import * as NamespaceInstruction from "../instructions/namespace";
import { NAMESPACE_ID } from "../constants/programIds";
import { PREFIX } from "../constants/namespace";
import {
  Namespace,
  NamespaceGatekeeper,
  NamespaceIndex,
} from "../state/namespace";
import { SendTransactionResult } from "@raindrop-studios/sol-kit/dist/src/transaction";

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
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const [instruction, namespacePDA] =
      await this.instruction.initializeNamespace(args, accounts);

    return await this.sendWithRetry(instruction, [], options);
  }

  async fetchNamespace(namespace: web3.PublicKey): Promise<Namespace> {
    const namespaceObj = await this.client.account.namespace.fetch(namespace);
    return new Namespace(namespace, namespaceObj);
  }

  async fetchNamespaceGatekeeper(
    namespaceGatekeeper: web3.PublicKey
  ): Promise<NamespaceGatekeeper> {
    const namespaceGatekeeperObj =
      await this.client.account.namespaceGatekeeper.fetch(namespaceGatekeeper);
    return new NamespaceGatekeeper(namespaceGatekeeper, namespaceGatekeeperObj);
  }

  async fetchNamespaceIndex(
    namespaceIndex: web3.PublicKey
  ): Promise<NamespaceIndex> {
    const namespaceIndexObj = await this.client.account.namespaceIndex.fetch(
      namespaceIndex
    );
    return new NamespaceIndex(namespaceIndex, namespaceIndexObj);
  }

  async updateNamespace(
    args: NamespaceInstruction.UpdateNamespaceArgs,
    accounts: NamespaceInstruction.UpdateNamespaceAccounts,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const instruction = await this.instruction.updateNamespace(args, accounts);

    return this.sendWithRetry(instruction, [], options);
  }

  async createNamespaceGatekeeper(
    accounts: NamespaceInstruction.CreateNamespaceGatekeeperAccounts,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const [instruction, gatekeeper] =
      await this.instruction.createNamespaceGatekeeper(accounts);

    return this.sendWithRetry(instruction, [], options);
  }

  async addToNamespaceGatekeeper(
    args: NamespaceInstruction.AddToNamespaceGatekeeperArgs,
    accounts: NamespaceInstruction.AddToNamespaceGatekeeperAccounts,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const instruction = await this.instruction.addToNamespaceGatekeeper(
      args,
      accounts
    );

    return this.sendWithRetry(instruction, [], options);
  }

  async removeFromNamespaceGatekeeper(
    args: NamespaceInstruction.RemoveFromNamespaceGatekeeperArgs,
    accounts: NamespaceInstruction.RemoveFromNamespaceGatekeeperAccounts,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const instruction = await this.instruction.removeFromNamespaceGatekeeper(
      args,
      accounts
    );

    return this.sendWithRetry(instruction, [], options);
  }

  async joinNamespace(
    accounts: NamespaceInstruction.JoinNamespaceAccounts,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const instruction = await this.instruction.joinNamespace(accounts);

    return this.sendWithRetry(instruction, [], options);
  }

  async leaveNamespace(
    accounts: NamespaceInstruction.LeaveNamespaceAccounts,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const instruction = await this.instruction.leaveNamespace(accounts);

    return this.sendWithRetry(instruction, [], options);
  }

  async cacheArtifact(
    accounts: NamespaceInstruction.CacheArtifactAccounts,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const instruction = await this.instruction.cacheArtifact(accounts);

    return this.sendWithRetry(instruction, [], options);
  }

  async uncacheArtifact(
    args: NamespaceInstruction.UncacheArtifactArgs,
    accounts: NamespaceInstruction.UncacheArtifactAccounts,
    options?: SendOptions
  ): Promise<SendTransactionResult> {
    const instruction = await this.instruction.uncacheArtifact(args, accounts);

    return this.sendWithRetry(instruction, [], options);
  }
}
