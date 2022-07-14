import { BN, web3 } from "@project-serum/anchor";
import { CLI, Wallet } from "@raindrop-studios/sol-command";
import log from "loglevel";
import { StakingProgram } from "../contract/staking";

CLI.programCommandWithConfig(
  "begin_artifact_stake_warmup",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const stakingProgram = await StakingProgram.getProgramWithWalletKeyPair(
      StakingProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    const { txid } = await stakingProgram.beginArtifactStakeWarmup(
      {
        classIndex: new BN(config.classIndex),
        index: new BN(config.index),
        stakingIndex: new BN(config.stakingIndex),
        artifactClassMint: new web3.PublicKey(config.artifactClassMint),
        artifactMint: new web3.PublicKey(config.artifactMint),
        stakingAmount: new BN(config.stakingAmount),
        stakingPermissivenessToUse: config.stakingPermissivenessToUse || null,
      },
      {
        artifactClass: new web3.PublicKey(config.artifactClass),
        artifact: new web3.PublicKey(config.artifact),
        stakingTokenAccount: new web3.PublicKey(config.stakingTokenAccount),
        stakingMint: new web3.PublicKey(config.stakingMint),
        stakingTransferAuthority: web3.Keypair.generate(),
        namespace: new web3.PublicKey(config.namespace),
      }
    );

    log.setLevel("info");
    log.info(`Transaction signature: ${txid}`);
  }
);

CLI.programCommandWithConfig(
  "end_artifact_stake_warmup",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const stakingProgram = await StakingProgram.getProgramWithWalletKeyPair(
      StakingProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    const { txid } = await stakingProgram.endArtifactStakeWarmup(
      {
        classIndex: new BN(config.classIndex),
        index: new BN(config.index),
        stakingIndex: new BN(config.stakingIndex),
        artifactClassMint: new web3.PublicKey(config.artifactClassMint),
        artifactMint: new web3.PublicKey(config.artifactMint),
        stakingAmount: new BN(config.stakingAmount),
      },
      {
        artifactClass: new web3.PublicKey(config.artifactClass),
        artifact: new web3.PublicKey(config.artifact),
        stakingMint: new web3.PublicKey(config.stakingMint),
      }
    );

    log.setLevel("info");
    log.info(`Transaction signature: ${txid}`);
  }
);

CLI.programCommandWithConfig(
  "begin_artifact_stake_cooldown",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const stakingProgram = await StakingProgram.getProgramWithWalletKeyPair(
      StakingProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    const { txid } = await stakingProgram.beginArtifactStakeCooldown(
      {
        classIndex: new BN(config.classIndex),
        index: new BN(config.index),
        stakingIndex: new BN(config.stakingIndex),
        artifactClassMint: new web3.PublicKey(config.artifactClassMint),
        artifactMint: new web3.PublicKey(config.artifactMint),
        amountToUnstake: new BN(config.amountToUnstake),
        stakingPermissivenessToUse: config.Permissiveness || null,
      },
      {
        artifactClass: new web3.PublicKey(config.artifactClass),
        artifact: new web3.PublicKey(config.artifact),
        stakingAccount: new web3.PublicKey(config.stakingAccount),
        stakingMint: new web3.PublicKey(config.stakingMint),
      }
    );

    log.setLevel("info");
    log.info(`Transaction signature: ${txid}`);
  }
);

CLI.programCommandWithConfig(
  "end_artifact_stake_cooldown",
  async (config, options, _files) => {
    const { keypair, env, rpcUrl } = options;

    const stakingProgram = await StakingProgram.getProgramWithWalletKeyPair(
      StakingProgram,
      await Wallet.loadWalletKey(keypair),
      env,
      rpcUrl
    );

    const { txid } = await stakingProgram.endARtifactStakeCooldown(
      {
        classIndex: new BN(config.classIndex),
        index: new BN(config.index),
        stakingIndex: new BN(config.stakingIndex),
        stakingMint: new web3.PublicKey(config.stakingMint),
        artifactClassMint: new web3.PublicKey(config.artifactClassMint),
        artifactMint: new web3.PublicKey(config.artifactMint),
      },
      {
        artifactClass: new web3.PublicKey(config.artifactClass),
        artifact: new web3.PublicKey(config.artifact),
        stakingAccount: new web3.PublicKey(config.stakingAccount),
      }
    );

    log.setLevel("info");
    log.info(`Transaction signature: ${txid}`);
  }
);
