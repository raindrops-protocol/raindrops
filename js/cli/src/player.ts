#!/usr/bin/env ts-node
import log from "loglevel";
import * as fs from "fs";

import { BN, web3 } from "@project-serum/anchor";

import { Wallet, CLI } from "@raindrop-studios/sol-command";
import { PlayerProgram } from "@raindrops-protocol/raindrops";
import { Utils, State } from "@raindrops-protocol/raindrops";
import { SystemProgram } from "@solana/web3.js";

import InheritanceState = State;
import PermissivenessType = State;
import PlayerState = State.Player;

const { PDA } = Utils;
const { getPlayerPDA, getAtaForMint } = PDA;
const { PublicKey } = web3;

CLI.programCommandWithConfig(
  "create_player_class",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;
    const playerProgram = await PlayerProgram.getProgramWithWalletKeyPair(
      PlayerProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    await (
      await playerProgram.createPlayerClass(
        {
          classIndex: new BN(config.index || 0),
          parentClassIndex: config.parent ? new BN(config.parent.index) : null,
          space: new BN(config.totalSpaceBytes),
          desiredNamespaceArraySize: config.namespaceRequirement,
          updatePermissivenessToUse: config.updatePermissivenessToUse,
          storeMint: config.storeMint,
          storeMetadataFields: config.storeMetadataFields,
          playerClassData: config.data,
          parentOfParentClassIndex: config.parent?.parent
            ? config.parent.parent.index
            : null,
        },
        {
          playerMint: new web3.PublicKey(config.mint),
          parent: config.parent
            ? (
                await PDA.getPlayerPDA(
                  new web3.PublicKey(config.parent.mint),
                  new BN(config.parent.index)
                )
              )[0]
            : null,
          parentMint: config.parent
            ? new web3.PublicKey(config.parent.mint)
            : null,
          parentOfParentClassMint: config.parent?.parent
            ? new web3.PublicKey(config.parent.parent.mint)
            : null,
          metadataUpdateAuthority: config.metadataUpdateAuthority
            ? new web3.PublicKey(config.metadataUpdateAuthority)
            : keypair.publicKey,
          parentUpdateAuthority: config.parent
            ? config.parent.metadataUpdateAuthority
            : null,
        },
        {}
      )
    ).rpc();
  }
);

CLI.programCommandWithConfig(
  "update_player_class",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;
    const playerProgram = await PlayerProgram.getProgramWithWalletKeyPair(
      PlayerProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    await (
      await playerProgram.updatePlayerClass(
        {
          classIndex: new BN(config.index || 0),
          parentClassIndex: config.parent ? new BN(config.parent.index) : null,
          updatePermissivenessToUse: config.updatePermissivenessToUse,
          playerClassData: config.data,
        },
        {
          playerMint: new web3.PublicKey(config.mint),
          parent: config.parent
            ? (
                await PDA.getPlayerPDA(
                  new web3.PublicKey(config.parent.mint),
                  new BN(config.parent.index)
                )
              )[0]
            : null,
          parentMint: config.parent
            ? new web3.PublicKey(config.parent.mint)
            : null,
          metadataUpdateAuthority: config.metadataUpdateAuthority
            ? new web3.PublicKey(config.metadataUpdateAuthority)
            : keypair.publicKey,
        },
        {
          permissionless: config.updatePermissivenessToUse ? false : true,
        }
      )
    ).rpc();
  }
);

CLI.programCommandWithConfig(
  "drain_player_class",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;
    const playerProgram = await PlayerProgram.getProgramWithWalletKeyPair(
      PlayerProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    await (
      await playerProgram.drainPlayerClass(
        {
          classIndex: new BN(config.index || 0),
          parentClassIndex: config.parent ? new BN(config.parent.index) : null,
          updatePermissivenessToUse: config.updatePermissivenessToUse,
          playerClassMint: new web3.PublicKey(config.mint),
        },
        {
          playerMint: new web3.PublicKey(config.mint),
          parent: config.parent
            ? (
                await PDA.getPlayerPDA(
                  new web3.PublicKey(config.parent.mint),
                  new BN(config.parent.index)
                )
              )[0]
            : null,
          parentMint: config.parent
            ? new web3.PublicKey(config.parent.mint)
            : null,
          metadataUpdateAuthority: config.metadataUpdateAuthority
            ? new web3.PublicKey(config.metadataUpdateAuthority)
            : keypair.publicKey,
        }
      )
    ).rpc();
  }
);

CLI.programCommandWithConfig(
  "drain_player",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;
    const playerProgram = await PlayerProgram.getProgramWithWalletKeyPair(
      PlayerProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    await (
      await playerProgram.drainPlayer(
        {
          index: new BN(config.index || config.newPlayerIndex),
          classIndex: new BN(config.classIndex),
          updatePermissivenessToUse:
            config.updatePermissivenessToUse || config.buildPermissivenessToUse,
          playerClassMint: new web3.PublicKey(config.playerClassMint),
          playerMint: new web3.PublicKey(
            config.playerMint || config.newPlayerMint
          ),
        },
        {
          metadataUpdateAuthority: config.metadataUpdateAuthority
            ? new PublicKey(config.metadataUpdateAuthority)
            : keypair.publicKey,
        }
      )
    ).rpc();
  }
);

CLI.programCommandWithConfig(
  "build_player",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;
    const wallet = await Wallet.loadWalletKey(keypair);
    const playerProgram = await PlayerProgram.getProgramWithWalletKeyPair(
      PlayerProgram,
      wallet,
      env,
      rpcUrl
    );

    await (
      await playerProgram.buildPlayer(
        {
          newPlayerIndex: new BN(config.newPlayerIndex),
          parentClassIndex: config.parent ? new BN(config.parent.index) : null,
          classIndex: new BN(config.classIndex),
          buildPermissivenessToUse: config.buildPermissivenessToUse,
          playerClassMint: new web3.PublicKey(config.playerClassMint),
          space: new BN(config.totalSpaceBytes),
          storeMint: config.storeMint,
          storeMetadataFields: config.storeMetadataFields,
        },
        {
          parentMint: config.parent ? new PublicKey(config.parent.mint) : null,
          metadataUpdateAuthority: config.metadataUpdateAuthority
            ? new PublicKey(config.metadataUpdateAuthority)
            : keypair.publicKey,
          newPlayerMint: new PublicKey(config.newPlayerMint),
          newPlayerToken: (
            await getAtaForMint(
              new PublicKey(config.newPlayerMint),
              config.newPlayerTokenHolder
                ? new PublicKey(config.newPlayerTokenHolder)
                : wallet.publicKey
            )
          )[0],
          newPlayerTokenHolder: config.newPlayerTokenHolder
            ? new PublicKey(config.newPlayerTokenHolder)
            : wallet.publicKey,
        }
      )
    ).rpc();
  }
);

CLI.programCommandWithConfig(
  "update_player",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;
    const wallet = await Wallet.loadWalletKey(keypair);
    const playerProgram = await PlayerProgram.getProgramWithWalletKeyPair(
      PlayerProgram,
      wallet,
      env,
      rpcUrl
    );

    await (
      await playerProgram.updatePlayer(
        {
          index: new BN(config.index),
          classIndex: new BN(config.classIndex),
          updatePermissivenessToUse: config.updatePermissivenessToUse,
          playerClassMint: new web3.PublicKey(config.playerClassMint),
          playerMint: new web3.PublicKey(config.playerMint),
          newData: config.updates,
        },
        {
          metadataUpdateAuthority: config.metadataUpdateAuthority
            ? new PublicKey(config.metadataUpdateAuthority)
            : keypair.publicKey,
        },
        {
          permissionless: config.updatePermissivenessToUse ? false : true,
        }
      )
    ).rpc();
  }
);

CLI.programCommand("show_player")
  .option("-cp, --config-path <string>", "JSON file with player class settings")
  .option("-m, --mint <string>", "If no json file, provide mint directly")
  .option(
    "-i, --index <string>",
    "index. Normally is 0, defaults to 0. Allows for more than one player def per nft."
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, mint, index } = cmd.opts();

    const anchorProgram = await PlayerProgram.getProgramWithWalletKeyPair(
      PlayerProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    let actualMint: web3.PublicKey, actualIndex: BN;

    if (configPath === undefined) {
      actualMint = new web3.PublicKey(mint);
      actualIndex = new BN(index);
    } else {
      const configString = fs.readFileSync(configPath);
      //@ts-ignore
      const config = JSON.parse(configString);
      actualMint = new web3.PublicKey(
        config.mint || config.newPlayerMint || config.playerMint
      );
      actualIndex = new BN(
        config.index || config.newPlayerIndex || config.playerIndex
      );
    }

    const playerKey = (await PDA.getPlayerPDA(actualMint, actualIndex))[0];

    const player = (await anchorProgram.client.account.player.fetch(
      playerKey
    )) as any;

    const playerParent = (await anchorProgram.client.account.playerClass.fetch(
      player.parent
    )) as any;
    log.setLevel("info");
    log.info("Player", playerKey.toBase58());
    log.info(
      "Namespaces:",
      player.namespaces
        ? player.namespaces.map((u) => {
            if (!u.namespace.equals(SystemProgram.programId))
              log.info(
                `--> ${
                  InheritanceState[u.inherited]
                } ${u.namespace.toBase58()} Index: ${
                  u.indexed || u.index?.toNumber()
                }`
              );
          })
        : "Not Set"
    );
    log.info(
      "Parent:",
      player.parent.toBase58(),
      "Index:",
      player.classIndex.toNumber(),
      "Mint:",
      playerParent.mint ? playerParent.mint.toBase58() : "Not cached on object"
    );
    log.info(
      "Mint:",
      player.mint ? player.mint.toBase58() : "Not cached on object"
    );
    log.info(
      "Metadata:",
      player.metadata ? player.metadata.toBase58() : "Not cached on object"
    );
    log.info(
      "Edition:",
      player.edition ? player.edition.toBase58() : "Not cached on object"
    );
    log.info("Tokens Staked:", player.tokensStaked.toNumber());
    log.info("Active Item Counter:", player.activeItemCounter.toNumber());
    log.info("Items in Backpack:", player.itemsInBackpack.toNumber());

    log.info("Player Data:");
    log.info(
      "--> Stats Uri:",
      player.data.statsUri
        ? ` (${Object.keys(player.data.statsUri.inherited)[0]}) ${
            player.data.statsUri.statsUri
          }`
        : "Not set"
    );

    log.info(
      "--> Category:",
      player.data.category
        ? ` (${Object.keys(player.data.category.inherited)[0]}) ${
            player.data.category.category
          }`
        : "Not set"
    );

    log.info("--> Basic Stats:");
    if (player.data.basicStats)
      player.data.basicStats.map((u) => {
        log.info("----> Index:", u.index);
        const playerStatTempl = playerParent.data.config?.basicStats?.find(
          (b) => b.index == u.index
        );
        if (playerStatTempl) {
          log.info("----> Name:", playerStatTempl.name);
          if (u.state.enum) {
            log.info(
              "----> Enum Value:",
              playerStatTempl.statType.values.find(
                (v) => v.value == u.state.enum.current
              ).name
            );
          } else if (u.state.integer) {
            log.info(
              "----> Integer Value:",
              u.state.integer.current.toNumber()
            );
          } else if (u.state.bool) {
            log.info("----> Bool Value:", u.state.bool.current);
          } else if (u.state.string) {
            log.info("----> String Value:", u.state.string.current);
          }
        } else
          log.info(
            "----> Value: Not found b/c Player & Class out of sync. Try Permissionless update of player."
          );
        log.info("----");
      });

    log.info("--> Equipped Items:");
    player.equippedItems.map((u) => {
      log.info("----> Index:", u.index);
      log.info("----> Amount:", u.amount.toNumber());
      log.info("----> Pubkey:", u.item.toBase58());
    });

    log.info("--> Player's Body Parts:");
    const config = playerParent.data.config;
    if (config.bodyParts)
      config.bodyParts.forEach((u) => {
        log.info("----> Index:", u.index);
        log.info("----> Inherited:", Object.keys(u.inherited)[0]);
        log.info("----> Body Part:", u.bodyPart);
        log.info(
          "----> Total item spots:",
          u.totalItemSpots ? u.totalItemSpots.toNumber() : "Not Set"
        );
      });
  });

CLI.programCommand("show_player_class")
  .option("-cp, --config-path <string>", "JSON file with player class settings")
  .option("-m, --mint <string>", "If no json file, provide mint directly")
  .option(
    "-i, --index <string>",
    "Class index. Normally is 0, defaults to 0. Allows for more than one player class def per nft."
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, mint, index } = cmd.opts();

    const anchorProgram = await PlayerProgram.getProgramWithWalletKeyPair(
      PlayerProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    let actualMint: web3.PublicKey, actualIndex: BN;

    const printPermissiveness = function (p: any) {
      if (p)
        for (let i = 0; i < p.length; i++) {
          const u = p[i];
          log.info(
            `------> (${Object.keys(u.inherited)[0]}) ${
              Object.keys(u.permissivenessType)[0]
            }`
          );
        }
      else "Default to Token Holder";
    };

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

    const playerClass = await anchorProgram.fetchPlayerClass(
      actualMint,
      actualIndex
    );

    log.setLevel("info");

    if (!playerClass) {
      log.info("Player Class not found with mint:", actualMint.toString());
      return;
    }

    log.info(
      "Player Class",
      (await getPlayerPDA(actualMint, actualIndex))[0].toBase58()
    );
    log.info(
      "Namespaces:",
      playerClass.namespaces
        ? playerClass.namespaces.map((u) => {
            if (!u.namespace.equals(SystemProgram.programId))
              log.info(
                `--> ${
                  InheritanceState[u.inherited]
                } ${u.namespace.toBase58()} Indexed: ${
                  u.indexed || u.index?.toNumber()
                }`
              );
          })
        : "Not Set"
    );
    log.info(
      "Parent:",
      playerClass.parent ? playerClass.parent.toBase58() : "None"
    );
    log.info("Mint:", (playerClass.mint || actualMint).toBase58());
    log.info(
      "Metadata:",
      (playerClass.metadata || (await PDA.getMetadata(actualMint))).toBase58()
    );
    log.info(
      "Edition:",
      (playerClass.edition || (await PDA.getEdition(actualMint))).toBase58()
    );
    log.info("Existing Children:", playerClass.existingChildren.toNumber());
    const icd = playerClass.data;
    const settings = icd.settings;
    const config = icd.config;
    log.info("Player Class Data:");

    log.info("--> Player Class Settings:");

    log.info(
      "----> Default Category:",
      settings.defaultCategory ? settings.defaultCategory.category : "Not Set"
    );
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

    log.info("----> Update Permissiveness:");
    printPermissiveness(settings.updatePermissiveness);

    log.info("----> Instance Update Permissiveness:");
    printPermissiveness(settings.instanceUpdatePermissiveness);

    log.info("----> Build Permissiveness:");
    printPermissiveness(settings.buildPermissiveness);

    log.info("----> Equip Item Permissiveness:");
    printPermissiveness(settings.equipItemPermissiveness);

    log.info("----> Add Item Permissiveness:");
    printPermissiveness(settings.addItemPermissiveness);
    log.info("----> Use Item Permissiveness:");
    printPermissiveness(settings.useItemPermissiveness);

    log.info("----> Unequip Item Permissiveness:");
    printPermissiveness(settings.unEquipItemPermissiveness);
    log.info("----> Remove Item Permissiveness:");

    printPermissiveness(settings.removeItemPermissiveness);

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

    log.info("----> Staking Permissiveness:");

    printPermissiveness(settings.stakingPermissiveness);

    log.info("----> Unstaking Permissiveness:");
    printPermissiveness(settings.unstakingPermissiveness);
    log.info("----> Child Update Propagation Permissiveness:");

    settings.childUpdatePropagationPermissiveness
      ? settings.childUpdatePropagationPermissiveness.map((u) => {
          log.info(
            `------> (${Object.keys(u.inherited)[0]}) ${
              Object.keys(u.childUpdatePropagationPermissivenessType)[0]
            } - is overridable? ${u.overridable}`
          );
        })
      : "Not Set";

    log.info("--> Player Class Config:");

    log.info(
      "----> Starting Stats Uri:",
      config.startingStatsUri
        ? `(${InheritanceState[config.startingStatsUri.inherited]}) ${
            config.startingStatsUri.statsUri
          }`
        : "Not Set"
    );

    log.info("----> Basic Stat Templates:");

    if (config.basicStats)
      config.basicStats.forEach((c) => {
        log.info("------> Index:", c.index);
        log.info("------> Name:", c.name);
        if (c.statType.integer) {
          const v = c.statType.integer;
          log.info(
            `------> Stat Type: Integer (${
              v.min ? v.min.toNumber().toString() + " min <=" : ""
            } ${v.starting.toNumber()} start ${
              v.max ? "<= " + v.max.toNumber().toString() + " max" : ""
            })`
          );
          log.info(
            "------> Staking Amount Scaler:",
            v.stakingAmountScaler ? v.stakingAmountScaler.toNumber() : "None"
          );
          log.info(
            "------> Staking Duration Scaler:",
            v.stakingDurationScaler
              ? v.stakingDurationScaler.toNumber()
              : "None"
          );
        } else if (c.statType.enum) {
          const v = c.statType.enum;
          log.info(
            `------> Stat Type: Enum (Start: ${
              v.values.find((t) => t.value == v.starting).name
            })`
          );
          log.info(
            `------> Values: ${v.values.map((t) => `${t.name} => ${t.value}`)}`
          );
        } else if (c.statType.bool) {
          const v = c.statType.bool;
          log.info(
            `------> Stat Type: Boolean (Start: ${
              v.starting
            }, Staking Flip At: ${
              v.stakingFlip ? v.stakingFlip.toNumber() : "Not Set"
            })`
          );
        } else if (c.statType.string) {
          const v = c.statType.string;
          log.info(`------> Stat Type: String (Start: ${v.starting})`);
        }
        log.info("------> Inherited:", Object.keys(c.inherited)[0]);

        log.info("-------");
      });

    log.info("----> Body Parts:");

    if (config.bodyParts)
      config.bodyParts.forEach((u) => {
        log.info("------> Index:", u.index);
        log.info("------> Inherited:", Object.keys(u.inherited)[0]);
        log.info("------> Body Part:", u.bodyPart);
        log.info(
          "------> Total item spots:",
          u.totalItemSpots ? u.totalItemSpots.toNumber() : "Not Set"
        );
      });

    log.info("-------");
    log.info(
      "------> Equipment Validation Callback:",
      config.equipValidation
        ? `Call ${config.equipValidation.key.toBase58()} with ${
            config.equipValidation.code
          }`
        : "Not Set"
    );

    log.info(
      "------> Add to Pack Callback:",
      config.addToPackValidation
        ? `Call ${config.addToPackValidation.key.toBase58()} with ${
            config.addToPackValidation.code
          }`
        : "Not Set"
    );
  });

CLI.Program.parseAsync(process.argv);
