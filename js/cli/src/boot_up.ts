#!/usr/bin/env ts-node
import log from "loglevel";
import * as fs from "fs";

import { AnchorProvider, BN, web3 } from "@project-serum/anchor";

import { Wallet, CLI } from "@raindrop-studios/sol-command";
import {
  PlayerProgram,
  ItemProgram,
  NamespaceProgram,
  BootUp,
  BootUpArgs,
  Scope,
  MintState,
} from "@raindrops-protocol/raindrops";
import { Utils, Constants } from "@raindrops-protocol/raindrops";

import path = require("path");
import { Connection } from "@solana/web3.js";
import { uploadFileToArweave } from "./upload";
import { Keypair } from "@solana/web3.js";

const { PDA } = Utils;
const { Player } = Constants;
const { RAIN_PAYMENT_AMOUNT } = Player;
const { getPlayerPDA, getAtaForMint, getItemPDA } = PDA;
const { PublicKey } = web3;

async function getBootsProgram(options) {
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

  return new BootUp(playerProgram, itemProgram, namespaceProgram);
}

async function reloadPlayer(options) {
  const { keypair, env, rpcUrl } = options;

  return await PlayerProgram.getProgramWithWalletKeyPair(
    PlayerProgram,
    await Wallet.loadWalletKey(keypair),
    env,
    rpcUrl
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

// Turns the config into BootUpArgs, which are SDK friendly version
// image dir turned into buffers
// some other movie magic added etc.
async function getConfig(
  config,
  env,
  configPath,
  conn: Connection,
  user: string,
  options
): Promise<BootUpArgs> {
  const decodedKey = new Uint8Array(
    JSON.parse(fs.readFileSync(user).toString())
  );
  const keypair = Keypair.fromSecretKey(decodedKey);
  return {
    ...config,
    scope: {
      type: config.scope.type as Scope,
      values: config.scope.values.map((v) => new web3.PublicKey(v)),
    },
    playerStates: config.playerStates || {},
    env,
    existingCollectionForItems: config.existingCollectionForItems
      ? new PublicKey(config.existingCollectionForItems)
      : null,
    collectionMint: config.collectionMint
      ? new PublicKey(config.collectionMint)
      : null,
    masterMint: config.masterMint ? new PublicKey(config.masterMint) : null,
    updateAuthority: config.updateAuthority
      ? new PublicKey(config.updateAuthority)
      : null,
    index: new BN(config.index),
    itemIndex: new BN(config.itemIndex),
    masterMintHolder: config.masterMintHolder
      ? new PublicKey(config.masterMintHolder)
      : null,
    itemImageFile: await loadItemImageFileFromDir(config.itemImageFile),
    writeOutState: async (f: any) => {
      await fs.writeFileSync(
        configPath,
        JSON.stringify({
          ...f,
          itemImageFile: config.itemImageFile,
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
    reloadPlayer: async () => {
      return reloadPlayer(options);
    },
  } as BootUpArgs;
}

CLI.programCommandWithConfig(
  "step_one_create_main_nft_class",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl, configPath } = options;
    const boots = await getBootsProgram(options);
    const args = await getConfig(
      config,
      env,
      configPath,
      boots.player.client.provider.connection,
      keypair,
      options
    );
    await boots.createMainNFTClass(args);
  }
);

CLI.programCommandWithConfig(
  "step_two_create_item_collection",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl, configPath } = options;
    const boots = await getBootsProgram(options);
    const args = await getConfig(
      config,
      env,
      configPath,
      boots.player.client.provider.connection,
      keypair,
      options
    );
    await boots.createItemCollection(args);
  }
);

CLI.programCommandWithConfig(
  "step_three_create_item_classes",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl, configPath } = options;
    const boots = await getBootsProgram(options);
    const args = await getConfig(
      config,
      env,
      configPath,
      boots.player.client.provider.connection,
      keypair,
      options
    );
    await boots.createItemClasses(args);
  }
);

CLI.programCommandWithConfig(
  "step_four_create_players",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl, configPath } = options;
    const boots = await getBootsProgram(options);
    const args = await getConfig(
      config,
      env,
      configPath,
      boots.player.client.provider.connection,
      keypair,
      options
    );
    await boots.createPlayers(args);
  }
);

CLI.Program.parseAsync(process.argv);
