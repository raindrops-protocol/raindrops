import { web3, BN, AnchorProvider } from "@project-serum/anchor";
import {
  Program,
  Instruction as SolKitInstruction,
} from "@raindrop-studios/sol-kit";
import { Token } from "@solana/spl-token";
import { TOKEN_PROGRAM_ID } from "../constants/programIds";
import {
  AnchorMatchState,
  AnchorTokenDelta,
  AnchorTokenEntryValidation,
  TokenType,
  transformTokenValidations,
} from "../state/matches";
import { createAssociatedTokenAccountInstruction } from "../utils/ata";
import {
  getAtaForMint,
  getItemPDA,
  getMatch,
  getMatchTokenAccountEscrow,
  getOracle,
  getPlayerPDA,
} from "../utils/pda";

export interface CreateMatchArgs {
  matchState: AnchorMatchState;
  tokenEntryValidationRoot: null;
  tokenEntryValidation: null | AnchorTokenEntryValidation[];
  winOracle: web3.PublicKey;
  winOracleCooldown: BN;
  authority: web3.PublicKey;
  space: BN;
  leaveAllowed: boolean;
  joinAllowedDuringStart: boolean;
  minimumAllowedEntryTime: BN | null;
  desiredNamespaceArraySize?: BN;
}

export interface UpdateMatchArgs {
  matchState: AnchorMatchState;
  tokenEntryValidationRoot: null;
  tokenEntryValidation: null;
  winOracleCooldown: BN;
  authority: web3.PublicKey;
  leaveAllowed: boolean;
  joinAllowedDuringStart: boolean;
  minimumAllowedEntryTime: BN | null;
}

export interface JoinMatchArgs {
  amount: BN;
  tokenEntryValidationProof: null;
  tokenEntryValidation: null;
}

export interface LeaveMatchArgs {
  amount: BN;
}

export interface DisburseTokensByOracleArgs {
  tokenDeltaProofInfo: null;
}

export interface CreateMatchAdditionalArgs {
  seed: string;
  finalized: boolean;
  tokenTransferRoot: null;
  tokenTransfers: null | AnchorTokenDelta[];
}

export interface CreateOrUpdateOracleArgs {
  seed: string;
  authority: web3.PublicKey;
  space: BN;
  finalized: boolean;
  tokenTransferRoot: null;
  tokenTransfers: AnchorTokenDelta[] | null;
}

export interface DrainMatchArgs {}

export interface DrainOracleArgs {
  seed: string;
  authority: web3.PublicKey;
}

export interface UpdateMatchFromOracleAccounts {
  winOracle: web3.PublicKey;
}

export interface UpdateMatchAccounts {
  winOracle: web3.PublicKey;
}

export interface DrainMatchAccounts {
  receiver: web3.PublicKey | null;
}

export interface DrainOracleAccounts {
  receiver: web3.PublicKey | null;
}

export interface DisburseTokensByOracleAccounts {
  winOracle: web3.PublicKey;
}

export interface JoinMatchAccounts {
  tokenMint: web3.PublicKey;
  sourceTokenAccount: web3.PublicKey | null;
  tokenTransferAuthority: web3.PublicKey | null;
  validationProgram: web3.PublicKey | null;
}

export interface LeaveMatchAccounts {
  tokenMint: web3.PublicKey;
  receiver: web3.PublicKey;
}

export interface JoinMatchAdditionalArgs {
  sourceType: TokenType;
  index: BN | null;
  winOracle: web3.PublicKey;
}

export interface LeaveMatchAdditionalArgs {
  winOracle: web3.PublicKey;
}

export interface DrainMatchAdditionalArgs {
  winOracle: web3.PublicKey;
}

export interface DisburseTokensByOracleAdditionalArgs {
  tokenDelta: AnchorTokenDelta;
}

export class Instruction extends SolKitInstruction {
  constructor(args: { program: Program.Program }) {
    super(args);
  }
  async createMatch(
    args: CreateMatchArgs,
    _accounts = {},
    _additionalArgs = {}
  ) {
    const [match, _matchBump] = await getMatch(args.winOracle);

    transformTokenValidations(args);
    return {
      instructions: [
        await this.program.client.methods
          .createMatch(args)
          .accounts({
            matchInstance: match,
            payer: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            systemProgram: web3.SystemProgram.programId,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .instruction(),
      ],
      signers: [],
    };
  }

  async disburseTokensByOracle(
    args: DisburseTokensByOracleArgs,
    accounts: DisburseTokensByOracleAccounts,
    additionalArgs: DisburseTokensByOracleAdditionalArgs
  ) {
    const match = (await getMatch(accounts.winOracle))[0];
    const tfer = additionalArgs.tokenDelta;

    const [tokenAccountEscrow, _escrowBump] = await getMatchTokenAccountEscrow(
      accounts.winOracle,
      tfer.mint,
      tfer.from
    );

    let destinationTokenAccount = tfer.to;
    const info = await (
      this.program.client.provider as AnchorProvider
    ).connection.getAccountInfo(destinationTokenAccount);

    const instructions = [];

    if (!info.owner.equals(TOKEN_PROGRAM_ID)) {
      const destinationTokenOwner = destinationTokenAccount;
      destinationTokenAccount = (
        await getAtaForMint(tfer.mint, destinationTokenAccount)
      )[0];

      const exists = await (
        this.program.client.provider as AnchorProvider
      ).connection.getAccountInfo(destinationTokenAccount);

      if (!exists || exists.data.length == 0) {
        instructions.unshift(
          createAssociatedTokenAccountInstruction(
            destinationTokenAccount,
            (this.program.client.provider as AnchorProvider).wallet.publicKey,
            destinationTokenOwner,
            tfer.mint
          )
        );
      }
    }

    instructions.push(
      await this.program.client.methods
        .disburseTokensByOracle(args)
        .accounts({
          matchInstance: match,
          tokenAccountEscrow,
          tokenMint: tfer.mint,
          originalSender: tfer.from,
          destinationTokenAccount,
          winOracle: accounts.winOracle,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .instruction()
    );
    return {
      instructions,
      signers: [],
    };
  }

  async drainMatch(
    _args: DrainMatchArgs,
    accounts: DrainMatchAccounts,
    additionalArgs: DrainMatchAdditionalArgs
  ) {
    const match = (await getMatch(additionalArgs.winOracle))[0];

    return {
      instructions: [
        await this.program.client.methods
          .drainMatch()
          .accounts({
            matchInstance: match,
            authority: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            receiver:
              accounts.receiver ||
              (this.program.client.provider as AnchorProvider).wallet.publicKey,
          })
          .instruction(),
      ],
      signers: [],
    };
  }

  async drainOracle(
    args: DrainOracleArgs,
    accounts: DrainOracleAccounts,
    _additionalArgs = {}
  ) {
    const [oracle, oracleBump] = await getOracle(
      new web3.PublicKey(args.seed),
      new web3.PublicKey(args.authority)
    );

    const [match, _matchBump] = await getMatch(oracle);

    return {
      instructions: [
        await this.program.client.methods
          .drainOracle({ ...args, seed: new web3.PublicKey(args.seed) })
          .accounts({
            matchInstance: match,
            authority: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            receiver:
              accounts.receiver ||
              (this.program.client.provider as AnchorProvider).wallet.publicKey,
            oracle,
          })
          .instruction(),
      ],
      signers: [],
    };
  }

  async updateMatch(
    args: UpdateMatchArgs,
    accounts: UpdateMatchAccounts,
    _additionalArgs = {}
  ) {
    const match = (await getMatch(accounts.winOracle))[0];
    transformTokenValidations(args);

    return {
      instructions: [
        await this.program.client.methods
          .updateMatch(args)
          .accounts({
            matchInstance: match,
            winOracle: accounts.winOracle,
            authority: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
          })
          .instruction(),
      ],
      signers: [],
    };
  }

  async leaveMatch(
    args: LeaveMatchArgs,
    accounts: LeaveMatchAccounts,
    additionalArgs: LeaveMatchAdditionalArgs
  ) {
    const match = (await getMatch(additionalArgs.winOracle))[0];

    //const destinationTokenAccount = (
    //  await getAtaForMint(accounts.tokenMint, accounts.receiver)
    //)[0];

    const [tokenAccountEscrow, _escrowBump] = await getMatchTokenAccountEscrow(
      additionalArgs.winOracle,
      accounts.tokenMint,
      (this.program.client.provider as AnchorProvider).wallet.publicKey
    );

    const signers = [];

    return {
      instructions: [
        await this.program.client.methods
          .leaveMatch(args)
          .accounts({
            matchInstance: match,
            tokenAccountEscrow,
            tokenMint: accounts.tokenMint,
            destinationTokenAccount: accounts.receiver,
            receiver: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction(),
      ],
      signers,
    };
  }

  async joinMatch(
    args: JoinMatchArgs,
    accounts: JoinMatchAccounts,
    additionalArgs: JoinMatchAdditionalArgs
  ) {
    const match = (await getMatch(additionalArgs.winOracle))[0];

    const sourceTokenAccount =
      accounts.sourceTokenAccount ||
      (
        await getAtaForMint(
          accounts.tokenMint,
          (this.program.client.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
    //const transferAuthority =
    //  accounts.tokenTransferAuthority || web3.Keypair.generate();
    const transferAuthority = accounts.tokenTransferAuthority || web3.Keypair.generate().publicKey;

    const [tokenAccountEscrow, _escrowBump] = await getMatchTokenAccountEscrow(
      additionalArgs.winOracle,
      accounts.tokenMint,
      (this.program.client.provider as AnchorProvider).wallet.publicKey
    );

    const signers = [];

    return {
      instructions: [
        //Token.createApproveInstruction(
        //  TOKEN_PROGRAM_ID,
        //  sourceTokenAccount,
        //  transferAuthority,
        //  (this.program.client.provider as AnchorProvider).wallet.publicKey,
        //  [],
        //  args.amount.toNumber()
        //),
        await this.program.client.methods
          .joinMatch(args)
          .accounts({
            matchInstance: match,
            tokenTransferAuthority: (this.program.client.provider as AnchorProvider).wallet.publicKey,
            tokenAccountEscrow,
            tokenMint: accounts.tokenMint,
            sourceTokenAccount,
            sourceItemOrPlayerPda:
              additionalArgs.sourceType == TokenType.Any
                ? web3.SystemProgram.programId
                : additionalArgs.sourceType == TokenType.Item
                ? (
                    await getItemPDA(accounts.tokenMint, additionalArgs.index)
                  )[0]
                : (
                    await getPlayerPDA(accounts.tokenMint, additionalArgs.index)
                  )[0],
            payer: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            systemProgram: web3.SystemProgram.programId,
            validationProgram:
              accounts.validationProgram || web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([])
          .instruction(),
        //Token.createRevokeInstruction(
        //  TOKEN_PROGRAM_ID,
        //  sourceTokenAccount,
        //  (this.program.client.provider as AnchorProvider).wallet.publicKey,
        //  []
        //),
      ],
      signers,
    };
  }

  async updateMatchFromOracle(
    args = {},
    accounts: UpdateMatchFromOracleAccounts,
    _additionalArgs = {}
  ) {
    const match = (await getMatch(accounts.winOracle))[0];

    return {
      instructions: [
        await this.program.client.methods
          .updateMatchFromOracle()
          .accounts({
            matchInstance: match,
            winOracle: accounts.winOracle,
            authority: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
          })
          .instruction(),
      ],
      signers: [],
    };
  }

  async createOrUpdateOracle(
    args: CreateOrUpdateOracleArgs,
    _accounts = {},
    _additionalArgs = {}
  ) {
    const [oracle, _oracleBump] = await getOracle(
      new web3.PublicKey(args.seed),
      args.authority
    );

    const tokenTransfers = args.tokenTransfers
      ? args.tokenTransfers.map((t) => ({
          ...t,
          from: new web3.PublicKey(t.from),
          to: t.to ? new web3.PublicKey(t.to) : null,
          mint: new web3.PublicKey(t.mint),
          amount: new BN(t.amount),
        }))
      : null;

    return {
      instructions: [
        await this.program.client.methods
          .createOrUpdateOracle({
            ...args,
            tokenTransfers,
            seed: new web3.PublicKey(args.seed),
          })
          .accounts({
            oracle,
            payer: (this.program.client.provider as AnchorProvider).wallet
              .publicKey,
            systemProgram: web3.SystemProgram.programId,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .instruction(),
      ],
      signers: [],
    };
  }
}
