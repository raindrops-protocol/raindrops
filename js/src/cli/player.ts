#!/usr/bin/env ts-node
import log from "loglevel";
import { web3 } from "@project-serum/anchor";

import { Wallet, CLI } from "@raindrop-studios/sol-command";

CLI.programCommandWithConfig("initialize", async (config, options, _files) => {
  const { keypair, env, rpcUrl } = options;

  const redemptionProgram = await Redemption.getProgramWithWalletKeyPair(
    Redemption,
    await Wallet.loadWalletKey(keypair),
    env,
    rpcUrl
  );

  const rainMintPubKey = new web3.PublicKey(config.rainMint);
  await redemptionProgram.initialize(
    {
      updateAuthority: new web3.PublicKey(config.updateAuthority),
      rainMint: rainMintPubKey,
      redemptionMultiplier: config.redemptionMultiplier,
    },
    {
      rainMint: rainMintPubKey,
    }
  );
});

CLI.Program.parseAsync(process.argv);
