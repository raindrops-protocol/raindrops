#!/usr/bin/env ts-node
import * as fs from "fs";
import { program } from "commander";
import log from "loglevel";
import { loadWalletKey } from "../utils/file";
import { getItemProgram } from "../contract/item";
import {
  BasicItemEffectType,
  ChildUpdatePropagationPermissivenessType,
  ComponentCondition,
  Consumable,
  ItemClassData,
  ItemUsageType,
  Wearable,
} from "../state/item";
import BN from "bn.js";
import { web3 } from "@project-serum/anchor";
import { getEdition, getItemPDA, getMetadata } from "../utils/pda";
import { InheritanceState, PermissivenessType } from "../state/common";

programCommand("create_item_class")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with item class settings"
  )
  .action(async (files: string[], cmd) => {
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
        classIndex: new BN(config.index || 0),
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
        space: new BN(config.totalSpaceBytes),
        desiredNamespaceArraySize: config.namespaceRequirement,
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

programCommand("show_item_class")
  .option("-cp, --config-path <string>", "JSON file with item class settings")
  .option("-m, --mint <string>", "If no json file, provide mint directly")
  .option(
    "-i, --index <string>",
    "Class index. Normally is 0, defaults to 0. Allows for more than one item class def per nft."
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, mint, index } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    let actualMint: web3.PublicKey, actualIndex: BN;

    if (configPath === undefined) {
      actualMint = new web3.PublicKey(mint);
      actualIndex = new BN(index);
    } else {
      const configString = fs.readFileSync(configPath);
      //@ts-ignore
      const config = JSON.parse(configString);
      actualMint = new web3.PublicKey(config.mint);
      actualIndex = new BN(config.index);
    }

    const itemClass = await anchorProgram.fetchItemClass(
      actualMint,
      actualIndex
    );

    log.info("Item Class", itemClass.key.toBase58());
    log.info(
      "Parent:",
      itemClass.object.parent ? itemClass.object.parent.toBase58() : "None"
    );
    log.info("Mint:", (itemClass.object.mint || actualMint).toBase58());
    log.info(
      "Metadata:",
      (itemClass.object.metadata || (await getMetadata(actualMint))).toBase58()
    );
    log.info(
      "Edition:",
      (itemClass.object.edition || (await getEdition(actualMint))).toBase58()
    );
    log.info(
      "Existing Children:",
      itemClass.object.existingChildren.toNumber()
    );
    const icd = itemClass.object.itemClassData;
    const settings = icd.settings;
    const config = icd.config;
    log.info("Item Class Data:");

    log.info("--> Item Class Settings:");

    log.info(
      "----> Children must be editions:",
      settings.childrenMustBeEditions
        ? settings.childrenMustBeEditions.boolean
        : "Not Set"
    );
    log.info(
      "----> Builder must be holder:",
      settings.builderMustBeHolder
        ? settings.builderMustBeHolder.boolean
        : "Not Set"
    );

    log.info(
      "----> Staking warm up duration:",
      settings.stakingWarmUpDuration
        ? settings.stakingWarmUpDuration.toNumber()
        : "Not Set"
    );

    log.info(
      "----> Staking cooldown duration:",
      settings.stakingCooldownDuration
        ? settings.stakingCooldownDuration.toNumber()
        : "Not Set"
    );

    log.info(
      "----> Update Permissiveness:",
      settings.updatePermissiveness
        ? settings.updatePermissiveness.map((u) => {
            log.info(
              `------> ${InheritanceState[u.inherited]} ${
                PermissivenessType[u.permissivenessType]
              }`
            );
          })
        : "Default to Update Authority on Metadata"
    );
    log.info(
      "----> Build Permissiveness:",
      settings.buildPermissiveness
        ? settings.buildPermissiveness.map((u) => {
            log.info(
              `------> ${InheritanceState[u.inherited]} ${
                PermissivenessType[u.permissivenessType]
              }`
            );
          })
        : "Not Set"
    );
    log.info(
      "----> Staking Permissiveness:",
      settings.stakingPermissiveness
        ? settings.stakingPermissiveness.map((u) => {
            log.info(
              `------> ${InheritanceState[u.inherited]} ${
                PermissivenessType[u.permissivenessType]
              }`
            );
          })
        : "Not Set"
    );
    log.info(
      "----> Unstaking Permissiveness:",
      settings.unstakingPermissiveness
        ? settings.unstakingPermissiveness.map((u) => {
            log.info(
              `------> ${InheritanceState[u.inherited]} ${
                PermissivenessType[u.permissivenessType]
              }`
            );
          })
        : "Not Set"
    );

    log.info(
      "----> Child Update Propagation Permissiveness:",
      settings.childUpdatePropagationPermissiveness
        ? settings.childUpdatePropagationPermissiveness.map((u) => {
            log.info(
              `------> ${InheritanceState[u.inherited]} ${
                ChildUpdatePropagationPermissivenessType[
                  u.childUpdatePropagationPermissivenessType
                ]
              } - is overridable? ${u.overridable}`
            );
          })
        : "Not Set"
    );

    log.info("--> Item Class Config:");

    log.info(
      "----> Usage Root:",
      config.usageRoot
        ? `(${
            InheritanceState[config.usageRoot.inherited]
          }) ${config.usageRoot.root.toBase58()}`
        : "Not Set"
    );

    log.info(
      "----> Usage State Root:",
      config.usageStateRoot
        ? `(${
            InheritanceState[config.usageStateRoot.inherited]
          }) ${config.usageStateRoot.root.toBase58()}`
        : "Not Set"
    );

    log.info(
      "----> Component Root:",
      config.componentRoot
        ? `(${
            InheritanceState[config.componentRoot.inherited]
          }) ${config.componentRoot.root.toBase58()}`
        : "Not Set"
    );

    log.info("----> Components to Build:");

    if (config.components)
      config.components.forEach((c) => {
        log.info("------> Mint:", c.mint.toBase58());
        log.info("------> Amount:", c.amount.toNumber());
        log.info(
          "------> Time to Build:",
          c.timeToBuild ? c.timeToBuild.toNumber() : "None"
        );
        log.info("------> Component Scope:", c.componentScope);
        log.info(
          "------> Use Usage Index (to check cooldown status for crafting):",
          c.useUsageIndex
        );
        log.info("------> Condition:", ComponentCondition[c.condition]);
        log.info("------> Inherited:", InheritanceState[c.inherited]);
      });

    log.info("----> Usages:");

    if (config.usages)
      config.usages.forEach((u) => {
        log.info("------> Index:", u.index);
        log.info("------> Inherited:", InheritanceState[u.inherited]);
        log.info(
          "------> Do Not Pair With Self:",
          u.doNotPairWithSelf ? u.doNotPairWithSelf : "Not Set"
        );
        log.info(
          "------> Do Not Pair With:",
          u.dnp
            ? u.dnp.map((d) => {
                log.info(
                  `--------> (${
                    InheritanceState[d.inherited]
                  }) ${d.key.toBase58()}`
                );
              })
            : "Not Set"
        );
        log.info(
          "------> Callback:",
          u.callback
            ? `Call ${u.callback.key.toBase58()} with ${u.callback.code}`
            : "Not Set"
        );
        log.info(
          "------> Validation:",
          u.callback
            ? `Call ${u.callback.key.toBase58()} with ${u.callback.code}`
            : "Not Set"
        );

        log.info(
          "------> Usage Permissiveness:",
          u.usagePermissiveness
            ? u.usagePermissiveness.map((d) => {
                log.info(`--------> ${PermissivenessType[d]}`);
              })
            : "Not Set"
        );

        log.info("------> Basic Item Effects:");
        if (u.basicItemEffects) {
          u.basicItemEffects.forEach((b) => {
            log.info("--------> Amount:", b.amount.toNumber());
            log.info("--------> Stat:", b.stat);
            log.info(
              "--------> Item Effect Type:",
              BasicItemEffectType[b.itemEffectType]
            );

            log.info(
              "--------> Active Duration:",
              BasicItemEffectType[b.itemEffectType]
            );

            log.info(
              "--------> Staking Amount Numerator:",
              b.stakingAmountNumerator
                ? b.stakingAmountNumerator.toNumber()
                : "Not Set"
            );

            log.info(
              "--------> Staking Amount Divisor:",
              b.stakingAmountDivisor
                ? b.stakingAmountDivisor.toNumber()
                : "Not Set"
            );

            log.info(
              "--------> Staking Duration Numerator:",
              b.stakingDurationNumerator
                ? b.stakingDurationNumerator.toNumber()
                : "Not Set"
            );
            log.info(
              "--------> Staking Duration Divisor:",
              b.stakingDurationDivisor
                ? b.stakingDurationDivisor.toNumber()
                : "Not Set"
            );

            log.info(
              "--------> Max Uses:",
              b.maxUses ? b.maxUses.toNumber() : "Not Set"
            );
          });
        }

        if ((u.itemClassType as any).bodyPart) {
          const itemClassType = u.itemClassType as Wearable;
          log.info("------> Wearable:");
          log.info(
            "--------> Limit Per Part:",
            itemClassType.limitPerPart
              ? itemClassType.limitPerPart.toNumber()
              : "Not Set"
          );
          log.info(
            "--------> Body Parts:",
            itemClassType.bodyPart.forEach((b) => {
              log.info(`----------> ${b}`);
            })
          );
        } else {
          const itemClassType = u.itemClassType as Consumable;

          log.info("------> Consumable:");
          log.info(
            "--------> Max Uses:",
            itemClassType.maxUses ? itemClassType.maxUses.toNumber() : "Not Set"
          );
          log.info(
            "--------> Max Players Per Use:",
            itemClassType.maxPlayersPerUse
              ? itemClassType.maxPlayersPerUse.toNumber()
              : "Not Set"
          );

          log.info(
            "--------> Max Players Per Use:",
            itemClassType.maxPlayersPerUse
              ? itemClassType.maxPlayersPerUse.toNumber()
              : "Not Set"
          );

          log.info(
            "--------> Item Usage Type:",
            ItemUsageType[itemClassType.itemUsageType]
          );
          log.info(
            "--------> Cooldown Duration:",
            itemClassType.cooldownDuration
              ? itemClassType.cooldownDuration.toNumber()
              : "Not Set"
          );
          log.info(
            "--------> Warmup Duration:",
            itemClassType.warmupDuration
              ? itemClassType.warmupDuration.toNumber()
              : "Not Set"
          );
        }
      });
  });
programCommand("update_item_class")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with item class settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.updateItemClass(
      {
        classIndex: new BN(config.index || 0),
        updatePermissivenessToUse: config.updatePermissivenessToUse,
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
        metadataUpdateAuthority:
          config.metadataUpdateAuthority || walletKeyPair.publicKey,
      },
      {
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
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
