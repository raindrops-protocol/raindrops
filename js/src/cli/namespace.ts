#!/usr/bin/env ts-node
import * as fs from "fs";
import log from "loglevel";
import { program } from "commander";
import { web3 } from "@project-serum/anchor";

import { programCommand } from "./utils";

import { getNamespaceProgram } from "../contract/namespace";
import { loadWalletKey } from "../utils/file";
import { getNamespacePDA } from "../utils/pda";

programCommand("initialize_namespace")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with namespace settings"
  )
  .action(async (_files: string[], cmd) => {
    const { keypair, env, rpcUrl, configPath } =
      cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getNamespaceProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    const config = JSON.parse(configString.toString());

    const whitelistedStakingMints = config.whitelistedStakingMints.map(
      mint => new web3.PublicKey(mint)
    );

    await anchorProgram.initializeNamespace(
      {
        desiredNamespaceArraySize: config.desiredNamespaceArraySize,
        uuid: config.uuid,
        prettyName: config.prettyName,
        permissivenessSettings: config.permissivenessSettings,
        whitelistedStakingMints: whitelistedStakingMints
      },
      {
        mint : new web3.PublicKey(config.mint),
        metadata : new web3.PublicKey(config.metadata),
        masterEdition: new web3.PublicKey(config.masterEdition),
      }
    );
  });

programCommand("show_namespace")
  .option("-m, --mint <string>", "Token mint associated with namespace")
  .action(async (_files: string[], cmd) => {
    const { keypair, env, rpcUrl, mint } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getNamespaceProgram(walletKeyPair, env, rpcUrl);

    let tokenMint: web3.PublicKey = new web3.PublicKey(mint)

    const namespaceKey = (await getNamespacePDA(tokenMint))[0];

    const namespace = await anchorProgram.program.account.namespace.fetch(namespaceKey);
    log.setLevel("info");
    log.info("Namespace:", namespaceKey.toBase58());

    log.info(`Namespaces: ${namespace.namespaces ? "[" : "[]"}`);
    if (namespace.namespaces) {
        namespace.namespaces.map((n) => {
          log.info(`{`)
          log.info(`\tnamespace: ${n.namespace.toBase58()}`);
          log.info(`\tindexed: ${n.indexed}`);
          log.info(`\tinherited: ${Object.keys(n.inherited).join(", ")}`);
          log.info(`}`)
        })
      log.info("]");
    }

    log.info(
      "Mint:",
      namespace.mint ? namespace.mint.toBase58() : "Not cached on object"
    );
    log.info(
      "Metadata:",
      namespace.metadata ? namespace.metadata.toBase58() : "Not cached on object"
    );
    log.info(
      "Master Edition:",
      namespace.masterEdition ? namespace.masterEdition.toBase58() : "Not cached on object"
    );
    log.info(
      "UUID:",
      namespace.uuid ? namespace.uuid.toString() : "Not cached on object"
    );
    log.info(
      "Pretty Name:",
      namespace.prettyName ? namespace.prettyName.toString() : "Not cached on object"
    );
    log.info(
      "Artifacts Added:",
      namespace.artifactsAdded ? namespace.artifactsAdded.toNumber() : "Not cached on object"
    );
    log.info(
      "Highest Page:",
      namespace.highestPage ? namespace.highestPage.toNumber() : "Not cached on object"
    );
    log.info(
      "Aritfacts Cached:",
      namespace.artifactsCached ? namespace.artifactsCached.toNumber() : "Not cached on object"
    );

    log.info("Permissiveness Settings: {");
    log.info(
      `\tNamespace Permissiveness: ${Object.keys(namespace.permissivenessSettings.namespacePermissiveness).join(", ")}`
    )
    log.info(
      `\tItem Permissiveness: ${Object.keys(namespace.permissivenessSettings.itemPermissiveness).join(", ")}`
    )
    log.info(
      `\tPlayer Permissiveness: ${Object.keys(namespace.permissivenessSettings.playerPermissiveness).join(", ")}`
    )
    log.info(
      `\tMatch Permissiveness: ${Object.keys(namespace.permissivenessSettings.matchPermissiveness).join(", ")}`
    )
    log.info(
      `\tMission Permissiveness: ${Object.keys(namespace.permissivenessSettings.missionPermissiveness).join(", ")}`
    )
    log.info(
      `\tCache Permissiveness: ${Object.keys(namespace.permissivenessSettings.cachePermissiveness).join(", ")}`
    )
    log.info("}");

    log.info(
      "Bump:",
      namespace.bump ? namespace.bump : "Not cached on object"
    );

    log.info(`Whitelist Staking Mints: [${namespace.whitelistedStakingMints?.length > 0 ? "" : "]" }`);
    if (namespace.whitelistedStakingMints?.length > 0) {
      namespace.whitelistedStakingMints.map((wlStakingMint) => {
        log.info(`\t${wlStakingMint.toBase58()}`);
      });
      log.info("]");
    }
  });

program.parse(process.argv);
