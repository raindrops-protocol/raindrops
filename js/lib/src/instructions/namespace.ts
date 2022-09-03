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
import { TOKEN_PROGRAM_ID } from "../constants/programIds";
import {
  ArtifactFilter,
  PermissivenessSettings,
  convertTokenType,
  convertPermissiveness,
  RaindropsProgram,
} from "../state/namespace";
import * as splToken from "@solana/spl-token";

export interface InitializeNamespaceAccounts {
  mint: web3.PublicKey;
  metadata: web3.PublicKey;
  masterEdition: web3.PublicKey;
  paymentMint?: web3.PublicKey;
  paymentVault?: web3.PublicKey;
}

export interface InitializeNamespaceArgs {
  desiredNamespaceArraySize: BN;
  uuid: string;
  prettyName: string;
  permissivenessSettings: PermissivenessSettings;
  whitelistedStakingMints: web3.PublicKey[];
  paymentAmount?: BN;
}

export interface UpdateNamespaceArgs {
  prettyName: string | null;
  permissivenessSettings: PermissivenessSettings | null;
  whitelistedStakingMints: web3.PublicKey[];
}

export interface UpdateNamespaceAccounts {
  namespaceMint: web3.PublicKey;
}

export interface CreateNamespaceGatekeeperAccounts {
  namespaceMint: web3.PublicKey;
}

export interface AddToNamespaceGatekeeperArgs {
  artifactFilter: ArtifactFilter;
}

export interface AddToNamespaceGatekeeperAccounts {
  namespaceMint: web3.PublicKey;
}

export interface RemoveFromNamespaceGatekeeperArgs {
  artifactFilter: ArtifactFilter;
}

export interface RemoveFromNamespaceGatekeeperAccounts {
  namespaceMint: web3.PublicKey;
}

export interface JoinNamespaceAccounts {
  namespaceMint: web3.PublicKey;
  artifact: web3.PublicKey;
  raindropsProgram: RaindropsProgram;
}

export interface LeaveNamespaceAccounts {
  namespaceMint: web3.PublicKey;
  artifact: web3.PublicKey;
  raindropsProgram: RaindropsProgram;
}

export interface CacheArtifactAccounts {
  namespaceMint: web3.PublicKey;
  artifact: web3.PublicKey;
  raindropsProgram: RaindropsProgram;
}

export interface UncacheArtifactArgs {
  page: BN;
}

export interface UncacheArtifactAccounts {
  namespaceMint: web3.PublicKey;
  artifact: web3.PublicKey;
  raindropsProgram: RaindropsProgram;
}

export class Instruction extends SolKitInstruction {
  constructor(args: { program: Program.Program }) {
    super(args);
  }

  async initializeNamespace(
    args: InitializeNamespaceArgs,
    accounts: InitializeNamespaceAccounts
  ): Promise<[[web3.TransactionInstruction], web3.PublicKey]> {
    const [namespacePDA, _namespaceBump] = await getNamespacePDA(accounts.mint);

    let remainingAccounts: web3.AccountMeta[] = [];

    // add optional payment accounts first
    if (args.paymentAmount) {
      const paymentMint = { pubkey: accounts.paymentMint!, isWritable: false, isSigner: false };
      const paymentVault = { pubkey: accounts.paymentVault!, isWritable: false, isSigner: false };
      remainingAccounts.push(paymentMint, paymentVault);
    } else {
      args.paymentAmount = null;
    }

    // then add optional staking mints
    args.whitelistedStakingMints.map((mint) => {
      remainingAccounts.push({ pubkey: mint, isWritable: false, isSigner: false });
    });

    let ix: web3.TransactionInstruction;

    let permissivenessSettings = {
      namespacePermissiveness: convertPermissiveness(
        args.permissivenessSettings.namespacePermissiveness
      ),
      itemPermissiveness: convertPermissiveness(
        args.permissivenessSettings.itemPermissiveness
      ),
      playerPermissiveness: convertPermissiveness(
        args.permissivenessSettings.playerPermissiveness
      ),
      matchPermissiveness: convertPermissiveness(
        args.permissivenessSettings.matchPermissiveness
      ),
      missionPermissiveness: convertPermissiveness(
        args.permissivenessSettings.missionPermissiveness
      ),
      cachePermissiveness: convertPermissiveness(
        args.permissivenessSettings.cachePermissiveness
      ),
    };

    let formattedArgs = {
      desiredNamespaceArraySize: args.desiredNamespaceArraySize,
      uuid: args.uuid,
      prettyName: args.prettyName,
      permissivenessSettings: permissivenessSettings,
      whitelistedStakingMints: args.whitelistedStakingMints,
      paymentAmount: args.paymentAmount,
    };

    if (remainingAccounts.length > 0) {
      ix = await this.program.client.methods
        .initializeNamespace(formattedArgs)
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
        .instruction();
    } else {
      ix = await this.program.client.methods
        .initializeNamespace(formattedArgs)
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
        .instruction();
    }
      

    return [[ix], namespacePDA];
  }

  async updateNamespace(
    args: UpdateNamespaceArgs,
    accounts: UpdateNamespaceAccounts
  ) {
    const [namespacePDA, _namespaceBump] = await getNamespacePDA(
      accounts.namespaceMint
    );

    const payer = (this.program.client.provider as AnchorProvider).wallet
      .publicKey;

    const nsTA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      accounts.namespaceMint,
      payer
    );

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
          namespaceToken: nsTA,
          tokenHolder: payer,
        })
        .remainingAccounts(remainingAccounts)
        .instruction(),
    ];
  }

  async createNamespaceGatekeeper(
    accounts: CreateNamespaceGatekeeperAccounts
  ): Promise<[[web3.TransactionInstruction], web3.PublicKey]> {
    const [namespacePDA, _namespacePDABump] = await getNamespacePDA(
      accounts.namespaceMint
    );

    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(namespacePDA);

    const payer = (this.program.client.provider as AnchorProvider).wallet
      .publicKey;

    const nsTA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      accounts.namespaceMint,
      payer
    );

    const ix = await this.program.client.methods
      .createNamespaceGatekeeper()
      .accounts({
        namespace: namespacePDA,
        namespaceToken: nsTA,
        namespaceGatekeeper: namespaceGatekeeperPDA,
        tokenHolder: payer,
        payer: payer,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    return [[ix], namespaceGatekeeperPDA];
  }

  async addToNamespaceGatekeeper(
    args: AddToNamespaceGatekeeperArgs,
    accounts: AddToNamespaceGatekeeperAccounts
  ) {
    const [namespacePDA, _namespacePDABump] = await getNamespacePDA(
      accounts.namespaceMint
    );

    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(namespacePDA);

    const payer = (this.program.client.provider as AnchorProvider).wallet
      .publicKey;

    const nsTA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      accounts.namespaceMint,
      payer
    );

    const itemArtifactFilter = {
      filter: args.artifactFilter.filter.filter,
      tokenType: convertTokenType(args.artifactFilter.tokenType),
    };

    return [
      await this.program.client.methods
        .addToNamespaceGatekeeper(itemArtifactFilter)
        .accounts({
          namespace: namespacePDA,
          namespaceToken: nsTA,
          namespaceGatekeeper: namespaceGatekeeperPDA,
          tokenHolder: payer,
        })
        .instruction(),
    ];
  }

  async removeFromNamespaceGatekeeper(
    args: RemoveFromNamespaceGatekeeperArgs,
    accounts: RemoveFromNamespaceGatekeeperAccounts
  ) {
    const [namespacePDA, _namespacePDABump] = await getNamespacePDA(
      accounts.namespaceMint
    );

    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(namespacePDA);

    const payer = (this.program.client.provider as AnchorProvider).wallet
      .publicKey;

    const nsTA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      accounts.namespaceMint,
      payer
    );

    const itemArtifactFilter = {
      filter: args.artifactFilter.filter.filter,
      tokenType: convertTokenType(args.artifactFilter.tokenType),
    };

    return [
      await this.program.client.methods
        .removeFromNamespaceGatekeeper(itemArtifactFilter)
        .accounts({
          namespace: namespacePDA,
          namespaceToken: nsTA,
          namespaceGatekeeper: namespaceGatekeeperPDA,
          tokenHolder: payer,
        })
        .instruction(),
    ];
  }

  async joinNamespace(accounts: JoinNamespaceAccounts) {
    const [namespacePDA, _namespacePDABump] = await getNamespacePDA(
      accounts.namespaceMint
    );

    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(namespacePDA);

    const payer = (this.program.client.provider as AnchorProvider).wallet
      .publicKey;

    const nsTA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      accounts.namespaceMint,
      payer
    );

    return [
      await this.program.client.methods
        .joinNamespace()
        .accounts({
          namespace: namespacePDA,
          namespaceToken: nsTA,
          artifact: accounts.artifact,
          namespaceGatekeeper: namespaceGatekeeperPDA,
          tokenHolder: payer,
          raindropsProgram: RaindropsProgram.getRaindropsProgram(
            accounts.raindropsProgram
          ),
          instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction(),
    ];
  }

  async leaveNamespace(accounts: LeaveNamespaceAccounts) {
    const [namespacePDA, _namespacePDABump] = await getNamespacePDA(
      accounts.namespaceMint
    );

    const [namespaceGatekeeperPDA, _namespaceGatekeeperBump] =
      await getNamespaceGatekeeperPDA(namespacePDA);

    const payer = (this.program.client.provider as AnchorProvider).wallet
      .publicKey;

    const nsTA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      accounts.namespaceMint,
      payer
    );

    return [
      await this.program.client.methods
        .leaveNamespace()
        .accounts({
          namespace: namespacePDA,
          namespaceToken: nsTA,
          artifact: accounts.artifact,
          namespaceGatekeeper: namespaceGatekeeperPDA,
          tokenHolder: payer,
          raindropsProgram: RaindropsProgram.getRaindropsProgram(
            accounts.raindropsProgram
          ),
          instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction(),
    ];
  }

  async cacheArtifact(accounts: CacheArtifactAccounts) {
    const [namespacePDA, _namespacePDABump] = await getNamespacePDA(
      accounts.namespaceMint
    );

    const payer = (this.program.client.provider as AnchorProvider).wallet
      .publicKey;

    const nsTA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      accounts.namespaceMint,
      payer
    );

    // get lowest available page
    let page = new BN(0);
    const nsData = await this.program.client.account.namespace.fetch(
      namespacePDA
    );

    // sort ascending
    const fullPages: BN[] = nsData.fullPages as BN[];
    const sortedFullPages = fullPages.sort();
    // increment 1 higher than the last full page
    if (sortedFullPages.length > 0) {
      page = sortedFullPages[sortedFullPages.length - 1].add(new BN(1));
    }

    const [index, _indexBump] = await getIndexPDA(namespacePDA, page);

    const args = {
      page: page,
    };

    return [
      await this.program.client.methods
        .cacheArtifact(args)
        .accounts({
          namespace: namespacePDA,
          namespaceToken: nsTA,
          index: index,
          artifact: accounts.artifact,
          tokenHolder: payer,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          raindropsProgram: RaindropsProgram.getRaindropsProgram(
            accounts.raindropsProgram
          ),
          instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction(),
    ];
  }

  async uncacheArtifact(
    args: UncacheArtifactArgs,
    accounts: UncacheArtifactAccounts
  ) {
    const [namespacePDA, _namespacePDABump] = await getNamespacePDA(
      accounts.namespaceMint
    );

    const payer = (this.program.client.provider as AnchorProvider).wallet
      .publicKey;

    const nsTA = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      accounts.namespaceMint,
      payer
    );

    const [index, _indexBump] = await getIndexPDA(namespacePDA, args.page);

    return [
      await this.program.client.methods
        .uncacheArtifact(args)
        .accounts({
          namespace: namespacePDA,
          namespaceToken: nsTA,
          index: index,
          artifact: accounts.artifact,
          tokenHolder: payer,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          raindropsProgram: RaindropsProgram.getRaindropsProgram(
            accounts.raindropsProgram
          ),
          instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction(),
    ];
  }
}
