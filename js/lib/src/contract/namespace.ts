import { Program } from "@raindrop-studios/sol-kit";
import { web3 } from "@project-serum/anchor";

import * as NamespaceInstruction from "../instructions/namespace";
import { NAMESPACE_ID } from "../constants/programIds";
import { NAMESPACE_PREFIX } from "../constants/namespace";
import { Namespace, NamespaceGatekeeper } from "../state/namespace";
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
    accounts: NamespaceInstruction.InitializeNamespaceAccounts
  ): Promise<[string, web3.PublicKey]> {
    const [instruction, namespacePDA] =
      await this.instruction.initializeNamespace(args, accounts);

    const result = await this.sendWithRetry(instruction, []);

    return [result.txid, namespacePDA];
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

  async updateNamespace(
    args: NamespaceInstruction.UpdateNamespaceArgs,
    accounts: NamespaceInstruction.UpdateNamespaceAccounts
  ): Promise<string> {
    const instruction = await this.instruction.updateNamespace(args, accounts);

    const result = await this.sendWithRetry(instruction, []);

    return result.txid;
  }

  async createNamespaceGatekeeper(
    accounts: NamespaceInstruction.CreateNamespaceGatekeeperAccounts
  ): Promise<[string, web3.PublicKey]> {
    const [instruction, gatekeeper] =
      await this.instruction.createNamespaceGatekeeper(accounts);

    const result = await this.sendWithRetry(instruction, []);

    return [result.txid, gatekeeper];
  }

  async addToNamespaceGatekeeper(
    args: NamespaceInstruction.AddToNamespaceGatekeeperArgs,
    accounts: NamespaceInstruction.AddToNamespaceGatekeeperAccounts
  ): Promise<string> {
    const instruction = await this.instruction.addToNamespaceGatekeeper(
      args,
      accounts
    );
    const result = await this.sendWithRetry(instruction, []);

    return result.txid;
  }

  async removeFromNamespaceGatekeeper(
    args: NamespaceInstruction.RemoveFromNamespaceGatekeeperArgs,
    accounts: NamespaceInstruction.RemoveFromNamespaceGatekeeperAccounts
  ): Promise<string> {
    const instruction = await this.instruction.removeFromNamespaceGatekeeper(
      args,
      accounts
    );

    const result = await this.sendWithRetry(instruction, []);

    return result.txid;
  }

  async joinNamespace(
    accounts: NamespaceInstruction.JoinNamespaceAccounts
  ): Promise<string> {
    const instruction = await this.instruction.joinNamespace(accounts);

    const result = await this.sendWithRetry(instruction, []);

    return result.txid;
  }

  async leaveNamespace(
    accounts: NamespaceInstruction.LeaveNamespaceAccounts
  ): Promise<string> {
    const instruction = await this.instruction.leaveNamespace(accounts);

    const result = await this.sendWithRetry(instruction, []);

    return result.txid;
  }

  async cacheArtifact(
    accounts: NamespaceInstruction.CacheArtifactAccounts
  ): Promise<string> {
    const instruction = await this.instruction.cacheArtifact(accounts);

    const result = await this.sendWithRetry(instruction, []);

    return result.txid;
  }

  async uncacheArtifact(
    args: NamespaceInstruction.UncacheArtifactArgs,
    accounts: NamespaceInstruction.UncacheArtifactAccounts
  ): Promise<string> {
    const instruction = await this.instruction.uncacheArtifact(args, accounts);

    const result = await this.sendWithRetry(instruction, []);

    return result.txid;
  }
}
