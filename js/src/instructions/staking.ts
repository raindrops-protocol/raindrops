import { AnchorProvider, BN, web3 } from "@project-serum/anchor";
import {
  Program,
  Instruction as SolKitInstruction,
} from "@raindrop-studios/sol-kit";
import { Token } from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "../constants/programIds";
import { Permissiveness } from "../state/common";
import {
  getArtifactIntermediaryStakingAccount,
  getArtifactIntermediaryStakingCounter,
  getArtifactMintStakingAccount,
} from "../utils/pda";

export interface BeginArtifactStakeWarmupArgs {
  classIndex: BN;
  index: BN;
  stakingIndex: BN;
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
  stakingAmount: BN;
  stakingPermissivenessToUse: Permissiveness | null;
}

export interface BeginArtifactStakeWarmupAccounts {
  artifactClass: web3.PublicKey;
  artifact: web3.PublicKey;
  stakingTokenAccount: web3.PublicKey;
  stakingMint: web3.PublicKey;
  stakingTransferAuthority: web3.Keypair;
  namespace: web3.PublicKey;
}

export interface EndArtifactStakeWarmupArgs {
  classIndex: BN;
  index: BN;
  stakingIndex: BN;
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
  stakingAmount: BN;
}

export interface EndArtifactStakeWarmupAccounts {
  artifactClass: web3.PublicKey;
  artifact: web3.PublicKey;
  stakingMint: web3.PublicKey;
}

export interface BeginArtifactStakeCooldownArgs {
  classIndex: BN;
  index: BN;
  stakingIndex: BN;
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
  amountToUnstake: BN;
  stakingPermissivenessToUse: Permissiveness | null;
}

export interface BeginArtifactStakeCooldownAccounts {
  artifactClass: web3.PublicKey;
  artifact: web3.PublicKey;
  stakingAccount: web3.PublicKey;
  stakingMint: web3.PublicKey;
}

export interface EndArtifactStakeCooldownArgs {
  classIndex: BN;
  index: BN;
  stakingIndex: BN;
  stakingMint: web3.PublicKey;
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
}

export interface EndArtifactStakeCooldownAccounts {
  artifactClass: web3.PublicKey;
  artifact: web3.PublicKey;
  stakingAccount: web3.PublicKey;
}

export class Instruction extends SolKitInstruction {
  constructor(args: { program: Program.Program }) {
    super(args);
  }

  async beginArtifactStakeWarmup(
    args: BeginArtifactStakeWarmupArgs,
    accounts: BeginArtifactStakeWarmupAccounts
  ) {
    const [
      artifactIntermediaryStakingAccount,
      _artifactIntermediaryStakingAccountBump,
    ] = await getArtifactIntermediaryStakingAccount({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingMint: accounts.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    const [
      artifactIntermediaryStakingCounter,
      _artifactIntermediaryStakingCounterBump,
    ] = await getArtifactIntermediaryStakingCounter({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingMint: accounts.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    // TODO: add remaining accounts

    return [
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        accounts.stakingTokenAccount,
        accounts.stakingTransferAuthority.publicKey,
        (this.program.client.provider as AnchorProvider).wallet.publicKey,
        [],
        args.stakingAmount.toNumber()
      ),
      await this.program.client.methods
        .beginArtifactStakeWarmup(args)
        .accounts({
          artifactClass: accounts.artifactClass,
          artifact: accounts.artifact,
          artifactIntermediaryStakingAccount,
          artifactIntermediaryStakingCounter,
          stakingTokenAccount: accounts.stakingTokenAccount,
          stakingMint: accounts.stakingMint,
          stakingTransferAuthority: accounts.stakingTransferAuthority.publicKey,
          namespace: accounts.namespace,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .instruction(),
    ];
  }

  async endArtifactStakeWarmup(
    args: EndArtifactStakeWarmupArgs,
    accounts: EndArtifactStakeWarmupAccounts
  ) {
    const [
      artifactIntermediaryStakingAccount,
      _artifactIntermediaryStakingAccountBump,
    ] = await getArtifactIntermediaryStakingAccount({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingMint: accounts.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    const [
      artifactIntermediaryStakingCounter,
      _artifactIntermediaryStakingCounterBump,
    ] = await getArtifactIntermediaryStakingCounter({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingMint: accounts.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    const [artifactMintStakingAccount, _artifactMintStakingAccountBump] =
      await getArtifactMintStakingAccount({
        artifactClassMint: args.artifactClassMint,
        artifactMint: args.artifactMint,
        index: args.index,
        stakingMint: accounts.stakingMint,
      });

    // TODO: add remaining accounts

    return [
      await this.program.client.methods
        .endArtifactStakeWarmup(args)
        .accounts({
          artifactClass: accounts.artifactClass,
          artifact: accounts.artifact,
          artifactIntermediaryStakingAccount,
          artifactIntermediaryStakingCounter,
          artifactMintStakingAccount,
          stakingMint: accounts.stakingMint,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .instruction(),
    ];
  }

  async beginArtifactStakeCooldown(
    args: BeginArtifactStakeCooldownArgs,
    accounts: BeginArtifactStakeCooldownAccounts
  ) {
    const [
      artifactIntermediaryStakingAccount,
      _artifactIntermediaryStakingAccountBump,
    ] = await getArtifactIntermediaryStakingAccount({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingMint: accounts.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    const [
      artifactIntermediaryStakingCounter,
      _artifactIntermediaryStakingCounterBump,
    ] = await getArtifactIntermediaryStakingCounter({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingMint: accounts.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    const [artifactMintStakingAccount, _artifactMintStakingAccountBump] =
      await getArtifactMintStakingAccount({
        artifactClassMint: args.artifactClassMint,
        artifactMint: args.artifactMint,
        index: args.index,
        stakingMint: accounts.stakingMint,
      });

    // TODO: add remaining accounts

    return [
      await this.program.client.methods
        .beginArtifactStakeCooldown(args)
        .accounts({
          artifactClass: accounts.artifactClass,
          artifact: accounts.artifact,
          artifactIntermediaryStakingAccount,
          artifactIntermediaryStakingCounter,
          artifactMintStakingAccount,
          stakingAccount: accounts.stakingAccount,
          stakingMint: accounts.stakingMint,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .instruction(),
    ];
  }

  async endArtifactStakeCooldown(
    args: EndArtifactStakeCooldownArgs,
    accounts: EndArtifactStakeCooldownAccounts
  ) {
    const [
      artifactIntermediaryStakingAccount,
      _artifactIntermediaryStakingAccountBump,
    ] = await getArtifactIntermediaryStakingAccount({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingMint: args.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    const [
      artifactIntermediaryStakingCounter,
      _artifactIntermediaryStakingCounterBump,
    ] = await getArtifactIntermediaryStakingCounter({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingMint: args.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    // TODO: add remaining accounts

    return [
      await this.program.client.methods
        .endArtifactStakeCooldown(args)
        .accounts({
          artifactClass: accounts.artifactClass,
          artifact: accounts.artifact,
          artifactIntermediaryStakingAccount,
          artifactIntermediaryStakingCounter,
          stakingAccount: accounts.stakingAccount,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .instruction(),
    ];
  }
}
