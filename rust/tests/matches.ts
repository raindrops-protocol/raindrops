import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as splToken from "../node_modules/@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Utils,
  getMatchesProgram,
  CreateMatchArgs,
  State,
  CreateOrUpdateOracleArgs,
  JoinMatchArgs,
  JoinMatchAccounts,
  JoinMatchAdditionalArgs,
  LeaveMatchArgs,
  LeaveMatchAccounts,
  LeaveMatchAdditionalArgs,
} from "@raindrops-protocol/raindrops";
import assert = require("assert");

describe("matches", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it.only("create match", async () => {
    const payer = await newPayer(connection);

    const matchesProgram = await getMatchesProgram(payer, "localnet", "http://localhost:8899");

    const oracleSeed = anchor.web3.Keypair.generate();

    const createOrUpdateOracleArgs: CreateOrUpdateOracleArgs = {
        seed: oracleSeed.publicKey.toString(),
        authority: payer.publicKey,
        space: new anchor.BN(100),
        finalized: false,
        tokenTransferRoot: null,
        tokenTransfers: null,
    };

    await matchesProgram.createOrUpdateOracle(createOrUpdateOracleArgs);

    const [oracle, _oracleBump] = await Utils.PDA.getOracle(
        oracleSeed.publicKey,
        payer.publicKey,
    );

    const createMatchArgs: CreateMatchArgs = {
        matchState: { draft: true },
        tokenEntryValidation: null,
        tokenEntryValidationRoot: null,
        winOracle: oracle,
        winOracleCooldown: new anchor.BN(100),
        authority: payer.publicKey,
        space: new anchor.BN(2000),
        leaveAllowed: false,
        joinAllowedDuringStart: false,
        minimumAllowedEntryTime: new anchor.BN(1000),
        desiredNamespaceArraySize: new anchor.BN(2),
    }

    await matchesProgram.createMatch(createMatchArgs, {}, undefined)
  });

  it("join a match", async () => {
    const payer = await newPayer(connection);

    const matchesProgram = await getMatchesProgram(payer, "local", "http://localhost:8899");

    const oracleSeed = anchor.web3.Keypair.generate();

    const createOrUpdateOracleArgs: CreateOrUpdateOracleArgs = {
        seed: oracleSeed.publicKey.toString(),
        authority: payer.publicKey,
        space: new anchor.BN(100),
        finalized: false,
        tokenTransferRoot: null,
        tokenTransfers: null,
    };

    await matchesProgram.createOrUpdateOracle(createOrUpdateOracleArgs);

    const [oracle, _oracleBump] = await Utils.PDA.getOracle(
        oracleSeed.publicKey,
        payer.publicKey,
    );

    const createMatchArgs: CreateMatchArgs = {
        matchState: { draft: true },
        tokenEntryValidation: null,
        tokenEntryValidationRoot: null,
        winOracle: oracle,
        winOracleCooldown: new anchor.BN(100),
        authority: payer.publicKey,
        space: new anchor.BN(2000),
        leaveAllowed: false,
        joinAllowedDuringStart: false,
        minimumAllowedEntryTime: new anchor.BN(1000),
        desiredNamespaceArraySize: new anchor.BN(2),
    }

    await matchesProgram.createMatch(createMatchArgs, {}, undefined)

    // create mint and mint initial tokens to payer for testing
    const joinMatchMint = await splToken.createMint(connection, payer, payer.publicKey, payer.publicKey, 6);
    const payerJoinMatchMintAta = await splToken.getOrCreateAssociatedTokenAccount(connection, payer, joinMatchMint, payer.publicKey);
    await splToken.mintTo(connection, payer, joinMatchMint, payerJoinMatchMintAta.address, payer.publicKey, 1_000_000_000);

    const joinMatchArgs: JoinMatchArgs = {
        amount: new anchor.BN(1_000_000),
        tokenEntryValidationProof: null,
        tokenEntryValidation: null,
    };

    const joinMatchAccounts: JoinMatchAccounts = {
        tokenMint: joinMatchMint,
        sourceTokenAccount: payerJoinMatchMintAta.address,
        tokenTransferAuthority: payer,
        validationProgram: null,
    };

    const joinMatchAdditionalArgs: JoinMatchAdditionalArgs = {
        sourceType: State.Matches.TokenType.Any,
        index: null,
        winOracle: oracle,
    };

    await matchesProgram.joinMatch(joinMatchArgs, joinMatchAccounts, joinMatchAdditionalArgs);

    // now leave the match
    const leaveMatchArgs: LeaveMatchArgs = {
        amount: new anchor.BN(1_000_000),
    };

    const leaveMatchAccounts: LeaveMatchAccounts = {
        tokenMint: joinMatchMint,
        receiver: payerJoinMatchMintAta.address,
    };

    const leaveMatchAdditionalArgs: LeaveMatchAdditionalArgs = {
        winOracle: oracle
    };

    await matchesProgram.leaveMatch(leaveMatchArgs, leaveMatchAccounts, leaveMatchAdditionalArgs);
  });
});

async function newPayer(
  connection: anchor.web3.Connection
): Promise<anchor.web3.Keypair> {
  const payer = anchor.web3.Keypair.generate();

  const txSig = await connection.requestAirdrop(
    payer.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(txSig);

  return payer;
}

async function confirmTransactions(
  txSigs: string[],
  connection: anchor.web3.Connection
) {
  for (let txSig of txSigs) {
    connection.confirmTransaction(txSig, "finalized");
  }
}
