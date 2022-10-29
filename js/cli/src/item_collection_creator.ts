#!/usr/bin/env ts-node
import log from "loglevel";
import * as fs from "fs";

import { AnchorProvider, BN, web3 } from "@project-serum/anchor";

import { Wallet, CLI } from "@raindrop-studios/sol-command";
import {
  PlayerProgram,
  ItemProgram,
  NamespaceProgram,
  ItemCollectionCreator,
  ItemCollectionCreatorArgs,
  Scope,
  MintState,
} from "@raindrops-protocol/raindrops";
import { Utils, Constants } from "@raindrops-protocol/raindrops";

import path = require("path");
import { Connection } from "@solana/web3.js";
import { uploadFileToArweave } from "./upload";
import { Keypair } from "@solana/web3.js";

const { PublicKey } = web3;

async function getItemCollectionCreator(options) {
  const { keypair, env, rpcUrl } = options;
  const playerProgram = await PlayerProgram.getProgramWithWalletKeyPair(
    PlayerProgram,
    await Wallet.loadWalletKey(keypair),
    env,
    rpcUrl
  );
  const itemProgram = await ItemProgram.getProgramWithWalletKeyPair(
    ItemProgram,
    await Wallet.loadWalletKey(keypair),
    env,
    rpcUrl
  );

  const namespaceProgram = await NamespaceProgram.getProgramWithWalletKeyPair(
    NamespaceProgram,
    await Wallet.loadWalletKey(keypair),
    env,
    rpcUrl
  );

  return new ItemCollectionCreator(
    playerProgram,
    itemProgram,
    namespaceProgram
  );
}

async function loadItemImageFileFromDir(
  dir: string
): Promise<Record<string, Buffer>> {
  const folders = fs.readdirSync(dir);
  const imageFiles: Record<string, Buffer> = {};
  for (let j = 0; j < folders.length; j++) {
    const folder = folders[j];
    if (folder != ".DS_Store") {
      const files = fs.readdirSync(path.join(dir, folder));
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file != ".DS_Store")
          imageFiles[folder + "-" + file] = fs.readFileSync(
            path.join(dir, folder + "/" + file)
          );
      }
    }
  }
  return imageFiles;
}

// Turns the config into ItemCollectionCreatorArgs, which are SDK friendly version
// image dir turned into buffers
// some other movie magic added etc.
async function getConfig(
  config,
  env,
  configPath,
  conn: Connection,
  user: string,
  options
): Promise<ItemCollectionCreatorArgs> {
  const decodedKey = new Uint8Array(
    JSON.parse(fs.readFileSync(user).toString())
  );
  const keypair = Keypair.fromSecretKey(decodedKey);
  return {
    ...config,

    env,
    existingCollectionForItems: config.existingCollectionForItems
      ? new PublicKey(config.existingCollectionForItems)
      : null,

    itemIndex: new BN(config.itemIndex),
    hydraWallet: new PublicKey(config.hydraWallet),
    itemImageFile: await loadItemImageFileFromDir(config.itemImageFile),
    itemCollectionFile: fs.readFileSync(config.itemCollectionFile),
    writeOutState: async (f: any) => {
      await fs.writeFileSync(
        configPath,
        JSON.stringify({
          ...f,
          itemImageFile: config.itemImageFile,
          itemCollectionFile: config.itemCollectionFile,
        })
      );
    },
    writeToImmutableStorage: async (
      f: Buffer,
      name: string,
      creators: { address: string; share: number }[]
    ) => {
      return await uploadFileToArweave({
        connection: conn,
        file: f,
        name,
        user: keypair,
        creators,
      });
    },
  } as ItemCollectionCreatorArgs;
}

CLI.programCommandWithConfig(
  "step_one_create_item_collection",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl, configPath } = options;
    const itemC = await getItemCollectionCreator(options);
    const args = await getConfig(
      config,
      env,
      configPath,
      itemC.player.client.provider.connection,
      keypair,
      options
    );
    await itemC.createItemCollection(args);
  }
);

CLI.programCommandWithConfig(
  "step_two_create_item_classes",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl, configPath } = options;
    const itemC = await getItemCollectionCreator(options);
    const args = await getConfig(
      config,
      env,
      configPath,
      itemC.player.client.provider.connection,
      keypair,
      options
    );
    await itemC.createItemClasses(args);
  }
);

CLI.programCommandWithConfig(
  "step_three_mint_items",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl, configPath } = options;
    const itemC = await getItemCollectionCreator(options);
    const args = await getConfig(
      config,
      env,
      configPath,
      itemC.player.client.provider.connection,
      keypair,
      options
    );
    await itemC.createItems(args);
  }
);

CLI.Program.parseAsync(process.argv);
