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

  it("create match and drain it", async () => {
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

    // create mint and mint initial tokens to payer for testing
    const matchMint = await splToken.createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      6
    );
    let payerMatchMintAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      matchMint,
      payer.publicKey
    );
    await splToken.mintTo(
      connection,
      payer,
      matchMint,
      payerMatchMintAta.address,
      payer,
      1_000_000_000
    );

    // create win oracle and transfer tokens from payer to escrow
    const oracleSeed = anchor.web3.Keypair.generate();

    const createOracleArgs: Instructions.Matches.CreateOrUpdateOracleArgs = {
      seed: oracleSeed.publicKey.toString(),
      authority: payer.publicKey,
      space: new anchor.BN(1000),
      finalized: false,
      tokenTransferRoot: null,
      tokenTransfers: [
        {
          from: payer.publicKey,
          to: payerMatchMintAta.address,
          tokenTransferType: { normal: true },
          mint: matchMint,
          amount: new anchor.BN(1_000_000),
        },
      ],
    };

    const createOracleResult = await matchesProgram.createOrUpdateOracle(
      createOracleArgs
    );
    console.log("createOracleTxSig: %s", createOracleResult.txid);

    const [oracle, _oracleBump] = await Utils.PDA.getOracle(
      oracleSeed.publicKey,
      payer.publicKey
    );

    // create match in initialized state
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

    const [match, _matchBump] = await Utils.PDA.getMatch(oracle);

    // assert match is initialized
    const matchData = await matchesProgram.fetchMatch(match)
    assert.deepStrictEqual(matchData.state, { initialized: {} });

    const joinMatchArgs: Instructions.Matches.JoinMatchArgs = {
      amount: new anchor.BN(1_000_000),
      tokenEntryValidationProof: null,
      tokenEntryValidation: null,
    };

    const joinMatchAccounts: Instructions.Matches.JoinMatchAccounts = {
      tokenMint: matchMint,
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

    // move oracle into finalized state
    const updateOracleArgs: Instructions.Matches.CreateOrUpdateOracleArgs = {
      seed: oracleSeed.publicKey.toString(),
      authority: payer.publicKey,
      space: new anchor.BN(1000),
      finalized: true,
      tokenTransferRoot: null,
      tokenTransfers: [
        {
          from: payer.publicKey,
          to: payerMatchMintAta.address,
          tokenTransferType: { normal: true },
          mint: matchMint,
          amount: new anchor.BN(1_000_000),
        },
      ]
    };

    const updateOracleResult = await matchesProgram.createOrUpdateOracle(
      updateOracleArgs
    );
    console.log("updateOracleResult: %s", updateOracleResult.txid);

    const winOracleData = await matchesProgram.fetchWinOracle(oracle);
    assert.equal(winOracleData.finalized, true);

    // move match into finalized state
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

    // assert match is finalized
    const matchDataUpdated = await matchesProgram.fetchMatch(match)
    assert.deepStrictEqual(matchDataUpdated.state, { finalized: {} });

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
          to: payerMatchMintAta.address,
          tokenTransferType: { normal: true },
          mint: matchMint,
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
      receiver: payer.publicKey,
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
  });

  it("create match and leave", async () => {
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

    // create mint and mint initial tokens to payer for testing
    const matchMint = await splToken.createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      6
    );
    let payerMatchMintAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      matchMint,
      payer.publicKey
    );
    await splToken.mintTo(
      connection,
      payer,
      matchMint,
      payerMatchMintAta.address,
      payer,
      1_000_000_000
    );

    // create win oracle and transfer tokens from payer to escrow
    const oracleSeed = anchor.web3.Keypair.generate();

    const createOracleArgs: Instructions.Matches.CreateOrUpdateOracleArgs = {
      seed: oracleSeed.publicKey.toString(),
      authority: payer.publicKey,
      space: new anchor.BN(1000),
      finalized: false,
      tokenTransferRoot: null,
      tokenTransfers: [
        {
          from: payer.publicKey,
          to: payerMatchMintAta.address,
          tokenTransferType: { normal: true },
          mint: matchMint,
          amount: new anchor.BN(1_000_000),
        },
      ],
    };

    const createOracleResult = await matchesProgram.createOrUpdateOracle(
      createOracleArgs
    );
    console.log("createOracleTxSig: %s", createOracleResult.txid);

    const [oracle, _oracleBump] = await Utils.PDA.getOracle(
      oracleSeed.publicKey,
      payer.publicKey
    );

    // create match in initialized state
    const createMatchArgs: Instructions.Matches.CreateMatchArgs = {
      matchState: { initialized: true },
      tokenEntryValidation: null,
      tokenEntryValidationRoot: null,
      winOracle: oracle,
      winOracleCooldown: new anchor.BN(100),
      authority: payer.publicKey,
      space: new anchor.BN(2000),
      leaveAllowed: true,
      joinAllowedDuringStart: false,
      minimumAllowedEntryTime: new anchor.BN(1000),
      desiredNamespaceArraySize: new anchor.BN(2),
    };

    const createMatchResult = await matchesProgram.createMatch(createMatchArgs);
    console.log("createMatchTxSig: %s", createMatchResult.txid);

    const joinMatchArgs: Instructions.Matches.JoinMatchArgs = {
      amount: new anchor.BN(1_000_000),
      tokenEntryValidationProof: null,
      tokenEntryValidation: null,
    };

    const joinMatchAccounts: Instructions.Matches.JoinMatchAccounts = {
      tokenMint: matchMint,
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

    const leaveMatchArgs: Instructions.Matches.LeaveMatchArgs = {
      amount: new anchor.BN(1_000_000),
    };

    const leaveMatchAccounts: Instructions.Matches.LeaveMatchAccounts = {
      tokenMint: matchMint,
      receiver: payerMatchMintAta.address,
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

  it("update match", async () => {
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

    // create mint and mint initial tokens to payer for testing
    const matchMint = await splToken.createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      6
    );
    let payerMatchMintAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      matchMint,
      payer.publicKey
    );
    await splToken.mintTo(
      connection,
      payer,
      matchMint,
      payerMatchMintAta.address,
      payer,
      1_000_000_000
    );

    // create win oracle and transfer tokens from payer to escrow
    const oracleSeed = anchor.web3.Keypair.generate();

    const createOracleArgs: Instructions.Matches.CreateOrUpdateOracleArgs = {
      seed: oracleSeed.publicKey.toString(),
      authority: payer.publicKey,
      space: new anchor.BN(1000),
      finalized: false,
      tokenTransferRoot: null,
      tokenTransfers: [
        {
          from: payer.publicKey,
          to: payerMatchMintAta.address,
          tokenTransferType: { normal: true },
          mint: matchMint,
          amount: new anchor.BN(1_000_000),
        },
      ],
    };

    const createOracleResult = await matchesProgram.createOrUpdateOracle(
      createOracleArgs
    );
    console.log("createOracleTxSig: %s", createOracleResult.txid);

    const [oracle, _oracleBump] = await Utils.PDA.getOracle(
      oracleSeed.publicKey,
      payer.publicKey
    );

    // create match in initialized state
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

    const [match, _matchBump] = await Utils.PDA.getMatch(oracle);

    // assert match is initialized
    const matchData = await matchesProgram.fetchMatch(match)
    assert.deepStrictEqual(matchData.state, { initialized: {} });
    assert.equal(matchData.leaveAllowed, false);
    assert.equal(matchData.winOracleCooldown, 100);

    const updateMatchArgs: Instructions.Matches.UpdateMatchArgs = {
      matchState: { initialized: true },
      tokenEntryValidation: null,
      tokenEntryValidationRoot: null,
      winOracleCooldown: new anchor.BN(1000),
      authority: payer.publicKey,
      leaveAllowed: true,
      joinAllowedDuringStart: false,
      minimumAllowedEntryTime: new anchor.BN(1000),
    }

    const updateMatchAccounts: Instructions.Matches.UpdateMatchAccounts = {
      winOracle: oracle,
    }

    const updateMatchResult = await matchesProgram.updateMatch(updateMatchArgs, updateMatchAccounts);
    console.log("updateMatchResult: %s", updateMatchResult.txid);

    // assert match is initialized
    const matchDataUpdated = await matchesProgram.fetchMatch(match)
    assert.equal(matchDataUpdated.leaveAllowed, true);
    assert.equal(matchDataUpdated.winOracleCooldown, 1000);
  });

  it.only("TESTING ONLY", async () => {
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

    // create mint and mint initial tokens to payer for testing
    const matchMint = await splToken.createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      6
    );
    let payerMatchMintAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      matchMint,
      payer.publicKey
    );
    await splToken.mintTo(
      connection,
      payer,
      matchMint,
      payerMatchMintAta.address,
      payer,
      1_000_000_000
    );

    // create win oracle and transfer tokens from payer to escrow
    const oracleSeed = anchor.web3.Keypair.generate();

    const createOracleArgs: Instructions.Matches.CreateOrUpdateOracleArgs = {
      seed: oracleSeed.publicKey.toString(),
      authority: payer.publicKey,
      space: new anchor.BN(1000),
      finalized: false,
      tokenTransferRoot: null,
      tokenTransfers: [
        {
          from: payer.publicKey,
          to: payerMatchMintAta.address,
          tokenTransferType: { normal: true },
          mint: matchMint,
          amount: new anchor.BN(1_000_000),
        },
      ],
    };

    const createOracleResult = await matchesProgram.createOrUpdateOracle(
      createOracleArgs
    );
    console.log("createOracleTxSig: %s", createOracleResult.txid);

    const [oracle, _oracleBump] = await Utils.PDA.getOracle(
      oracleSeed.publicKey,
      payer.publicKey
    );

    // create match in initialized state
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

    const [match, _matchBump] = await Utils.PDA.getMatch(oracle);

    // assert match is initialized
    const matchData = await matchesProgram.fetchMatch(match)
    assert.deepStrictEqual(matchData.state, { initialized: {} });

    const joinMatchArgs: Instructions.Matches.JoinMatchArgs = {
      amount: new anchor.BN(1_000_000),
      tokenEntryValidationProof: null,
      tokenEntryValidation: null,
    };

    const joinMatchAccounts: Instructions.Matches.JoinMatchAccounts = {
      tokenMint: matchMint,
      sourceTokenAccount: null,
      tokenTransferAuthority: payer.publicKey,
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
