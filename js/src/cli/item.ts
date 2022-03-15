#!/usr/bin/env ts-node
import * as fs from "fs";
import log from "loglevel";
import { program } from "commander";
import { programCommand } from "./utils";
import { loadWalletKey } from "../utils/file";
import { SystemProgram } from "@solana/web3.js";

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
import {
  getAtaForMint,
  getEdition,
  getItemEscrow,
  getItemPDA,
  getMetadata,
} from "../utils/pda";
import { InheritanceState, PermissivenessType } from "../state/common";
import { overArgs } from "lodash";

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

    if (config.data.config.components)
      config.data.config.components = config.data.config.components.map(
        (c) => ({
          ...c,
          mint: new web3.PublicKey(c.mint),
          classIndex: new BN(c.classIndex),
          amount: new BN(c.amount),
        })
      );

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
        parentOfParentClassIndex: config.parent?.parent
          ? config.parent.parent.index
          : null,
      },
      {
        itemMint: new web3.PublicKey(config.mint),
        parent: config.parent
          ? (
              await getItemPDA(
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
          : walletKeyPair.publicKey,
        parentUpdateAuthority: config.parent
          ? config.parent.metadataUpdateAuthority
          : null,
      },
      {}
    );
  });

programCommand("create_item_escrow")
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

    await anchorProgram.createItemEscrow(
      {
        craftBump: null,
        classIndex: new BN(config.classIndex || 0),
        craftEscrowIndex: new BN(config.craftEscrowIndex || 0),
        componentScope: config.componentScope || "none",
        buildPermissivenessToUse: config.buildPermissivenessToUse,
        namespaceIndex: config.namespaceIndex
          ? new BN(config.namespaceIndex)
          : null,
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        amountToMake: new BN(config.amountToMake || 1),
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
      },
      {
        newItemMint: new web3.PublicKey(config.newItemMint),
        newItemToken: config.newItemToken
          ? new web3.PublicKey(config.newItemToken)
          : null,
        newItemTokenHolder: config.newItemTokenHolder
          ? new web3.PublicKey(config.config.newItemTokenHolder)
          : null,
        parentMint: config.parent
          ? new web3.PublicKey(config.parent.mint)
          : null,
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        metadataUpdateAuthority: config.metadataUpdateAuthority
          ? new web3.PublicKey(config.metadataUpdateAuthority)
          : walletKeyPair.publicKey,
      },
      {}
    );
  });

programCommand("deactivate_item_escrow")
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

    await anchorProgram.deactivateItemEscrow(
      {
        classIndex: new BN(config.classIndex || 0),
        craftEscrowIndex: new BN(config.craftEscrowIndex || 0),
        componentScope: config.componentScope || "none",
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        amountToMake: new BN(config.amountToMake || 1),
        newItemMint: new web3.PublicKey(config.newItemMint),
        newItemToken: config.newItemToken
          ? new web3.PublicKey(config.newItemToken)
          : null,
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
      },
      {},
      {}
    );
  });

programCommand("add_craft_item_to_escrow")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with item class settings"
  )
  .requiredOption("-i, --index <string>", "component index to add (0 based)")

  .option("-a, --amount <string>", "How much to give")

  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, index, amount } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    const actualIndex = parseInt(index);

    const itemClass = await anchorProgram.fetchItemClass(
      new web3.PublicKey(config.itemClassMint),
      new BN(config.classIndex)
    );

    const component = itemClass.object.itemClassData.config.components.filter(
      (c) => c.componentScope == config.componentScope
    )[actualIndex];

    const amountToContribute = amount
      ? parseInt(amount)
      : component.amount.toNumber();

    await anchorProgram.addCraftItemToEscrow(
      {
        tokenBump: null,
        craftItemCounterBump: null,
        newItemMint: new web3.PublicKey(config.newItemMint),
        originator: config.originator
          ? new web3.PublicKey(config.originator)
          : walletKeyPair.publicKey,
        component: null,
        componentProof: null,
        craftUsageInfo: null,
        craftItemIndex: new BN(config.components[actualIndex].index || 0),
        craftEscrowIndex: new BN(config.craftEscrowIndex || 0),
        classIndex: new BN(config.classIndex || 0),
        componentScope: config.componentScope || "none",
        buildPermissivenessToUse: config.buildPermissivenessToUse,
        namespaceIndex: config.namespaceIndex
          ? new BN(config.namespaceIndex)
          : null,
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        amountToMake: new BN(config.amountToMake || 1),
        amountToContributeFromThisContributor: new BN(amountToContribute),
        craftItemClassIndex: new BN(component.classIndex),
        craftItemClassMint: component.mint,
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
      },
      {
        newItemToken: config.newItemToken
          ? new web3.PublicKey(config.newItemToken)
          : null,
        newItemTokenHolder: config.newItemTokenHolder
          ? new web3.PublicKey(config.config.newItemTokenHolder)
          : null,
        parentMint: config.parent
          ? new web3.PublicKey(config.parent.mint)
          : null,
        craftItemTokenMint: new web3.PublicKey(
          config.components[actualIndex].mint
        ),
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        metadataUpdateAuthority: config.metadataUpdateAuthority
          ? new web3.PublicKey(config.metadataUpdateAuthority)
          : walletKeyPair.publicKey,
      },
      {}
    );
  });

programCommand("remove_craft_item_from_escrow")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with item class settings"
  )
  .requiredOption("-i, --index <string>", "component index to add (0 based)")

  .option("-a, --amount <string>", "How much to remove")

  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, index, amount } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    const actualIndex = parseInt(index);

    const itemClass = await anchorProgram.fetchItemClass(
      new web3.PublicKey(config.itemClassMint),
      new BN(config.classIndex)
    );

    const component = itemClass.object.itemClassData.config.components.filter(
      (c) => c.componentScope == config.componentScope
    )[actualIndex];

    const amountToContribute = amount
      ? parseInt(amount)
      : component.amount.toNumber();

    await anchorProgram.removeCraftItemFromEscrow(
      {
        tokenBump: null,
        craftItemCounterBump: null,
        newItemMint: new web3.PublicKey(config.newItemMint),
        originator: config.originator
          ? new web3.PublicKey(config.originator)
          : walletKeyPair.publicKey,
        component: null,
        componentProof: null,
        craftItemIndex: new BN(config.components[actualIndex].index || 0),
        craftEscrowIndex: new BN(config.craftEscrowIndex || 0),
        classIndex: new BN(config.classIndex || 0),
        componentScope: config.componentScope || "none",
        buildPermissivenessToUse: config.buildPermissivenessToUse,
        namespaceIndex: config.namespaceIndex
          ? new BN(config.namespaceIndex)
          : null,
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        amountToMake: new BN(config.amountToMake || 1),
        amountContributedFromThisContributor: new BN(amountToContribute),
        craftItemClassMint: component.mint,
        craftItemClassIndex: component.classIndex,
        craftItemTokenMint: new web3.PublicKey(
          config.components[actualIndex].mint
        ),
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
      },
      {
        newItemToken: config.newItemToken
          ? new web3.PublicKey(config.newItemToken)
          : null,
        newItemTokenHolder: config.newItemTokenHolder
          ? new web3.PublicKey(config.config.newItemTokenHolder)
          : null,
        parentMint: config.parent
          ? new web3.PublicKey(config.parent.mint)
          : null,
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        metadataUpdateAuthority: config.metadataUpdateAuthority
          ? new web3.PublicKey(config.metadataUpdateAuthority)
          : walletKeyPair.publicKey,
      },
      {
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
      }
    );
  });

programCommand("start_item_escrow_build_phase")
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

    await anchorProgram.startItemEscrowBuildPhase(
      {
        classIndex: new BN(config.classIndex || 0),
        craftEscrowIndex: new BN(config.craftEscrowIndex || 0),
        componentScope: config.componentScope || "none",
        buildPermissivenessToUse: config.buildPermissivenessToUse,
        newItemMint: new web3.PublicKey(config.newItemMint),
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        amountToMake: new BN(config.amountToMake || 1),
        originator: config.originator
          ? new web3.PublicKey(config.originator)
          : walletKeyPair.publicKey,
        totalSteps: config.merkleInfo ? config.merkleInfo.totalSteps : null,
        endNodeProof: config.merkleInfo
          ? new web3.PublicKey(config.merkleInfo.endNodeProof)
          : null,
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
      },
      {
        newItemToken: config.newItemToken
          ? new web3.PublicKey(config.newItemToken)
          : null,
        newItemTokenHolder: config.newItemTokenHolder
          ? new web3.PublicKey(config.config.newItemTokenHolder)
          : null,
        parentMint: config.parent
          ? new web3.PublicKey(config.parent.mint)
          : null,
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        metadataUpdateAuthority: config.metadataUpdateAuthority
          ? new web3.PublicKey(config.metadataUpdateAuthority)
          : walletKeyPair.publicKey,
      },
      {}
    );
  });

programCommand("complete_item_escrow_build_phase")
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

    await anchorProgram.completeItemEscrowBuildPhase(
      {
        classIndex: new BN(config.classIndex || 0),
        newItemIndex: new BN(config.newItemIndex || 0),
        craftEscrowIndex: new BN(config.craftEscrowIndex || 0),
        componentScope: config.componentScope || "none",
        buildPermissivenessToUse: config.buildPermissivenessToUse,
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        amountToMake: new BN(config.amountToMake || 1),
        originator: config.originator
          ? new web3.PublicKey(config.originator)
          : walletKeyPair.publicKey,
        space: new BN(config.totalSpaceBytes),
        storeMetadataFields: !!config.storeMetadataFields,
        storeMint: !!config.storeMint,
        newItemBump: null,
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
      },
      {
        newItemMint: new web3.PublicKey(config.newItemMint),
        newItemToken: config.newItemToken
          ? new web3.PublicKey(config.newItemToken)
          : null,
        newItemTokenHolder: config.newItemTokenHolder
          ? new web3.PublicKey(config.config.newItemTokenHolder)
          : null,
        parentMint: config.parent
          ? new web3.PublicKey(config.parent.mint)
          : null,
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        metadataUpdateAuthority: config.metadataUpdateAuthority
          ? new web3.PublicKey(config.metadataUpdateAuthority)
          : walletKeyPair.publicKey,
      },
      {}
    );
  });

programCommand("drain_item_escrow")
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

    await anchorProgram.drainItemEscrow(
      {
        classIndex: new BN(config.classIndex || 0),
        craftEscrowIndex: new BN(config.craftEscrowIndex || 0),
        componentScope: config.componentScope || "none",
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        amountToMake: new BN(config.amountToMake || 1),
        newItemMint: new web3.PublicKey(config.newItemMint),
        newItemToken: config.newItemToken
          ? new web3.PublicKey(config.newItemToken)
          : null,
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
      },
      {
        originator: config.originator
          ? new web3.PublicKey(config.originator)
          : walletKeyPair.publicKey,
      }
    );
  });

programCommand("begin_item_activation")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with item class settings"
  )
  .option(
    "-ta, --transfer-authority",
    "Keypair to use for tfer authority (if unset, defaults to you)"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, transferAuthority } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.beginItemActivation(
      {
        classIndex: new BN(config.classIndex || 0),
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        amount: new BN(config.amount || 1),
        index: new BN(config.index),
        itemMarkerSpace: config.itemMarkerSpace,
        usageInfo: null,
        usageIndex: config.usageIndex,
        itemActivationBump: null,
        usagePermissivenessToUse: config.usagePermissivenessToUse,
      },
      {
        itemMint: new web3.PublicKey(config.itemMint),
        itemAccount: config.itemAccount
          ? new web3.PublicKey(config.itemAccount)
          : (
              await getAtaForMint(
                new web3.PublicKey(config.itemMint),
                walletKeyPair.publicKey
              )
            )[0],
        itemTransferAuthority: transferAuthority
          ? loadWalletKey(transferAuthority)
          : null,
        metadataUpdateAuthority: new web3.PublicKey(
          config.metadataUpdateAuthority
        ),
      }
    );
  });

programCommand("end_item_activation")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with item class settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, transferAuthority } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.endItemActivation(
      {
        classIndex: new BN(config.classIndex || 0),
        itemClassMint: new web3.PublicKey(config.itemClassMint),
        amount: new BN(config.amount || 1),
        index: new BN(config.index),
        usageIndex: config.usageIndex,
        itemActivationBump: null,
        itemMint: new web3.PublicKey(config.itemMint),
        usageProof: null,
        usage: null,
        usagePermissivenessToUse: config.usagePermissivenessToUse,
      },
      {
        originator: config.originator || walletKeyPair.publicKey,
        metadataUpdateAuthority: new web3.PublicKey(
          config.metadataUpdateAuthority
        ),
      }
    );
  });

programCommand("update_valid_for_use_if_warmup_passed")
  .requiredOption(
    "-cp, --config-path <string>",
    "JSON file with item class settings"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, transferAuthority } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    await anchorProgram.updateValidForUseIfWarmupPassed({
      classIndex: new BN(config.classIndex || 0),
      itemClassMint: new web3.PublicKey(config.itemClassMint),
      amount: new BN(config.amount || 1),
      index: new BN(config.index),
      usageIndex: config.usageIndex,
      itemMint: new web3.PublicKey(config.itemMint),
      usageProof: null,
      usage: null,
    });
  });

programCommand("show_item_build")
  .option("-cp, --config-path <string>", "JSON file with item class settings")

  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    const configString = fs.readFileSync(configPath);
    //@ts-ignore
    const config = JSON.parse(configString);
    const itemClassMint = new web3.PublicKey(config.itemClassMint);
    const classIndex = new BN(config.classIndex);
    const newItemMint = new web3.PublicKey(config.newItemMint);
    const craftEscrowIndex = new BN(config.craftEscrowIndex);

    const itemEscrowKey = (
      await getItemEscrow({
        itemClassMint,
        classIndex,
        craftEscrowIndex,
        newItemMint,
        newItemToken: config.newItemToken
          ? new web3.PublicKey(config.newItemToken)
          : (
              await getAtaForMint(
                newItemMint,
                config.originator
                  ? new web3.PublicKey(config.originator)
                  : walletKeyPair.publicKey
              )
            )[0],
        payer: config.originator
          ? new web3.PublicKey(config.originator)
          : walletKeyPair.publicKey,
        amountToMake: new BN(config.amountToMake),
        componentScope: config.componentScope || "none",
      })
    )[0];

    const itemEscrow = await anchorProgram.program.account.itemEscrow.fetch(
      itemEscrowKey
    );
    log.setLevel("info");

    log.info("Build status:");
    log.info("Deactivated:", itemEscrow.deactivated);
    log.info("Build Step:", itemEscrow.step.toNumber());
    log.info("Time to build:", itemEscrow.timeToBuild);
    log.info(
      "Build Began:",
      itemEscrow.buildBegan
        ? new Date(itemEscrow.buildBegan.toNumber() * 1000)
        : "Still assembling components"
    );
  });

programCommand("show_item")
  .option("-m, --mint <string>", "If no json file, provide mint directly")
  .option(
    "-i, --index <string>",
    "index. Normally is 0, defaults to 0. Allows for more than one item class def per nft."
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, mint, index } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    let actualMint: web3.PublicKey, actualIndex: BN;

    actualMint = new web3.PublicKey(mint);
    actualIndex = new BN(index);

    const itemKey = (await getItemPDA(actualMint, actualIndex))[0];

    const item = await anchorProgram.program.account.item.fetch(itemKey);
    log.setLevel("info");
    log.info("Item", itemKey.toBase58());
    log.info(
      "Namespaces:",
      item.namespaces
        ? item.namespaces.map((u) => {
            if (!u.namespace.equals(SystemProgram.programId))
              log.info(
                `--> ${
                  InheritanceState[u.inherited]
                } ${u.namespace.toBase58()} Indexed: ${u.indexed}`
              );
          })
        : "Not Set"
    );
    log.info(
      "Parent:",
      item.parent.toBase58(),
      "Index:",
      item.classIndex.toNumber()
    );
    log.info(
      "Mint:",
      item.mint ? item.mint.toBase58() : "Not cached on object"
    );
    log.info(
      "Metadata:",
      item.metadata ? item.metadata.toBase58() : "Not cached on object"
    );
    log.info(
      "Edition:",
      item.edition ? item.edition.toBase58() : "Not cached on object"
    );
    log.info("tokensStaked:", item.tokensStaked.toNumber());

    log.info("Item Data:");
    log.info(
      "--> Usage State Root:",
      item.data.usageStateRoot
        ? `(${
            InheritanceState[item.data.usageStateRoot.inherited]
          }) ${item.data.usageStateRoot.root.toBase58()}`
        : "Not Set"
    );
    log.info("--> Usage States:");
    if (item.data.usageStates)
      item.data.usageStates.map((u) => {
        log.info("----> Index:", u.index);
        log.info("----> # Times Used:", u.uses);
        log.info(
          "----> Activated At:",
          u.activatedAt
            ? new Date(u.activatedAt.toNumber() * 1000)
            : "Not Active"
        );
      });
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

    log.setLevel("info");

    log.info("Item Class", itemClass.key.toBase58());
    log.info(
      "Namespaces:",
      itemClass.object.namespaces
        ? itemClass.object.namespaces.map((u) => {
            if (!u.namespace.equals(SystemProgram.programId))
              log.info(
                `--> ${
                  InheritanceState[u.inherited]
                } ${u.namespace.toBase58()} Indexed: ${u.indexed}`
              );
          })
        : "Not Set"
    );
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
      "----> Can use free build:",
      settings.freeBuild ? settings.freeBuild.boolean : "Not Set"
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

    log.info("----> Update Permissiveness:");
    settings.updatePermissiveness
      ? settings.updatePermissiveness.forEach((u) => {
          log.info(
            `------> ${InheritanceState[u.inherited]} ${
              PermissivenessType[u.permissivenessType]
            }`
          );
        })
      : "Default to Update Authority on Metadata";
    log.info("----> Build Permissiveness:");
    settings.buildPermissiveness
      ? settings.buildPermissiveness.forEach((u) => {
          log.info(
            `------> (${InheritanceState[u.inherited]}) ${
              PermissivenessType[u.permissivenessType]
            }`
          );
        })
      : "Not Set";
    log.info(
      "----> Staking Permissiveness:",
      settings.stakingPermissiveness
        ? settings.stakingPermissiveness.forEach((u) => {
            log.info(
              `------> ${InheritanceState[u.inherited]} ${
                PermissivenessType[u.permissivenessType]
              }`
            );
          })
        : "Not Set"
    );
    log.info("----> Unstaking Permissiveness:");
    settings.unstakingPermissiveness
      ? settings.unstakingPermissiveness.forEach((u) => {
          log.info(
            `------> ${InheritanceState[u.inherited]} ${
              PermissivenessType[u.permissivenessType]
            }`
          );
        })
      : "Not Set";

    log.info("----> Child Update Propagation Permissiveness:");
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
      : "Not Set";
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
          u.validation
            ? `Call ${u.validation.key.toBase58()} with ${u.validation.code}`
            : "Not Set"
        );

        log.info("------> Usage Permissiveness:");
        u.usagePermissiveness
          ? u.usagePermissiveness.map((d) => {
              log.info(`--------> ${PermissivenessType[d]}`);
            })
          : "Not Set";

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
          const itemClassType = u.itemClassType.wearable as Wearable;
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
          const itemClassType = u.itemClassType.consumable as Consumable;

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
            "--------> Item Usage Type:",
            ItemUsageType[itemClassType.itemUsageType.toString()]
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
  .option(
    "-iu, --inheritance-update",
    "Permissionlessly update inherited fields"
  )
  .action(async (files: string[], cmd) => {
    const { keypair, env, configPath, rpcUrl, inheritenceUpdate } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    if (configPath === undefined) {
      throw new Error("The configPath is undefined");
    }
    const configString = fs.readFileSync(configPath);

    //@ts-ignore
    const config = JSON.parse(configString);

    if (config.data.config.components)
      config.data.config.components = config.data.config.components.map(
        (c) => ({
          ...c,
          mint: new web3.PublicKey(c.mint),
          classIndex: new BN(c.classIndex),
          amount: new BN(c.amount),
        })
      );

    await anchorProgram.updateItemClass(
      {
        classIndex: new BN(config.index || 0),
        updatePermissivenessToUse: config.updatePermissivenessToUse,
        itemClassData: config.data as ItemClassData,
        parentClassIndex: config.parent ? new BN(config.parent.index) : null,
      },
      {
        itemMint: new web3.PublicKey(config.mint),
        parent: config.parent
          ? (
              await getItemPDA(
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
          : walletKeyPair.publicKey,
      },
      {
        permissionless: inheritenceUpdate,
      }
    );
  });

programCommand("update_item")
  .requiredOption("-m, --item-mint <string>", "Item mint")
  .requiredOption("-cm, --item-class-mint <string>", "Item Class mint")
  .option("-i, --item-index <string>", "Item index")
  .action(async (files: string[], cmd) => {
    const { keypair, env, rpcUrl, itemMint, itemIndex, itemClassMint } =
      cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await getItemProgram(walletKeyPair, env, rpcUrl);

    const item = (
      await getItemPDA(new web3.PublicKey(itemMint), new BN(itemIndex || 0))
    )[0];

    const itemObj = await anchorProgram.program.account.item.fetch(item);

    await anchorProgram.updateItem(
      {
        index: new BN(itemIndex || 0),
        classIndex: itemObj.classIndex,
        itemMint: new web3.PublicKey(itemMint),
        itemClassMint: new web3.PublicKey(itemClassMint),
      },
      {},
      {}
    );
  });

program.parse(process.argv);
