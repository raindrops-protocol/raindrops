#!/usr/bin/env ts-node
import { Wallet, CLI } from "@raindrops-protocol/sol-command";
import { web3 } from "@project-serum/anchor";
import log from "loglevel";

// import { programs as MetaplexPrograms } from '@metaplex/js';
// const { metadata: { Metadata, CreateMetadataV2, DataV2, Creator, CreateMasterEditionV3 } } =  MetaplexPrograms;

const createMasterEditionArgument = new CLI.Argument("<mint>", "The mint associated with the nft")
  .argParser((mint) => new web3.PublicKey(mint));
CLI.programCommandWithArgs("create_master_edition", [createMasterEditionArgument], async(mint, options, _cmd) => {
  const { keypair, env, rpcUrl } = options;


});

CLI.Program.parseAsync(process.argv);
