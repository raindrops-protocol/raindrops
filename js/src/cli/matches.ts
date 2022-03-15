#!/usr/bin/env ts-node
import * as fs from "fs";
import { program } from "commander";
import log from "loglevel";
import { loadWalletKey } from "../utils/file";

import BN from "bn.js";
import { web3 } from "@project-serum/anchor";
import { getMatchesProgram } from "../contract/matches";
import { getMatch } from "../utils/pda";
import { MatchState } from "../state/matches";
import { InheritanceState } from "../state/common";

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

    await anchorProgram.createMatch({
      winOracle: new web3.PublicKey(config.winOracle),
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
      leaveAllowed: false,
      minimumAllowedEntryTime: config.minimumAllowedEntryTime
        ? new BN(config.minimumAllowedEntryTime)
        : null,
    });
  });

programCommand("show_match")
  .option("-cp, --config-path <string>", "JSON file with match settings")
  .option("-o, --oracle <string>", "Oracle ID")
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, oracle } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getMatchesProgram(walletKeyPair, env, rpcUrl);

    let actualOracle = oracle;
    if (configPath !== undefined) {
      const configString = fs.readFileSync(configPath);

      //@ts-ignore
      const config = JSON.parse(configString);
      actualOracle = config.winOracle;
    }

    const matchInstance = await anchorProgram.fetchMatch(
      new web3.PublicKey(actualOracle)
    );
    const u = matchInstance.object;
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
    log.info("Authority:", u.authority.toBase58());
    log.info("Leaving Match Allowed?:", u.leaveAllowed ? "Yes" : "No");
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
        log.info("--> Filter:", k.filter);
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
