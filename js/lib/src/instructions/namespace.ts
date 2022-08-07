import { web3, BN, AnchorProvider } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";
import {
  Program,
  Instruction as SolKitInstruction,
} from "@raindrop-studios/sol-kit";

import {
  getIndexPDA,
  getNamespaceGatekeeperPDA,
  getNamespacePDA,
} from "../utils/pda";
import { ITEM_ID, TOKEN_PROGRAM_ID } from "../constants/programIds";
import { ArtifactFilter, PermissivenessSettings } from "../state/namespace";

export interface InitializeNamespaceAccounts {
  namespace: web3.PublicKey;
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

export interface CreateNamespaceGatekeeperAccounts {
  namespace: web3.PublicKey;
  namespaceToken: web3.PublicKey;
  tokenHolder: web3.PublicKey;
}

export interface AddToNamespaceGatekeeperArgs {
  artifactFilter: ArtifactFilter;
}

export interface AddToNamespaceGatekeeperAccounts {
  namespace: web3.PublicKey;
  namespaceToken: web3.PublicKey;
  tokenHolder: web3.PublicKey;
}

export interface RemoveFromNamespaceGatekeeperArgs {
  artifactFilter: ArtifactFilter;
}

export interface RemoveFromNamespaceGatekeeperAccounts {
  namespace: web3.PublicKey;
  namespaceToken: web3.PublicKey;
  tokenHolder: web3.PublicKey;
}

export interface JoinNamespaceAccounts {
  namespace: web3.PublicKey;
  namespaceToken: web3.PublicKey;
  tokenHolder: web3.PublicKey;
  artifact: web3.PublicKey;
}

export interface LeaveNamespaceAccounts {
  namespace: web3.PublicKey;
  namespaceToken: web3.PublicKey;
  tokenHolder: web3.PublicKey;
  artifact: web3.PublicKey;
}

export interface CacheArtifactAccounts {
  namespace: web3.PublicKey;
  namespaceToken: web3.PublicKey;
  tokenHolder: web3.PublicKey;
  artifact: web3.PublicKey;
}

export interface UncacheArtifactAccounts {
  namespace: web3.PublicKey;
  namespaceToken: web3.PublicKey;
  tokenHolder: web3.PublicKey;
  artifact: web3.PublicKey;
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

  async createNamespaceGatekeeper(accounts: CreateNamespaceGatekeeperAccounts) {
    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(accounts.namespace);

    return [
      await this.program.client.methods
        .createNamespaceGatekeeper()
        .accounts({
          namespace: accounts.namespace,
          namespaceToken: accounts.namespaceToken,
          namespaceGatekeeper: namespaceGatekeeperPDA,
          tokenHolder: accounts.tokenHolder,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .instruction(),
    ];
  }

  async addToNamespaceGatekeeper(
    args: AddToNamespaceGatekeeperArgs,
    accounts: AddToNamespaceGatekeeperAccounts
  ) {
    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(accounts.namespace);

    return [
      await this.program.client.methods
        .addToNamespaceGatekeeper(args)
        .accounts({
          namespace: accounts.namespace,
          namespaceToken: accounts.namespaceToken,
          namespaceGatekeeper: namespaceGatekeeperPDA,
          tokenHolder: accounts.tokenHolder,
        })
        .instruction(),
    ];
  }

  async removeFromNamespaceGatekeeper(
    args: RemoveFromNamespaceGatekeeperArgs,
    accounts: RemoveFromNamespaceGatekeeperAccounts
  ) {
    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(accounts.namespace);

    return [
      await this.program.client.methods
        .removeFromNamespaceGatekeeper(args)
        .accounts({
          namespace: accounts.namespace,
          namespaceToken: accounts.namespaceToken,
          namespaceGatekeeper: namespaceGatekeeperPDA,
          tokenHolder: accounts.tokenHolder,
        })
        .instruction(),
    ];
  }

  async joinNamespace(accounts: JoinNamespaceAccounts) {
    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(accounts.namespace);

    return [
      await this.program.client.methods
        .joinNamespace()
        .accounts({
          namespace: accounts.namespace,
          namespaceToken: accounts.namespaceToken,
          artifact: accounts.artifact,
          namespaceGatekeeper: namespaceGatekeeperPDA,
          tokenHolder: accounts.tokenHolder,
          itemProgram: ITEM_ID,
          instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction(),
    ];
  }

  async leaveNamespace(accounts: LeaveNamespaceAccounts) {
    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(accounts.namespace);

    return [
      await this.program.client.methods
        .leaveNamespace()
        .accounts({
          namespace: accounts.namespace,
          namespaceToken: accounts.namespaceToken,
          artifact: accounts.artifact,
          namespaceGatekeeper: namespaceGatekeeperPDA,
          tokenHolder: accounts.tokenHolder,
          itemProgram: ITEM_ID,
          instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction(),
    ];
  }

  async cacheArtifact(accounts: CacheArtifactAccounts) {

    // get lowest available page
    var page = new BN(0);
    const nsData = await namespaceProgram.account.namespace.fetch(accounts.namespace);
    if (nsData.fullPages.length > 0) {
      const lowestAvailablePage = nsData.fullPages.sort()[0];
      if ( lowestAvailablePage > 0) {
      } else {
        page = lowestAvailablePage
      }
    };

    const [index, _indexBump] = await getIndexPDA(accounts.namespace, page);

    const args = {
      page: page,
    };

    return [
      await this.program.client.methods
        .cacheArtifact(args)
        .accounts({
          namespace: accounts.namespace,
          namespaceToken: accounts.namespaceToken,
          index: index,
          artifact: accounts.artifact,
          tokenHolder: accounts.tokenHolder,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          itemProgram: ITEM_ID,
          instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction(),
    ];
  }

  async uncacheArtifact(accounts: UncacheArtifactAccounts) {
    // TODO: need to fetch artifact data to find correct page to uncache
    const page = new BN(0);
    const [index, _indexBump] = await getIndexPDA(accounts.namespace, page);

    const args = {
      page: page,
    };

    return [
      await this.program.client.methods
        .uncacheArtifact(args)
        .accounts({
          namespace: accounts.namespace,
          namespaceToken: accounts.namespaceToken,
          index: index,
          artifact: accounts.artifact,
          tokenHolder: accounts.tokenHolder,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          itemProgram: ITEM_ID,
          instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction(),
    ];
  }
}
