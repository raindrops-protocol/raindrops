import { web3, BN, AnchorProvider } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";
import {
  Program,
  Instruction as SolKitInstruction,
  InstructionUtils,
} from "@raindrops-protocol/sol-kit";

import { getNamespacePDA } from "../utils/pda";
import { TOKEN_PROGRAM_ID } from "../constants/programIds";
import { PermissivenessSettings } from "../state/namespace";

export interface InitializeNamespaceAccounts {
  namespace?: web3.PublicKey;
  mint: web3.PublicKey;
  metadata: web3.PublicKey;
  masterEdition: web3.PublicKey;
}

export interface InitializeNamespaceArgs {
  desiredNamespaceArraySize: BN;
  uuid: string;
  prettyName: string;
  permissivenessSettings: PermissivenessSettings;
  whitelistedStakingMints: web3.PublicKey[];
}

export interface UpdateNamespaceArgs {
  prettyName: string | null;
  permissivenessSettings: PermissivenessSettings | null;
  whitelistedStakingMints: web3.PublicKey[] | null;
}

export interface UpdateNamespaceAccounts {
  mint: web3.PublicKey;
  namespaceToken: web3.PublicKey;
  tokenHolder: web3.PublicKey;
}

export class Instruction extends SolKitInstruction {
  constructor(args: { program: Program.Program }) {
    super(args);
  }

  async initializeNamespace(
    args: InitializeNamespaceArgs,
    accounts: InitializeNamespaceAccounts
  ) {
    const [namespacePDA, _namespaceBump] = await getNamespacePDA(accounts.mint);

    InstructionUtils.convertNumbersToBNs(args, [
      "desiredNamespaceArraySize",
      "bump",
    ]);

    const remainingAccounts = args.whitelistedStakingMints.map((mint) => {
      return { pubkey: mint, isWritable: false, isSigner: false };
    });

    return [
      await this.program.client.methods
        .initializeNamespace(args)
        .accounts({
          namespace: namespacePDA,
          mint: accounts.mint,
          metadata: accounts.metadata,
          masterEdition: accounts.masterEdition,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
  }

  async updateNamespace(
    args: UpdateNamespaceArgs,
    accounts: UpdateNamespaceAccounts
  ) {
    const [namespacePDA, _namespaceBump] = await getNamespacePDA(accounts.mint);

    const remainingAccounts = args.whitelistedStakingMints.map((mint) => ({
      pubkey: mint,
      isWritable: false,
      isSigner: false,
    }));

    return [
      await this.program.client.methods
        .updateNamespace(args)
        .accounts({
          namespace: namespacePDA,
          namespaceToken: accounts.namespaceToken,
          tokenHolder: accounts.tokenHolder,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
  }
}
