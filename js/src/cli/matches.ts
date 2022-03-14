#!/usr/bin/env ts-node
import * as fs from "fs";
import { program } from "commander";
import log from "loglevel";
import { loadWalletKey } from "../utils/file";

import BN from "bn.js";
import { web3 } from "@project-serum/anchor";
import { getMatchesProgram } from "../contract/matches";

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
