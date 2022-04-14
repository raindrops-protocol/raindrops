#!/usr/bin/env ts-node
import * as fs from "fs";
import { program } from "commander";
import log from "loglevel";
import { loadWalletKey } from "../utils/file";

import BN from "bn.js";
import { web3 } from "@project-serum/anchor";
import { getMatchesProgram } from "../contract/matches";
import { getAtaForMint, getMatch, getOracle } from "../utils/pda";
import { MatchState, TokenTransferType, TokenType } from "../state/matches";
import { InheritanceState } from "../state/common";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

programCommand("create_match")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with match settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.createMatch(
      {
        winOracle: config.winOracle
          ? new web3.PublicKey(config.winOracle)
          : (
              await getOracle(
                new web3.PublicKey(config.oracleState.seed),

                config.oracleState.authority
                  ? new web3.PublicKey(config.oracleState.authority)
                  : walletKeyPair.publicKey
              )
            )[0],
        matchBump: null,
        matchState: config.matchState || { draft: true },
        tokenEntryValidationRoot: null,
        tokenEntryValidation: config.tokenEntryValidation
          ? config.tokenEntryValidation
          : null,
        winOracleCooldown: new BN(config.winOracleCooldown || 0),
        authority: config.authority
          ? new web3.PublicKey(config.authority)
          : walletKeyPair.publicKey,
        space: config.space ? new BN(config.space) : new BN(150),
        leaveAllowed: config.leaveAllowed,
        joinAllowedDuringStart: config.joinAllowedDuringStart,
        minimumAllowedEntryTime: config.minimumAllowedEntryTime
          ? new BN(config.minimumAllowedEntryTime)
          : null,
      },
      {},
      config.oracleState
    );
  });

programCommand("update_match")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with match settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.updateMatch(
      {
        matchState: config.matchState || { draft: true },
        tokenEntryValidationRoot: null,
        tokenEntryValidation: config.tokenEntryValidation
          ? config.tokenEntryValidation
          : null,
        winOracleCooldown: new BN(config.winOracleCooldown || 0),
        authority: config.authority
          ? new web3.PublicKey(config.authority)
          : walletKeyPair.publicKey,
        leaveAllowed: config.leaveAllowed,
        joinAllowedDuringStart: config.joinAllowedDuringStart,
        minimumAllowedEntryTime: config.minimumAllowedEntryTime
          ? new BN(config.minimumAllowedEntryTime)
          : null,
      },
      {
        winOracle: config.winOracle
          ? new web3.PublicKey(config.winOracle)
          : (
              await getOracle(
                new web3.PublicKey(config.oracleState.seed),

                config.oracleState.authority
                  ? new web3.PublicKey(config.oracleState.authority)
                  : walletKeyPair.publicKey
              )
            )[0],
      },
      {}
    );
  });

programCommand("join_match")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with match settings"
  )
  .option(
    "-i, --index <string>",
    "Index of token you want to join with in settings file"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, index } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    const indices = [];

    if (index != undefined && index != null) indices.push(index);
    else config.tokensToJoin.forEach((_, i) => indices.push(i));

    for (let i = 0; i < indices.length; i++) {
      const setup = config.tokensToJoin[indices[i]];
      await anchorProgram.joinMatch(
        {
          amount: new BN(setup.amount),
          escrowBump: null,
          tokenEntryValidation: null,
          tokenEntryValidationProof: null,
        },
        {
          tokenMint: new web3.PublicKey(setup.mint),
          sourceTokenAccount: null,
          tokenTransferAuthority: null,
          validationProgram: setup.validationProgram
            ? new web3.PublicKey(setup.validationProgram)
            : null,
        },
        {
          winOracle: config.winOracle
            ? new web3.PublicKey(config.winOracle)
            : (
                await getOracle(
                  new web3.PublicKey(config.oracleState.seed),

                  config.oracleState.authority
                    ? new web3.PublicKey(config.oracleState.authority)
                    : walletKeyPair.publicKey
                )
              )[0],
          sourceType: setup.sourceType as TokenType,
          index:
            setup.index != null && setup.index != undefined
              ? new BN(setup.index)
              : null,
        }
      );
    }
  });

programCommand("leave_match")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with match settings"
  )
  .option(
    "-i, --index <string>",
    "Index of token you want to join with in settings file"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, index } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    const indices = [];

    if (index != undefined && index != null) indices.push(index);
    else config.tokensToJoin.forEach((_, i) => indices.push(i));

    for (let i = 0; i < indices.length; i++) {
      const setup = config.tokensToJoin[indices[i]];
      await anchorProgram.leaveMatch(
        {
          amount: new BN(setup.amount),
          escrowBump: null,
        },
        {
          tokenMint: new web3.PublicKey(setup.mint),
          receiver: walletKeyPair.publicKey,
        },
        {
          winOracle: config.winOracle
            ? new web3.PublicKey(config.winOracle)
            : (
                await getOracle(
                  new web3.PublicKey(config.oracleState.seed),

                  config.oracleState.authority
                    ? new web3.PublicKey(config.oracleState.authority)
                    : walletKeyPair.publicKey
                )
              )[0],
        }
      );
    }
  });

programCommand("update_match_from_oracle")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with match settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.updateMatchFromOracle(
      {},
      {
        winOracle: config.winOracle
          ? new web3.PublicKey(config.winOracle)
          : (
              await getOracle(
                new web3.PublicKey(config.oracleState.seed),

                config.oracleState.authority
                  ? new web3.PublicKey(config.oracleState.authority)
                  : walletKeyPair.publicKey
              )
            )[0],
      },
      {}
    );
  });

programCommand("disburse_tokens_by_oracle")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with match settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    const winOracle = config.winOracle
      ? new web3.PublicKey(config.winOracle)
      : (
          await getOracle(
            new web3.PublicKey(config.oracleState.seed),

            config.oracleState.authority
              ? new web3.PublicKey(config.oracleState.authority)
              : walletKeyPair.publicKey
          )
        )[0];
    const oracleInstance = await anchorProgram.fetchOracle(winOracle);
    for (let i = 0; i < oracleInstance.object.tokenTransfers.length; i++) {
      const tfer = oracleInstance.object.tokenTransfers[i];

      await anchorProgram.disburseTokensByOracle(
        {
          escrowBump: null,
          tokenDeltaProofInfo: null,
        },
        {
          winOracle,
        },
        {
          tokenDelta: tfer,
        }
      );
    }
  });

programCommand("drain_match")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with match settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.drainMatch(
      {},
      {
        receiver: walletKeyPair.publicKey,
      },
      {
        winOracle: config.winOracle
          ? new web3.PublicKey(config.winOracle)
          : (
              await getOracle(
                new web3.PublicKey(config.oracleState.seed),

                config.oracleState.authority
                  ? new web3.PublicKey(config.oracleState.authority)
                  : walletKeyPair.publicKey
              )
            )[0],
      }
    );
  });

programCommand("drain_oracle")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with match settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.drainOracle(
      {
        seed: config.oracleState.seed,
        authority: config.oracleState.authority
          ? new web3.PublicKey(config.oracleState.authority)
          : walletKeyPair.publicKey,
        oracleBump: null,
        matchBump: null,
      },
      {
        receiver: walletKeyPair.publicKey,
      }
    );
  });

programCommand("create_or_update_oracle")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with match settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.createOrUpdateOracle({
      seed: config.oracleState.seed,
      oracleBump: null,
      authority: config.oracleState.authority
        ? new web3.PublicKey(config.oracleState.authority)
        : walletKeyPair.publicKey,
      tokenTransferRoot: config.oracleState.tokenTransferRoot,
      tokenTransfers: config.oracleState.tokenTransfers,
      space: config.space ? new BN(config.space) : new BN(150),
      finalized: config.oracleState.finalized,
    });
  });

programCommand("show_match")
  .option("-cp, --config-path <string>", "JSON file with match settings")
  .option("-o, --oracle <string>", "Oracle ID")
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, oracle } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    let actualOracle = oracle ? new web3.PublicKey(oracle) : null;
    if (configPath !== undefined) {
      const configString = fs.readFileSync(configPath);

      //@ts-ignore
      const config = JSON.parse(configString);
      actualOracle = config.winOracle
        ? new web3.PublicKey(config.winOracle)
        : (
            await getOracle(
              new web3.PublicKey(config.oracleState.seed),
              config.oracleState.authority
                ? new web3.PublicKey(config.oracleState.authority)
                : walletKeyPair.publicKey
            )
          )[0];
    }

    const matchInstance = await anchorProgram.fetchMatch(actualOracle);

    const oracleInstance = await anchorProgram.fetchOracle(actualOracle);

    const u = matchInstance.object;
    const o = oracleInstance.object;
    log.setLevel("info");
    log.info("Match ", matchInstance.key.toBase58());
    log.info(
      "Namespaces:",
      u.namespaces
        ? u.namespaces.map((u) => {
            if (!u.namespace.equals(web3.SystemProgram.programId))
              log.info(
                `--> ${
                  InheritanceState[u.inherited]
                } ${u.namespace.toBase58()} Indexed: ${u.indexed}`
              );
          })
        : "Not Set"
    );
    log.info("State:", Object.keys(u.state)[0]);
    log.info("Win Oracle:", actualOracle);
    log.info("Oracle Cooldown:", u.winOracleCooldown.toNumber());
    log.info(
      "Last Oracle Check:",
      u.lastOracleCheck.toNumber() > 0
        ? new Date(u.lastOracleCheck.toNumber() * 1000)
        : "Never Checked"
    );
    log.info("Oracle Finalized:", o.finalized);
    log.info(
      "Oracle Token Transfer Root:",
      o.tokenTransferRoot ? o.tokenTransferRoot.root.toBase58() : "Unset"
    );
    log.info("Oracle Token Transfers:");
    if (o.tokenTransfers) {
      o.tokenTransfers.map((k) => {
        log.info("--> From:", k.from.toBase58());
        log.info("--> To:", k.to ? k.to.toBase58() : "Burn");
        log.info("--> Transfer Type:", TokenTransferType[k.tokenTransferType]);
        log.info("--> Mint:", k.mint.toBase58());
        log.info("--> Amount:", k.amount.toNumber());
      });
    }
    log.info("Authority:", u.authority.toBase58());
    log.info("Leaving Match Allowed?:", u.leaveAllowed ? "Yes" : "No");

    log.info(
      "Joining Match Allowed?:",
      u.joinAllowedDuringStart ? "Yes" : "No"
    );

    log.info(
      "Minimum Allowed Entry Time:",
      u.minimumAllowedEntryTime
        ? new Date(u.minimumAllowedEntryTime.toNumber() * 1000)
        : "Unset"
    );
    log.info(
      "Current token transfer index:",
      u.currentTokenTransferIndex.toNumber()
    );
    log.info("Token Types Added:", u.tokenTypesAdded.toNumber());
    log.info("Token Types Removed:", u.tokenTypesRemoved.toNumber());
    log.info("Token Entry Validations:");
    if (u.tokenEntryValidation) {
      u.tokenEntryValidation.map((k) => {
        log.info("--> Filter:");
        if (k.filter.mint)
          log.info("----> Mint:", k.filter.mint.mint.toBase58());
        if (k.filter.namespace)
          log.info("----> Namespace:", k.filter.namespace.namespace.toBase58());
        if (k.filter.parent)
          log.info("----> Parent:", k.filter.parent.key.toBase58());
        if (k.filter.all) log.info("----> All allowed");
        if (k.filter.none) log.info("----> None allowed");

        log.info("--> Blacklist?:", k.isBlacklist);
        log.info(
          "--> Validation:",
          k.validation
            ? `Call ${k.validation.key.toBase58()} with ${k.validation.code}`
            : "Not Set"
        );
      });
    }
    log.info(
      "Token Entry Validation Root:",
      u.tokenEntryValidationRoot
        ? u.tokenEntryValidationRoot.root.toBase58()
        : "Unset"
    );
  });
function programCommand(name: string) {
  return program
    .command(name)
    .option(
      "-e, --env <string>",
      "Solana cluster env name",
      "devnet" //mainnet-beta, testnet, devnet
    )
    .requiredOption("-k, --keypair <path>", `Solana wallet location`)
    .option("-l, --log-level <string>", "log level", setLogLevel);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
  if (value === undefined || value === null) {
    return;
  }
  log.info("setting the log value to: " + value);
  log.setLevel(value);
}

program.parse(process.argv);
