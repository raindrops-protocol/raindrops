import * as anchor from "@project-serum/anchor";
import * as utils from "./utils";
import {
  Idls,
  Instructions,
  MatchesProgram,
  State,
  Utils,
} from "@raindrops-protocol/raindrops";
import fs from "fs";
import * as splToken from "@solana/spl-token";

async function matches() {
  const decodedKey = new Uint8Array(
    JSON.parse(fs.readFileSync(`./tester.json`).toString())
  );

  let payer = anchor.web3.Keypair.fromSecretKey(decodedKey);

  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

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
  console.log("created mint: %s", matchMint.toString());
  await utils.delay(2000);

  let payerMatchMintAta = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    matchMint,
    payer.publicKey
  );

  await utils.delay(2000);

  await splToken.mintTo(
    connection,
    payer,
    matchMint,
    payerMatchMintAta.address,
    payer,
    1_000_000_000
  );
  console.log("tokens minted to payer");
  await utils.delay(2000);

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
    ],
  };

  const updateOracleResult = await matchesProgram.createOrUpdateOracle(
    updateOracleArgs
  );
  console.log("updateOracleResult: %s", updateOracleResult.txid);

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
}

matches();
