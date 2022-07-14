#!/usr/bin/env ts-node
import { Wallet, CLI } from "@raindrop-studios/sol-command";
import { AnchorProvider, web3 } from "@project-serum/anchor";
import log from "loglevel";

import { NamespaceProgram } from "../contract/namespace";

CLI.programCommandWithConfig("initialize_namespace", async (config, options, _files) => {
  const { keypair, env, rpcUrl } = options;

  const namespaceProgram = await NamespaceProgram.getProgramWithWalletKeyPair(
    NamespaceProgram,
    await Wallet.loadWalletKey(keypair),
    env,
    rpcUrl,
  );

  const whitelistedStakingMints = config.whitelistedStakingMints.map(
    (mint) => new web3.PublicKey(mint)
  );

  await namespaceProgram.initializeNamespace(
    {
      desiredNamespaceArraySize: config.desiredNamespaceArraySize,
      uuid: config.uuid,
      prettyName: config.prettyName,
      permissivenessSettings: config.permissivenessSettings,
      whitelistedStakingMints: whitelistedStakingMints,
    },
    {
      mint: new web3.PublicKey(config.mint),
      metadata: new web3.PublicKey(config.metadata),
      masterEdition: new web3.PublicKey(config.masterEdition),
    }
  );

  log.info(
    "Namespace Initialized :: Run `show_namespace` command to view"
  );
});

const showNamespaceArgument = new CLI.Argument("<mint>", "The mint associated with the namepace to show")
  .argParser((mint) => new web3.PublicKey(mint));
CLI.programCommandWithArgs("show_namespace", [showNamespaceArgument], async(mint, options, _cmd) => {
  const { keypair, env, rpcUrl } = options;

  const namespaceProgram = await NamespaceProgram.getProgramWithWalletKeyPair(
    NamespaceProgram,
    await Wallet.loadWalletKey(keypair),
    env,
    rpcUrl,
  );

  const namespace = await namespaceProgram.fetchNamespace(mint);
  log.setLevel("info");
  namespace.print(log);
});

CLI.programCommandWithConfig("update_namespace", async (config, options, _files) => {
  const { keypair, env, rpcUrl } = options;

  const namespaceProgram = await NamespaceProgram.getProgramWithWalletKeyPair(
    NamespaceProgram,
    await Wallet.loadWalletKey(keypair),
    env,
    rpcUrl,
  );

  const whitelistedStakingMints = config.whitelistedStakingMints.map(
    (mint) => new web3.PublicKey(mint)
  );

  console.log((namespaceProgram.client.provider as AnchorProvider).wallet.publicKey.toString());

  await namespaceProgram.updateNamespace(
    {
      prettyName: config.prettyName || null,
      permissivenessSettings: config.permissivenessSettings || null,
      whitelistedStakingMints: whitelistedStakingMints || null,
    },
    {
      mint: new web3.PublicKey(config.mint),
      namespaceToken: new web3.PublicKey(config.namespaceToken),
      tokenHolder: (namespaceProgram.client.provider as AnchorProvider).wallet.publicKey,
    }
  );

  log.info(
    "Namespace updated :: Run `show_namespace` command to see the changes"
  );
});

CLI.Program.parseAsync(process.argv);
