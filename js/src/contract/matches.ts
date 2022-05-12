import {
  web3,
  Program,
  BN,
  Provider,
  AnchorProvider,
} from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";

import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { MATCHES_ID, TOKEN_PROGRAM_ID } from "../constants/programIds";
import {
  getAtaForMint,
  getItemPDA,
  getMatch,
  getMatchTokenAccountEscrow,
  getOracle,
  getPlayerPDA,
} from "../utils/pda";
import { ObjectWrapper } from "./common";
import log from "loglevel";
import { getCluster } from "../utils/connection";
import { sendTransactionWithRetry } from "../utils/transactions";
import {
  AnchorMatchState,
  AnchorTokenDelta,
  AnchorTokenEntryValidation,
  TokenType,
} from "../state/matches";
import { Token } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "../utils/ata";

export function transformTokenValidations(args: {
  tokenEntryValidation: AnchorTokenEntryValidation[] | null;
}) {
  if (args.tokenEntryValidation) {
    args.tokenEntryValidation = args.tokenEntryValidation.map((r) => {
      const newRFilter = { ...r.filter };
      Object.keys(newRFilter).forEach((k) => {
        Object.keys(newRFilter[k]).forEach((y) => {
          if (typeof newRFilter[k][y] === "string") {
            newRFilter[k][y] = new web3.PublicKey(newRFilter[k][y]);
          }
        });
      });

      r.filter = newRFilter;

      if (r.validation) {
        if (typeof r.validation.key === "string") {
          r.validation.key = new web3.PublicKey(r.validation.key);
          r.validation.code = new BN(r.validation.code);
        }
      }
      return r;
    });
  }
}
export class MatchWrapper implements ObjectWrapper<any, MatchesProgram> {
  program: MatchesProgram;
  key: web3.PublicKey;
  object: any;
  data: Buffer;

  constructor(args: {
    program: MatchesProgram;
    key: web3.PublicKey;
    object: any;
    data: Buffer;
  }) {
    this.program = args.program;
    this.key = args.key;
    this.object = args.object;
    this.data = args.data;
  }
}

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
  tokenTransfers: null | AnchorTokenDelta[];
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
  tokenTransferAuthority: web3.Keypair | null;
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

export class MatchesInstruction {
  id: web3.PublicKey;
  program: Program;

  constructor(args: { id: web3.PublicKey; program: Program }) {
    this.id = args.id;
    this.program = args.program;
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
        await this.program.methods
          .createMatch(args)
          .accounts({
            matchInstance: match,
            payer: (this.program.provider as AnchorProvider).wallet.publicKey,
            systemProgram: SystemProgram.programId,
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
      this.program.provider as AnchorProvider
    ).connection.getAccountInfo(destinationTokenAccount);

    const instructions = [];

    if (!info.owner.equals(TOKEN_PROGRAM_ID)) {
      const destinationTokenOwner = destinationTokenAccount;
      destinationTokenAccount = (
        await getAtaForMint(tfer.mint, destinationTokenAccount)
      )[0];

      const exists = await (
        this.program.provider as AnchorProvider
      ).connection.getAccountInfo(destinationTokenAccount);

      if (!exists || exists.data.length == 0) {
        instructions.unshift(
          createAssociatedTokenAccountInstruction(
            destinationTokenAccount,
            (this.program.provider as AnchorProvider).wallet.publicKey,
            destinationTokenOwner,
            tfer.mint
          )
        );
      }
    }

    instructions.push(
      await this.program.methods
        .disburseTokensByOracle(args)
        .accounts({
          matchInstance: match,
          tokenAccountEscrow,
          tokenMint: tfer.mint,
          originalSender: tfer.from,
          destinationTokenAccount,
          winOracle: accounts.winOracle,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
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
        await this.program.methods
          .drainMatch()
          .accounts({
            matchInstance: match,
            authority: (this.program.provider as AnchorProvider).wallet
              .publicKey,
            receiver:
              accounts.receiver ||
              (this.program.provider as AnchorProvider).wallet.publicKey,
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
        await this.program.methods
          .drainOracle({ ...args, seed: new web3.PublicKey(args.seed) })
          .accounts({
            matchInstance: match,
            authority: (this.program.provider as AnchorProvider).wallet
              .publicKey,
            receiver:
              accounts.receiver ||
              (this.program.provider as AnchorProvider).wallet.publicKey,
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
        await this.program.methods
          .updateMatch(args)
          .accounts({
            matchInstance: match,
            winOracle: accounts.winOracle,
            authority: (this.program.provider as AnchorProvider).wallet
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

    const destinationTokenAccount = (
      await getAtaForMint(accounts.tokenMint, accounts.receiver)
    )[0];

    const [tokenAccountEscrow, _escrowBump] = await getMatchTokenAccountEscrow(
      additionalArgs.winOracle,
      accounts.tokenMint,
      (this.program.provider as AnchorProvider).wallet.publicKey
    );

    const signers = [];

    return {
      instructions: [
        await this.program.methods
          .leaveMatch(args)
          .accounts({
            matchInstance: match,
            tokenAccountEscrow,
            tokenMint: accounts.tokenMint,
            destinationTokenAccount,
            receiver: (this.program.provider as AnchorProvider).wallet
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
          (this.program.provider as AnchorProvider).wallet.publicKey
        )
      )[0];
    const transferAuthority =
      accounts.tokenTransferAuthority || web3.Keypair.generate();

    const [tokenAccountEscrow, _escrowBump] = await getMatchTokenAccountEscrow(
      additionalArgs.winOracle,
      accounts.tokenMint,
      (this.program.provider as AnchorProvider).wallet.publicKey
    );

    const signers = [transferAuthority];

    return {
      instructions: [
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          sourceTokenAccount,
          transferAuthority.publicKey,
          (this.program.provider as AnchorProvider).wallet.publicKey,
          [],
          args.amount.toNumber()
        ),
        await this.program.methods
          .joinMatch(args)
          .accounts({
            matchInstance: match,
            tokenTransferAuthority: transferAuthority.publicKey,
            tokenAccountEscrow,
            tokenMint: accounts.tokenMint,
            sourceTokenAccount,
            sourceItemOrPlayerPda:
              additionalArgs.sourceType == TokenType.Any
                ? SystemProgram.programId
                : additionalArgs.sourceType == TokenType.Item
                ? (
                    await getItemPDA(accounts.tokenMint, additionalArgs.index)
                  )[0]
                : (
                    await getPlayerPDA(accounts.tokenMint, additionalArgs.index)
                  )[0],
            payer: (this.program.provider as AnchorProvider).wallet.publicKey,
            systemProgram: SystemProgram.programId,
            validationProgram:
              accounts.validationProgram || SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .signers(signers)
          .instruction(),
        Token.createRevokeInstruction(
          TOKEN_PROGRAM_ID,
          sourceTokenAccount,
          (this.program.provider as AnchorProvider).wallet.publicKey,
          []
        ),
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
        await this.program.methods
          .updateMatchFromOracle()
          .accounts({
            matchInstance: match,
            winOracle: accounts.winOracle,
            authority: (this.program.provider as AnchorProvider).wallet
              .publicKey,
            clock: web3.SYSVAR_CLOCK_PUBKEY,
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
        await this.program.methods
          .createOrUpdateOracle({
            ...args,
            tokenTransfers,
            seed: new web3.PublicKey(args.seed),
          })
          .accounts({
            oracle,
            payer: (this.program.provider as AnchorProvider).wallet.publicKey,
            systemProgram: SystemProgram.programId,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .instruction(),
      ],
      signers: [],
    };
  }
}

export class MatchesProgram {
  id: web3.PublicKey;
  program: Program;
  instruction: MatchesInstruction;

  constructor(args: { id: web3.PublicKey; program: Program }) {
    this.id = args.id;
    this.program = args.program;
    this.instruction = new MatchesInstruction({
      id: this.id,
      program: this.program,
    });
  }

  async fetchMatch(oracle: web3.PublicKey): Promise<MatchWrapper> {
    const matchPda = (await getMatch(oracle))[0];

    const match = await this.program.account.match.fetch(matchPda);

    return new MatchWrapper({
      program: this,
      key: matchPda,
      data: match.data as Buffer,
      object: match,
    });
  }

  async fetchOracle(oracle: web3.PublicKey): Promise<MatchWrapper> {
    const oracleAcct = await (
      this.program.provider as AnchorProvider
    ).connection.getAccountInfo(oracle);

    const oracleInstance =
      await this.program.account.winOracle.coder.accounts.decode(
        "WinOracle",
        oracleAcct.data
      );

    return new MatchWrapper({
      program: this,
      key: oracle,
      data: oracleAcct.data,
      object: oracleInstance,
    });
  }

  async createMatch(
    args: CreateMatchArgs,
    _accounts = {},
    additionalArgs: CreateMatchAdditionalArgs
  ) {
    const { instructions, signers } = await this.instruction.createMatch(args);

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async disburseTokensByOracle(
    args: DisburseTokensByOracleArgs,
    accounts: DisburseTokensByOracleAccounts,
    additionalArgs: DisburseTokensByOracleAdditionalArgs
  ) {
    const { instructions, signers } =
      await this.instruction.disburseTokensByOracle(
        args,
        accounts,
        additionalArgs
      );

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async drainMatch(
    args: DrainMatchArgs,
    accounts: DrainMatchAccounts,
    additionalArgs: DrainMatchAdditionalArgs
  ) {
    const { instructions, signers } = await this.instruction.drainMatch(
      args,
      accounts,
      additionalArgs
    );

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async drainOracle(
    args: DrainOracleArgs,
    accounts: DrainOracleAccounts,
    _additionalArgs = {}
  ) {
    const { instructions, signers } = await this.instruction.drainOracle(
      args,
      accounts
    );

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async joinMatch(
    args: JoinMatchArgs,
    accounts: JoinMatchAccounts,
    additionalArgs: JoinMatchAdditionalArgs
  ) {
    const { instructions, signers } = await this.instruction.joinMatch(
      args,
      accounts,
      additionalArgs
    );

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async leaveMatch(
    args: LeaveMatchArgs,
    accounts: LeaveMatchAccounts,
    additionalArgs: LeaveMatchAdditionalArgs
  ) {
    const { instructions, signers } = await this.instruction.leaveMatch(
      args,
      accounts,
      additionalArgs
    );

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async updateMatch(
    args: UpdateMatchArgs,
    accounts: UpdateMatchAccounts,
    _additionalArgs = {}
  ) {
    const { instructions, signers } = await this.instruction.updateMatch(
      args,
      accounts
    );

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async updateMatchFromOracle(
    args = {},
    accounts: UpdateMatchFromOracleAccounts,
    _additionalArgs = {}
  ) {
    const { instructions, signers } =
      await this.instruction.updateMatchFromOracle(args, accounts);

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }

  async createOrUpdateOracle(
    args: CreateOrUpdateOracleArgs,
    _accounts = {},
    _additionalArgs = {}
  ) {
    const { instructions, signers } =
      await this.instruction.createOrUpdateOracle(args);

    await sendTransactionWithRetry(
      (this.program.provider as AnchorProvider).connection,
      (this.program.provider as AnchorProvider).wallet,
      instructions,
      signers
    );
  }
}

export async function getMatchesProgram(
  anchorWallet: NodeWallet | web3.Keypair,
  env: string,
  customRpcUrl: string
): Promise<MatchesProgram> {
  if (customRpcUrl) log.debug("USING CUSTOM URL", customRpcUrl);

  const solConnection = new web3.Connection(customRpcUrl || getCluster(env));

  if (anchorWallet instanceof web3.Keypair)
    anchorWallet = new NodeWallet(anchorWallet);

  const provider = new AnchorProvider(solConnection, anchorWallet, {
    preflightCommitment: "recent",
  });

  const idl = await Program.fetchIdl(MATCHES_ID, provider);

  const program = new Program(idl, MATCHES_ID, provider);

  return new MatchesProgram({
    id: MATCHES_ID,
    program,
  });
}
