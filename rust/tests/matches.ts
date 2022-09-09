import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as splToken from "../node_modules/@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Utils,
  State,
  MatchesProgram,
  Idls,
  Instructions,
} from "@raindrops-protocol/raindrops";
import assert = require("assert");

describe("matches", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it.only("create match", async () => {
    const payer = await newPayer(connection);
    const matchesProgram = await MatchesProgram.getProgramWithConfig(
      MatchesProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.MatchesIDL,
      }
    );

    const oracleSeed = anchor.web3.Keypair.generate();

    const createOracleArgs: Instructions.Matches.CreateOrUpdateOracleArgs = {
      seed: oracleSeed.publicKey.toString(),
      authority: payer.publicKey,
      space: new anchor.BN(100),
      finalized: false,
      tokenTransferRoot: null,
      tokenTransfers: null,
    };

    const createOracleResult = await matchesProgram.createOrUpdateOracle(
      createOracleArgs
    );
    console.log("createOracleTxSig: %s", createOracleResult.txid);

    const [oracle, _oracleBump] = await Utils.PDA.getOracle(
      oracleSeed.publicKey,
      payer.publicKey
    );

    const createMatchArgs: Instructions.Matches.CreateMatchArgs = {
      matchState: { initialized: true },
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
    };

    const createMatchResult = await matchesProgram.createMatch(createMatchArgs);
    console.log("createMatchTxSig: %s", createMatchResult.txid);

    // create mint and mint initial tokens to payer for testing
    const joinMatchMint = await splToken.createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      6
    );
    const payerJoinMatchMintAta =
      await splToken.getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        joinMatchMint,
        payer.publicKey
      );
    await splToken.mintTo(
      connection,
      payer,
      joinMatchMint,
      payerJoinMatchMintAta.address,
      payer,
      1_000_000_000
    );

    const joinMatchArgs: Instructions.Matches.JoinMatchArgs = {
      amount: new anchor.BN(1_000_000),
      tokenEntryValidationProof: null,
      tokenEntryValidation: null,
    };

    const joinMatchAccounts: Instructions.Matches.JoinMatchAccounts = {
      tokenMint: joinMatchMint,
      sourceTokenAccount: null,
      tokenTransferAuthority: null,
      validationProgram: null,
    };

    const joinMatchAdditionalArgs: Instructions.Matches.JoinMatchAdditionalArgs =
      {
        sourceType: State.Matches.TokenType.Any,
        index: null,
        winOracle: oracle,
      };

    const joinMatchResult = await matchesProgram.joinMatch(
      joinMatchArgs,
      joinMatchAccounts,
      joinMatchAdditionalArgs
    );
    console.log("joinMatchTxSig: %s", joinMatchResult.txid);

    const updateOracleArgs: Instructions.Matches.CreateOrUpdateOracleArgs = {
      seed: oracleSeed.publicKey.toString(),
      authority: payer.publicKey,
      space: new anchor.BN(100),
      finalized: true,
      tokenTransferRoot: null,
      tokenTransfers: null,
    };

    const updateOracleResult = await matchesProgram.createOrUpdateOracle(
      updateOracleArgs
    );
    console.log("updateOracleResult: %s", updateOracleResult.txid);

    const winOracleData = await matchesProgram.fetchWinOracle(oracle);
    assert.equal(winOracleData.finalized, true);

    const updateMatchFromOracleAccounts: Instructions.Matches.UpdateMatchFromOracleAccounts =
      {
        winOracle: oracle,
      };

    const updateMatchFromOracleResult =
      await matchesProgram.updateMatchFromOracle(updateMatchFromOracleAccounts);
    console.log(
      "updateMatchFromOracleTxSig: %s",
      updateMatchFromOracleResult.txid
    );

    const disburseTokensByOracleArgs: Instructions.Matches.DisburseTokensByOracleArgs =
      {
        tokenDeltaProofInfo: null,
      };

    const disburseTokensByOracleAccounts: Instructions.Matches.DisburseTokensByOracleAccounts =
      {
        winOracle: oracle,
      };

    const disburseTokensByOracleAdditionalArgs: Instructions.Matches.DisburseTokensByOracleAdditionalArgs =
      {
        tokenDelta: {
          from: payer.publicKey,
          to: payerJoinMatchMintAta.address,
          tokenTransferType: { normal: true },
          mint: joinMatchMint,
          amount: new anchor.BN(1_000_000),
        },
      };

    const disburseTokensByOracleResult =
      await matchesProgram.disburseTokensByOracle(
        disburseTokensByOracleArgs,
        disburseTokensByOracleAccounts,
        disburseTokensByOracleAdditionalArgs
      );
    console.log(
      "disburseTokensByOracleTxSig: %s",
      disburseTokensByOracleResult.txid
    );

    const drainMatchAccounts: Instructions.Matches.DrainMatchAccounts = {
      receiver: payerJoinMatchMintAta.address,
    };

    const drainMatchAdditionalArgs: Instructions.Matches.DrainMatchAdditionalArgs =
      {
        winOracle: oracle,
      };

    const drainMatchResult = await matchesProgram.drainMatch(
      drainMatchAccounts,
      drainMatchAdditionalArgs
    );
    console.log("drainMatchTxSig: %s", drainMatchResult.txid);

    const leaveMatchArgs: Instructions.Matches.LeaveMatchArgs = {
      amount: new anchor.BN(1_000_000),
    };

    const leaveMatchAccounts: Instructions.Matches.LeaveMatchAccounts = {
      tokenMint: joinMatchMint,
      receiver: payerJoinMatchMintAta.address,
    };

    const leaveMatchAdditionalArgs: Instructions.Matches.LeaveMatchAdditionalArgs =
      {
        winOracle: oracle,
      };

    const leaveMatchResult = await matchesProgram.leaveMatch(
      leaveMatchArgs,
      leaveMatchAccounts,
      leaveMatchAdditionalArgs
    );
    console.log("leaveMatchTxSig: %s", leaveMatchResult.txid);
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
