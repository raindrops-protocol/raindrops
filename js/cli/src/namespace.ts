#!/usr/bin/env ts-node
import { CLI } from "@raindrop-studios/sol-command";
import * as anchor from "@project-serum/anchor";
import { web3 } from "@project-serum/anchor";
import log from "loglevel";
import {
  IDL as NamespaceProgramIDL,
} from "../../idl/namespace";
import { NamespaceProgram } from "../../lib/src/contract/namespace";
import * as nsIx from "../../lib/src/instructions/namespace";
import fs from "fs";

CLI.programCommandWithConfig(
  "initialize_namespace",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const whitelistedStakingMints = config.whitelistedStakingMints.map(
      (mint) => new anchor.web3.PublicKey(mint)
    );

    const initializeNamespaceArgs: nsIx.InitializeNamespaceArgs = {
      desiredNamespaceArraySize: new anchor.BN(2),
      uuid: config.uuid,
      prettyName: config.prettyName,
      permissivenessSettings: config.permissivenessSettings,
      whitelistedStakingMints: whitelistedStakingMints,
    };

    const initializeNamespaceAccounts: nsIx.InitializeNamespaceAccounts = {
      mint: new web3.PublicKey(config.mint),
      metadata: new web3.PublicKey(config.metadata),
      masterEdition: new web3.PublicKey(config.masterEdition),
    };

    await namespaceProgram.initializeNamespace(
      initializeNamespaceArgs,
      initializeNamespaceAccounts
    );

    log.info("Namespace Initialized :: Run `show_namespace` command to view");
  }
);

const showNamespaceArgument = new CLI.Argument(
  "<mint>",
  "The mint associated with the namepace to show"
).argParser((mint) => new web3.PublicKey(mint));
CLI.programCommandWithArgs(
  "show_namespace",
  [showNamespaceArgument],
  async (mint, options, _cmd) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const namespace = await namespaceProgram.fetchNamespace(mint);
    log.setLevel("info");
    namespace.print(log);
  }
);

CLI.programCommandWithConfig(
  "update_namespace",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const whitelistedStakingMints = config.whitelistedStakingMints.map(
      (mint) => new web3.PublicKey(mint)
    );

    const updateNsArgs: nsIx.UpdateNamespaceArgs = {
      prettyName: config.prettyName,
      permissivenessSettings: config.permissivenessSettings,
      whitelistedStakingMints: whitelistedStakingMints,
    };

    const updateNsAccounts: nsIx.UpdateNamespaceAccounts = {
      namespaceMint: new web3.PublicKey(config.mint),
    };

    await namespaceProgram.updateNamespace(updateNsArgs, updateNsAccounts);

    log.info(
      "Namespace updated :: Run `show_namespace` command to see the changes"
    );
  }
);

CLI.programCommandWithConfig(
  "create_namespace_gatekeeper",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const accounts: nsIx.CreateNamespaceGatekeeperAccounts = {
      namespaceMint: new web3.PublicKey(config.mint),
    };

    await namespaceProgram.createNamespaceGatekeeper(accounts);

    log.info("Namespace Gatekeeper created");
  }
);

CLI.programCommandWithConfig(
  "add_to_namespace_gatekeeper",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const args: nsIx.AddToNamespaceGatekeeperArgs = {
      artifactFilter: config.artifactFilter,
    };

    const accounts: nsIx.AddToNamespaceGatekeeperAccounts = {
      namespaceMint: new web3.PublicKey(config.mint),
    };

    await namespaceProgram.addToNamespaceGatekeeper(args, accounts);

    log.info("Filter added to Namespace Gatekeeper");
  }
);

CLI.programCommandWithConfig(
  "remove_from_namespace_gatekeeper",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const args: nsIx.RemoveFromNamespaceGatekeeperArgs = {
      artifactFilter: config.artifactFilter,
    };
    const accounts: nsIx.RemoveFromNamespaceGatekeeperAccounts = {
      namespaceMint: new web3.PublicKey(config.mint),
    };

    await namespaceProgram.removeFromNamespaceGatekeeper(args, accounts);

    log.info("Filter removed from Namespace Gatekeeper");
  }
);

CLI.programCommandWithConfig(
  "join_namespace",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const accounts: nsIx.JoinNamespaceAccounts = {
      namespaceMint: new web3.PublicKey(config.mint),
      artifact: new web3.PublicKey(config.artifact),
    };

    await namespaceProgram.joinNamespace(accounts);

    log.info("Artifact joined to Namespace");
  }
);

CLI.programCommandWithConfig(
  "leave_namespace",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const accounts: nsIx.LeaveNamespaceAccounts = {
      namespaceMint: new web3.PublicKey(config.mint),
      artifact: new web3.PublicKey(config.artifact),
    };

    await namespaceProgram.leaveNamespace(accounts);

    log.info("Artifact removed from Namespace");
  }
);

CLI.programCommandWithConfig(
  "cache_artifact",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const accounts: nsIx.CacheArtifactAccounts = {
      namespaceMint: new web3.PublicKey(config.mint),
      artifact: config.artifact,
    };

    await namespaceProgram.cacheArtifact(accounts);

    log.info("Artifact cached to Namespace");
  }
);

CLI.programCommandWithConfig(
  "uncache_artifact",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const namespaceProgram = await initNsProgram(rpcUrl, keypair);

    const accounts: nsIx.UncacheArtifactAccounts = {
      namespaceMint: new web3.PublicKey(config.mint),
      artifact: config.artifact,
    };

    const args: nsIx.UncacheArtifactArgs = {
      page: new anchor.BN(config.page),
    };

    await namespaceProgram.uncacheArtifact(args, accounts);

    log.info("Artifact removed from Namespace cache");
  }
);

CLI.Program.parseAsync(process.argv);

async function initNsProgram(
  rpcUrl: string,
  keypairPath: string,
): Promise<NamespaceProgram> {
  const connection = new anchor.web3.Connection(rpcUrl, "confirmed");

  const keypair = web3.Keypair.fromSecretKey(new Uint8Array(
    JSON.parse(fs.readFileSync(keypairPath, "utf8"))
  ));

  const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
    NamespaceProgram,
    {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(keypair),
        { commitment: "confirmed" }
      ),
      idl: NamespaceProgramIDL,
    }
  );

  return namespaceProgram;
}
