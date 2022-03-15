import { web3, Program, BN, Provider, Wallet } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import log from "loglevel";

import { NAMESPACE_ID, TOKEN_PROGRAM_ID } from "../constants/programIds";
import { decodeNamespace, Namespace, PermissivenessSettings } from "../state/namespace";
import { getNamespacePDA } from "../utils/pda";

import { ObjectWrapper } from "./common";
import { getCluster } from "../utils/connection";
import { sendTransactionWithRetry } from "../utils/transactions";

function convertNumbersToBNs(data: any) {
  if (data.desiredNamespaceArraySize) {
    data.desiredNamespaceArraySize = new BN(data.desiredNamespaceArraySize);
  }
  if (data.bump) {
    data.bump = new BN(data.bump);
  }
}

export class NamespaceWrapper implements ObjectWrapper<Namespace, NamespaceProgram> {
  program: NamespaceProgram;
  key: web3.PublicKey;
  object: Namespace;
  data: Buffer;

  constructor(args: {
    program: NamespaceProgram;
    key: web3.PublicKey;
    object: Namespace;
    data: Buffer;
  }) {
    this.program = args.program;
    this.key = args.key;
    this.object = args.object;
    this.data = args.data;
  }
}

export interface InitializeNamespaceAccounts {
  namespace?: web3.PublicKey;
  mint: web3.PublicKey;
  metadata: web3.PublicKey;
  masterEdition: web3.PublicKey;
}

export interface InitializeNamespaceArgs {
  bump?: number;
  desiredNamespaceArraySize: BN;
  uuid: string;
  prettyName: string;
  permissivenessSettings: PermissivenessSettings;
  whitelistedStakingMints: web3.PublicKey[];
}

export interface InitializeNamespaceAdditionalArgs {}

export class NamespaceInstruction {
  id: web3.PublicKey;
  program: Program;

  constructor(args: { id: web3.PublicKey; program: Program }) {
    this.id = args.id;
    this.program = args.program;
  }

  async initializeNamespace(
    args: InitializeNamespaceArgs,
    accounts: InitializeNamespaceAccounts,
    _additionalArgs: InitializeNamespaceAdditionalArgs = {}
  ) {
    const [namespacePDA, namespaceBump] = await getNamespacePDA(
      accounts.mint,
    )
    args.bump = namespaceBump;

    convertNumbersToBNs(args);

    const remainingAccounts = args.whitelistedStakingMints.map(
      mint => { return { pubkey: mint, isWritable: false, isSigner: false } }
    );

    return [
      this.program.instruction.initializeNamespace(args, {
        accounts: {
          namespace: namespacePDA,
          mint: accounts.mint,
          metadata: accounts.metadata,
          masterEdition: accounts.masterEdition,
          payer: this.program.provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        },
        remainingAccounts: remainingAccounts,
      })
    ];
  }
}

export class NamespaceProgram {
  id: web3.PublicKey;
  program: Program;
  instruction: NamespaceInstruction;

  constructor(args: { id: web3.PublicKey; program: Program; }) {
    this.id = args.id;
    this.program = args.program;
    this.instruction = new NamespaceInstruction({
      id: this.id,
      program: this.program,
    });
  }

  async initializeNamespace(
    args: InitializeNamespaceArgs,
    accounts: InitializeNamespaceAccounts,
  ): Promise<void> {
    const instruction = await this.instruction.initializeNamespace(
      args,
      accounts
    );

    await sendTransactionWithRetry(
      this.program.provider.connection,
      this.program.provider.wallet,
      instruction,
      []
    );
  }

  async fetchNamespace(
    mint: web3.PublicKey,
  ): Promise<NamespaceWrapper> {
    let namespacePDA = (await getNamespacePDA(mint))[0];

    let namespaceObj = await this.program.provider.connection.getAccountInfo(namespacePDA);

    const namespaceDecoded = decodeNamespace(namespaceObj.data);
    namespaceDecoded.program = this.program;

    return new NamespaceWrapper({
      program: this,
      key: namespacePDA,
      data: namespaceObj.data,
      object: namespaceDecoded,
    });
  }
}

export async function getNamespaceProgram(
  anchorWallet: NodeWallet | web3.Keypair,
  env: string,
  customRpcUrl: string
): Promise<NamespaceProgram> {
  if (customRpcUrl) log.debug("USING CUSTOM RPC URL:", customRpcUrl);

  const solConnection = new web3.Connection(customRpcUrl || getCluster(env));

  if (anchorWallet instanceof web3.Keypair) {
    anchorWallet = new NodeWallet(anchorWallet);
  }

  const provider = new Provider(solConnection, anchorWallet, {
    preflightCommitment: "recent",
  });

  const idl = await Program.fetchIdl(NAMESPACE_ID, provider);

  const program = new Program(idl, NAMESPACE_ID, provider);

  return new NamespaceProgram({
    id: NAMESPACE_ID,
    program,
  });
}
