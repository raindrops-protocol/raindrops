import { AnchorProvider, BN, web3 } from "@project-serum/anchor";
import {
  Program,
  Instruction as SolKitInstruction,
} from "@raindrop-studios/sol-kit";
import { Token } from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "../constants/programIds";
import { ContractCommon } from "../contract/common";
import { AnchorPermissivenessType } from "../state/common";
import {
  getArtifactIntermediaryStakingAccount,
  getArtifactIntermediaryStakingCounterForWarmup,
  getArtifactIntermediaryStakingCounterForCooldown,
  getArtifactMintStakingAccount,
} from "../utils/pda";

const { generateRemainingAccountsForGivenPermissivenessToUse } = ContractCommon;

export interface BeginArtifactStakeWarmupArgs {
  classIndex: BN;
  parentClassIndex: BN | null;
  index: BN;
  stakingIndex: BN;
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
  stakingAmount: BN;
  stakingPermissivenessToUse: AnchorPermissivenessType | null;
}

export interface BeginArtifactStakeWarmupAccounts {
  artifactClass: web3.PublicKey;
  artifact: web3.PublicKey;
  stakingAccount: web3.PublicKey;
  stakingMint: web3.PublicKey;
  stakingTransferAuthority: web3.Keypair;
  parentClassMint: web3.PublicKey | null;
  parentClass: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
  namespace: web3.PublicKey;
}

export interface EndArtifactStakeWarmupArgs {
  classIndex: BN;
  index: BN;
  stakingIndex: BN;
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
}

export interface EndArtifactStakeWarmupAccounts {
  artifactClass: web3.PublicKey;
  artifact: web3.PublicKey;
  stakingMint: web3.PublicKey;
}

export interface BeginArtifactStakeCooldownArgs {
  classIndex: BN;
  parentClassIndex: BN | null;
  index: BN;
  stakingIndex: BN;
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
  stakingPermissivenessToUse: AnchorPermissivenessType | null;
}

export interface BeginArtifactStakeCooldownAccounts {
  artifactClass: web3.PublicKey;
  artifact: web3.PublicKey;
  stakingAccount: web3.PublicKey;
  stakingMint: web3.PublicKey;
  parentClassAccount: web3.PublicKey | null;
  parentClassMint: web3.PublicKey | null;
  parentClass: web3.PublicKey | null;
  metadataUpdateAuthority: web3.PublicKey | null;
}

export interface EndArtifactStakeCooldownArgs {
  classIndex: BN;
  index: BN;
  stakingIndex: BN;
  artifactClassMint: web3.PublicKey;
  artifactMint: web3.PublicKey;
}

export interface EndArtifactStakeCooldownAccounts {
  artifactClass: web3.PublicKey;
  artifact: web3.PublicKey;
  stakingAccount: web3.PublicKey;
  stakingMint: web3.PublicKey;
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
    ] = await getArtifactIntermediaryStakingCounterForWarmup({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingMint: accounts.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    const remainingAccounts =
      await generateRemainingAccountsForGivenPermissivenessToUse({
        permissivenessToUse: args.stakingPermissivenessToUse,
        tokenMint: args.artifactClassMint,
        parentClassMint: accounts.parentClassMint,
        parentClass: accounts.parentClass,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        owner: (this.program.client.provider as AnchorProvider).wallet
          .publicKey,
        program: this.program.client,
      });

    return [
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        accounts.stakingAccount,
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
          stakingAccount: accounts.stakingAccount,
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
        .remainingAccounts(remainingAccounts)
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
    ] = await getArtifactIntermediaryStakingCounterForWarmup({
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
    ] = await getArtifactIntermediaryStakingCounterForCooldown({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      index: args.index,
      stakingAccount: accounts.stakingAccount,
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

    const remainingAccounts =
      await generateRemainingAccountsForGivenPermissivenessToUse({
        permissivenessToUse: args.stakingPermissivenessToUse,
        tokenMint: args.artifactClassMint,
        parentClassMint: accounts.parentClassMint,
        parentClass: accounts.parentClass,
        metadataUpdateAuthority: accounts.metadataUpdateAuthority,
        owner: (this.program.client.provider as AnchorProvider).wallet
          .publicKey,
        program: this.program.client,
      });

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
        .remainingAccounts(remainingAccounts)
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
      stakingMint: accounts.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    const [
      artifactIntermediaryStakingCounter,
      _artifactIntermediaryStakingCounterBump,
    ] = await getArtifactIntermediaryStakingCounterForCooldown({
      artifactClassMint: args.artifactClassMint,
      artifactMint: args.artifactMint,
      stakingAccount: accounts.stakingAccount,
      index: args.index,
      stakingMint: accounts.stakingMint,
      stakingIndex: args.stakingIndex,
    });

    return [
      await this.program.client.methods
        .endArtifactStakeCooldown(args)
        .accounts({
          artifactClass: accounts.artifactClass,
          artifact: accounts.artifact,
          artifactIntermediaryStakingAccount,
          artifactIntermediaryStakingCounter,
          stakingAccount: accounts.stakingAccount,
          stakingMint: accounts.stakingMint,
          payer: (this.program.client.provider as AnchorProvider).wallet
            .publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .instruction(),
    ];
  }
}
