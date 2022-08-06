#!/usr/bin/env ts-node
import log from "loglevel";
import { BN, web3 } from "@project-serum/anchor";

import { Wallet, CLI } from "@raindrop-studios/sol-command";
import { PlayerProgram } from "@raindrops-protocol/raindrops";
import { Utils } from "@raindrops-protocol/raindrops";

const { PDA } = Utils;

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
                await PDA.getItemPDA(
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

CLI.Program.parseAsync(process.argv);
