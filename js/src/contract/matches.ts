import { web3, Program, BN, Provider } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";

import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { MATCHES_ID, TOKEN_PROGRAM_ID } from "../constants/programIds";
import { getMatch, getOracle } from "../utils/pda";
import { ObjectWrapper } from "./common";
import log from "loglevel";
import { getCluster } from "../utils/connection";
import { sendTransactionWithRetry } from "../utils/transactions";
import { AnchorMatchState, AnchorTokenDelta } from "../state/matches";

function convertNumsToBNs(data: any) {}
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
  matchBump: number | null;
  matchState: AnchorMatchState;
  tokenEntryValidationRoot: null;
  tokenEntryValidation: null;
  winOracle: web3.PublicKey;
  winOracleCooldown: BN;
  authority: web3.PublicKey;
  space: BN;
  leaveAllowed: boolean;
  minimumAllowedEntryTime: BN | null;
}

export interface CreateMatchAdditionalArgs {
  seed: string;
  finalized: boolean;
  tokenTransferRoot: null;
  tokenTransfers: null | AnchorTokenDelta[];
}

export interface CreateOrUpdateOracleArgs {
  oracleBump: number | null;
  seed: string;
  space: BN;
  finalized: boolean;
  tokenTransferRoot: null;
  tokenTransfers: null | AnchorTokenDelta[];
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
    const [match, matchBump] = await getMatch(args.winOracle);

    args.matchBump = matchBump;
    return [
      this.program.instruction.createMatch(args, {
        accounts: {
          matchInstance: match,
          payer: this.program.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        },
      }),
    ];
  }

  async createOrUpdateOracle(
    args: CreateOrUpdateOracleArgs,
    _accounts = {},
    _additionalArgs = {}
  ) {
    const [oracle, oracleBump] = await getOracle(
      new web3.PublicKey(args.seed),
      this.program.provider.wallet.publicKey
    );

    const tokenTransfers = args.tokenTransfers
      ? args.tokenTransfers.map((t) => ({
          ...t,
          from: new web3.PublicKey(t.from),
          to: t.to ? new web3.PublicKey(t.to) : null,
          mint: new web3.PublicKey(t.mint),
        }))
      : null;

    args.oracleBump = oracleBump;
    return [
      this.program.instruction.createOrUpdateOracle(
        { ...args, tokenTransfers, seed: new web3.PublicKey(args.seed) },
        {
          accounts: {
            oracle,
            payer: this.program.provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
            rent: web3.SYSVAR_RENT_PUBKEY,
          },
        }
      ),
    ];
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
      data: match.data,
      object: match,
    });
  }

  async fetchOracle(oracle: web3.PublicKey): Promise<MatchWrapper> {
    const oracleAcct = await this.program.provider.connection.getAccountInfo(
      oracle
    );

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
    const instructions = await this.instruction.createMatch(args);

    if (!args.winOracle) {
    }

    await sendTransactionWithRetry(
      this.program.provider.connection,
      this.program.provider.wallet,
      instructions,
      []
    );
  }

  async createOrUpdateOracle(
    args: CreateOrUpdateOracleArgs,
    _accounts = {},
    _additionalArgs = {}
  ) {
    const instructions = await this.instruction.createOrUpdateOracle(args);

    await sendTransactionWithRetry(
      this.program.provider.connection,
      this.program.provider.wallet,
      instructions,
      []
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

  const provider = new Provider(solConnection, anchorWallet, {
    preflightCommitment: "recent",
  });

  const idl = await Program.fetchIdl(MATCHES_ID, provider);

  const program = new Program(idl, MATCHES_ID, provider);

  return new MatchesProgram({
    id: MATCHES_ID,
    program,
  });
}
