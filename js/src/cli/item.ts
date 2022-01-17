#!/usr/bin/env ts-node
import * as fs from "fs";
import * as path from "path";
import { program } from "commander";
import log from "loglevel";
import { loadWalletKey } from "../utils/file";
import { getItemProgram } from "../contract/item";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { ItemClassData } from "../state/item";
import BN from "bn.js";
import { web3 } from "@project-serum/anchor";
import { NAMESPACE_AND_INDEX_SIZE } from "../constants/common";
import { getItemPDA } from "../utils/pda";

programCommand("create_item_class")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with item class settings"
  )
  .action(async (files: string[], options, cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.createItemClass(
      {
        itemClassBump: null,
        classIndex: config.index || 0,
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
        space: new BN(config.totalSpaceBytes),
        desiredNamespaceArraySize: new BN(
          NAMESPACE_AND_INDEX_SIZE * config.namespaceRequirement
        ),
        updatePermissivenessToUse: config.updatePermissivenessToUse,
        storeMint: config.storeMint,
        storeMetadataFields: config.storeMetadataFields,
        itemClassData: config.data as ItemClassData,
      },
      {
        itemMint: new web3.PublicKey(config.mint),
        parent: config.parent
          ? (
              await getItemPDA(config.parent.mint, config.parent.index)
            )[0]
          : null,
        parentMint: config.parent
          ? new web3.PublicKey(config.parent.mint)
          : null,
        parentOfParentClassMint: config.parent?.parent
          ? new web3.PublicKey(config.parent.parent.mint)
          : null,
        metadataUpdateAuthority:
          config.metadataUpdateAuthority || walletKeyPair.publicKey,
        parentUpdateAuthority: config.parent
          ? config.parent.metadataUpdateAuthority
          : null,
      },
      {
        parentOfParentClassIndex: config.parent?.parent
          ? config.parent.parent.index
          : null,
      }
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
