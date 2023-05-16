import * as anchor from "@project-serum/anchor";
import * as splToken from "spl-token-latest";
import { RaindropsAvatar } from "../../../idls/raindrops_avatar";
import fetch from "cross-fetch";
import {
  AVATAR_PREFIX,
  Avatar,
  AvatarRenderConfig,
  AVATAR_CLASS_PREFIX,
  AvatarClass,
  AvatarClassRenderConfig,
  CreateAvatarAccounts,
  CreateAvatarArgs,
  CreateAvatarClassAccounts,
  CreateAvatarClassArgs,
  CreateTraitAccounts,
  CreateTraitArgs,
  TRAIT_PREFIX,
  Trait,
  TraitRenderConfig,
  StageRenderConfig,
  Variant,
  VariantMetadata,
  VariantOption,
  TraitData,
  UpdateTraitVariantMetadataAccounts,
  UpdateTraitVariantMetadataArgs,
  UpdateClassVariantMetadataAccounts,
  UpdateClassVariantMetadataArgs,
  BootTraitsAccounts,
  PAYMENT_METHOD_PREFIX,
  CreatePaymentMethodAccounts,
  CreatePaymentMethodArgs,
  PaymentMethod,
  TransferPaymentAction,
  parsePaymentAssetClass,
  parsePaymentAction,
  TransferPaymentArgs,
  TransferPaymentAccounts,
  AddPaymentMintToPaymentMethodAccounts,
  NonFungiblePaymentAssetClass,
  BurnPaymentTreeAccounts,
  BurnPaymentTreeArgs,
  VERIFIED_PAYMENT_MINT_PREFIX,
  TransferPaymentTreeAccounts,
  TransferPaymentTreeArgs,
  UpdateClassVariantAuthorityAccounts,
  UpdateClassVariantAuthorityArgs,
  UpdateTraitVariantAuthorityAccounts,
  UpdateTraitVariantAuthorityArgs,
  VerifyPaymentMintAccounts,
  VerifyPaymentMintArgs,
  UpdateState,
  parseUpdateTarget,
  BeginUpdateAccounts,
  BeginUpdateArgs,
  UpdateTargetClassVariant,
  UpdateVariantAccounts,
  UpdateTargetTraitVariant,
  UPDATE_STATE_PREFIX,
  PaymentDetails,
  PayForUpdateAccounts,
  FungiblePaymentAssetClass,
  BurnPaymentAction,
  BurnPaymentAccounts,
  PayForUpdateArgs,
  CancelUpdateAccounts,
  UpdateTarget,
  hashUpdateTarget,
  UpdateVariantArgs,
  CancelUpdateArgs,
  VerifyPaymentMintTestAccounts,
  VerifiedPaymentMint,
  UpdateTargetRemoveTrait,
  UpdateTargetEquipTrait,
  EquipTraitAccounts,
  EquipTraitsAuthorityAccounts,
  RemoveTraitsAuthorityAccounts,
  RemoveTraitAccounts,
  PaymentDetailsExpanded,
  TRAIT_CONFLICTS_PREFIX,
} from "./state";
import {
  AVATAR_RAIN_VAULT_DEVNET,
  AVATAR_RAIN_VAULT_MAINNET,
  RAIN_TOKEN_MINT,
  RAIN_TOKEN_MINT_DEV,
} from "../../../constants/common";
import * as cmp from "@solana/spl-account-compression";
import { Constants, Idls } from "../../../main";

export class AvatarClient {
  private program: anchor.Program<RaindropsAvatar>;
  readonly provider: anchor.AnchorProvider;
  readonly programId: anchor.web3.PublicKey;

  constructor(provider: anchor.AnchorProvider) {
    this.program = new anchor.Program(
      Idls.AvatarIDL,
      Constants.ProgramIds.AVATAR_ID,
      provider
    );
    this.provider = provider;
    this.programId = Constants.ProgramIds.AVATAR_ID;
  }

  async createAvatarClass(
    accounts: CreateAvatarClassAccounts,
    args: CreateAvatarClassArgs
  ): Promise<[anchor.web3.Transaction, anchor.web3.PublicKey]> {
    const avatarClass = avatarClassPDA(accounts.avatarClassMint);

    const avatarClassMintAta = await splToken.getAssociatedTokenAddress(
      accounts.avatarClassMint,
      accounts.authority
    );

    const tx = await this.program.methods
      .createAvatarClass(args)
      .accounts({
        avatarClass: avatarClass,
        avatarClassMint: accounts.avatarClassMint,
        avatarClassMintAta: avatarClassMintAta,
        authority: accounts.authority,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return [tx, avatarClass];
  }

  async createAvatar(
    accounts: CreateAvatarAccounts,
    args: CreateAvatarArgs
  ): Promise<[anchor.web3.Transaction, anchor.web3.PublicKey]> {
    const avatar = avatarPDA(accounts.avatarMint, accounts.avatarClass);

    const avatarClassData = await this.getAvatarClass(accounts.avatarClass);

    const avatarClassMintAta = await splToken.getAssociatedTokenAddress(
      avatarClassData.mint,
      accounts.authority
    );

    let rainVault: anchor.web3.PublicKey;
    let rainMint: anchor.web3.PublicKey;
    try {
      // if the mint account exists on chain then we are either on mainnet or running locally
      await splToken.getMint(
        this.provider.connection,
        RAIN_TOKEN_MINT,
        "confirmed"
      );
      rainVault = AVATAR_RAIN_VAULT_MAINNET;
      rainMint = RAIN_TOKEN_MINT;
    } catch (_e) {
      rainVault = AVATAR_RAIN_VAULT_DEVNET;
      rainMint = RAIN_TOKEN_MINT_DEV;
    }

    const authorityRainAta = await splToken.getAssociatedTokenAddress(
      rainMint,
      accounts.authority
    );

    const tx = await this.program.methods
      .createAvatar(args)
      .accounts({
        avatarClass: accounts.avatarClass,
        avatarClassMintAta: avatarClassMintAta,
        avatar: avatar,
        avatarMint: accounts.avatarMint,
        authorityRainAta: authorityRainAta,
        authority: accounts.authority,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rainVault: rainVault,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
        associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return [tx, avatar];
  }

  async createTrait(
    accounts: CreateTraitAccounts,
    args: CreateTraitArgs
  ): Promise<[anchor.web3.Transaction, anchor.web3.PublicKey]> {
    const avatarClassData = await this.getAvatarClass(accounts.avatarClass);

    const avatarClassMintAta = splToken.getAssociatedTokenAddressSync(
      avatarClassData.mint,
      accounts.authority
    );

    const trait = traitPDA(accounts.avatarClass, accounts.traitMint);

    let rainVault: anchor.web3.PublicKey;
    let rainMint: anchor.web3.PublicKey;
    try {
      // if the mint account exists on chain then we are either on mainnet or running locally
      await splToken.getMint(
        this.provider.connection,
        RAIN_TOKEN_MINT,
        "confirmed"
      );
      rainVault = AVATAR_RAIN_VAULT_MAINNET;
      rainMint = RAIN_TOKEN_MINT;
    } catch (_e) {
      rainVault = AVATAR_RAIN_VAULT_DEVNET;
      rainMint = RAIN_TOKEN_MINT_DEV;
    }

    const authorityRainAta = await splToken.getAssociatedTokenAddress(
      rainMint,
      accounts.authority
    );

    const tx = await this.program.methods
      .createTrait(args)
      .accounts({
        avatarClass: accounts.avatarClass,
        avatarClassMintAta: avatarClassMintAta,
        traitAccount: trait,
        traitMint: accounts.traitMint,
        authority: accounts.authority,
        authorityRainAta: authorityRainAta,
        rainVault: rainVault,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return [tx, trait];
  }

  async equipTrait(
    accounts: EquipTraitAccounts
  ): Promise<anchor.web3.Transaction> {
    const avatarData = await this.getAvatar(accounts.avatar);

    const trait = traitPDA(avatarData.avatarClass, accounts.traitMint);

    // if payment details are null, add the beginUpdate instructions here and collapse into 1 txn
    const beginUpdateIxns: anchor.web3.TransactionInstruction[] = [];
    const traitData = await this.getTrait(trait);
    if (traitData.equipPaymentDetails === null) {
      const beginTraitUpdateAccounts: BeginUpdateAccounts = {
        avatar: accounts.avatar,
      };

      const beginTraitUpdateArgs: BeginUpdateArgs = {
        updateTarget: new UpdateTargetEquipTrait(trait),
      };

      const beginTraitUpdateTx = await this.beginUpdate(
        beginTraitUpdateAccounts,
        beginTraitUpdateArgs
      );
      beginUpdateIxns.push(...beginTraitUpdateTx.instructions);
    }

    const avatarTraitAta = splToken.getAssociatedTokenAddressSync(
      accounts.traitMint,
      accounts.avatar,
      true
    );

    const avatarAuthority = await this.getNftHolder(
      this.provider.connection,
      avatarData.mint
    );

    const traitSource = splToken.getAssociatedTokenAddressSync(
      accounts.traitMint,
      avatarAuthority
    );

    const updateState = updateStatePDA(
      accounts.avatar,
      new UpdateTargetEquipTrait(trait)
    );

    const tx = new anchor.web3.Transaction();

    const equipTraitIx = await this.program.methods
      .equipTrait()
      .accounts({
        avatarClass: avatarData.avatarClass,
        traitAccount: trait,
        traitSource: traitSource,
        avatar: accounts.avatar,
        avatarTraitAta: avatarTraitAta,
        payer: accounts.payer,
        updateState: updateState,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();
    if (beginUpdateIxns.length > 0) {
      tx.add(...beginUpdateIxns);
    }
    tx.add(equipTraitIx);
    await this.setPayer(tx, accounts.payer);

    return tx;
  }

  async equipTraitsAuthority(
    accounts: EquipTraitsAuthorityAccounts
  ): Promise<anchor.web3.Transaction> {
    const avatarData = await this.getAvatar(accounts.avatar);

    const avatarClassData = await this.getAvatarClass(avatarData.avatarClass);

    const avatarClassMintAta = await splToken.getAssociatedTokenAddress(
      avatarClassData.mint,
      accounts.authority
    );

    const equipTraitIxs: anchor.web3.TransactionInstruction[] = [];
    const removeTraitIxs: anchor.web3.TransactionInstruction[] = [];
    for (const traitMint of accounts.traitMints) {
      const trait = traitPDA(avatarData.avatarClass, traitMint);

      const traitData = await this.getTrait(trait);

      // check required attributes for each trait we want to equip
      for (const requiredAttributes of traitData.attributeIds) {
        // if an trait already occupies this attribute we need to remove it
        for (const traitData of avatarData.traits) {
          for (const attributeId of traitData.attributeIds) {
            if (attributeId === requiredAttributes) {
              const equippedTraitData = await this.getTrait(
                traitData.traitAddress
              );
              const removeTraitAccounts: RemoveTraitsAuthorityAccounts = {
                avatar: accounts.avatar,
                authority: accounts.authority,
                traitMints: [equippedTraitData.traitMint],
              };

              const rmTraitIx = (
                await this.removeTraitsAuthority(removeTraitAccounts)
              ).instructions;
              removeTraitIxs.push(...rmTraitIx);
            }
          }
        }

        // create the equip trait ix
        const traitSource = splToken.getAssociatedTokenAddressSync(
          traitMint,
          accounts.authority
        );

        const avatarTraitAta = splToken.getAssociatedTokenAddressSync(
          traitMint,
          accounts.avatar,
          true
        );

        const createAtaIx =
          splToken.createAssociatedTokenAccountIdempotentInstruction(
            accounts.authority,
            avatarTraitAta,
            accounts.avatar,
            traitMint,
            splToken.TOKEN_PROGRAM_ID,
            splToken.ASSOCIATED_TOKEN_PROGRAM_ID
          );

        const equipTraitIx = await this.program.methods
          .equipTraitAuthority()
          .preInstructions([createAtaIx])
          .accounts({
            avatarClass: avatarData.avatarClass,
            avatar: accounts.avatar,
            traitAccount: trait,
            traitSource: traitSource,
            avatarTraitAta: avatarTraitAta,
            avatarClassMintAta: avatarClassMintAta,
            authority: accounts.authority,
            tokenProgram: splToken.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .instruction();

        equipTraitIxs.push(equipTraitIx);
      }
    }

    // create transaction, remove trait instructions go first
    const tx = new anchor.web3.Transaction();
    tx.add(...removeTraitIxs, ...equipTraitIxs);
    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async bootTraits(
    accounts: BootTraitsAccounts
  ): Promise<anchor.web3.Transaction> {
    const avatarClassData = await this.getAvatarClass(accounts.avatarClass);

    const avatarClassMintAta = await splToken.getAssociatedTokenAddress(
      avatarClassData.mint,
      accounts.authority
    );

    const equipTraitIxs: anchor.web3.TransactionInstruction[] = [];
    const removeTraitIxs: anchor.web3.TransactionInstruction[] = [];
    for (const traitMint of accounts.traitMints) {
      const trait = traitPDA(accounts.avatarClass, traitMint);

      // create the equip trait ix
      const traitSource = splToken.getAssociatedTokenAddressSync(
        traitMint,
        accounts.authority
      );

      const avatarTraitAta = splToken.getAssociatedTokenAddressSync(
        traitMint,
        accounts.avatar,
        true
      );

      const createAtaIx =
        splToken.createAssociatedTokenAccountIdempotentInstruction(
          accounts.authority,
          avatarTraitAta,
          accounts.avatar,
          traitMint,
          splToken.TOKEN_PROGRAM_ID,
          splToken.ASSOCIATED_TOKEN_PROGRAM_ID
        );

      const equipTraitIx = await this.program.methods
        .equipTraitAuthority()
        .preInstructions([createAtaIx])
        .accounts({
          avatarClass: accounts.avatarClass,
          avatar: accounts.avatar,
          traitAccount: trait,
          traitSource: traitSource,
          avatarTraitAta: avatarTraitAta,
          avatarClassMintAta: avatarClassMintAta,
          authority: accounts.authority,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction();

      equipTraitIxs.push(equipTraitIx);
    }

    // create transaction, remove trait instructions go first
    const tx = new anchor.web3.Transaction();
    tx.add(...removeTraitIxs, ...equipTraitIxs);
    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async removeTrait(
    accounts: RemoveTraitAccounts
  ): Promise<anchor.web3.Transaction> {
    const avatarData = await this.getAvatar(accounts.avatar);

    const avatarAuthority = await this.getNftHolder(
      this.provider.connection,
      avatarData.mint
    );

    const trait = traitPDA(avatarData.avatarClass, accounts.traitMint);
    // if payment details are null, add the beginUpdate instructions here and collapse into 1 txn
    const beginUpdateIxns: anchor.web3.TransactionInstruction[] = [];
    const traitData = await this.getTrait(trait);
    if (traitData.removePaymentDetails === null) {
      const beginTraitUpdateAccounts: BeginUpdateAccounts = {
        avatar: accounts.avatar,
      };

      const beginTraitUpdateArgs: BeginUpdateArgs = {
        updateTarget: new UpdateTargetRemoveTrait(trait, avatarAuthority),
      };

      const beginTraitUpdateTx = await this.beginUpdate(
        beginTraitUpdateAccounts,
        beginTraitUpdateArgs
      );
      beginUpdateIxns.push(...beginTraitUpdateTx.instructions);
    }

    const avatarTraitAta = splToken.getAssociatedTokenAddressSync(
      accounts.traitMint,
      accounts.avatar,
      true
    );

    const updateState = updateStatePDA(
      accounts.avatar,
      new UpdateTargetRemoveTrait(trait, avatarAuthority)
    );

    const traitDestination = splToken.getAssociatedTokenAddressSync(
      accounts.traitMint,
      avatarAuthority
    );

    const createTraitDestinationIx =
      splToken.createAssociatedTokenAccountIdempotentInstruction(
        accounts.payer,
        traitDestination,
        avatarAuthority,
        accounts.traitMint
      );

    const tx = new anchor.web3.Transaction();
    tx.add(createTraitDestinationIx);

    const removeTraitIx = await this.program.methods
      .removeTrait()
      .accounts({
        avatarClass: avatarData.avatarClass,
        avatar: accounts.avatar,
        avatarTraitAta: avatarTraitAta,
        updateState: updateState,
        traitAccount: trait,
        traitDestination: traitDestination,
        payer: accounts.payer,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();
    if (beginUpdateIxns.length > 0) {
      tx.add(...beginUpdateIxns);
    }
    tx.add(removeTraitIx);

    await this.setPayer(tx, accounts.payer);

    return tx;
  }

  async removeTraitsAuthority(
    accounts: RemoveTraitsAuthorityAccounts
  ): Promise<anchor.web3.Transaction> {
    const avatarData = await this.getAvatar(accounts.avatar);

    const avatarClassData = await this.getAvatarClass(avatarData.avatarClass);

    const avatarClassMintAta = await splToken.getAssociatedTokenAddress(
      avatarClassData.mint,
      accounts.authority
    );

    const tx = new anchor.web3.Transaction();

    for (const traitMint of accounts.traitMints) {
      const trait = traitPDA(avatarData.avatarClass, traitMint);

      const avatarTraitAta = splToken.getAssociatedTokenAddressSync(
        traitMint,
        accounts.avatar,
        true
      );

      const traitDestination = splToken.getAssociatedTokenAddressSync(
        traitMint,
        accounts.authority
      );

      const ix = await this.program.methods
        .removeTraitAuthority()
        .accounts({
          avatarClass: avatarData.avatarClass,
          avatar: accounts.avatar,
          avatarTraitAta: avatarTraitAta,
          avatarClassMintAta: avatarClassMintAta,
          traitAccount: trait,
          traitDestination: traitDestination,
          traitMint: traitMint,
          authority: accounts.authority,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
    }

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async updateVariant(
    accounts: UpdateVariantAccounts,
    args: UpdateVariantArgs
  ): Promise<anchor.web3.Transaction> {
    const avatarData = await this.getAvatar(accounts.avatar);

    const updateState = updateStatePDA(accounts.avatar, args.updateTarget);

    const updateStateData = await this.getUpdateState(updateState);

    let traitAccount: anchor.web3.PublicKey | null = null;
    if (updateStateData.target instanceof UpdateTargetTraitVariant) {
      traitAccount = updateStateData.target.trait;
    }

    const tx = await this.program.methods
      .updateVariant()
      .accounts({
        avatarClass: avatarData.avatarClass,
        avatar: accounts.avatar,
        updateState: updateState,
        traitAccount: traitAccount,
        payer: accounts.payer,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.payer);

    return tx;
  }

  async updateTraitVariantMetadata(
    accounts: UpdateTraitVariantMetadataAccounts,
    args: UpdateTraitVariantMetadataArgs
  ) {
    const avatarClassData = await this.getAvatarClass(accounts.avatarClass);

    const avatarClassMintAta = splToken.getAssociatedTokenAddressSync(
      avatarClassData.mint,
      accounts.authority
    );

    const tx = await this.program.methods
      .updateTraitVariantMetadata(args)
      .accounts({
        avatarClass: accounts.avatarClass,
        avatarClassMintAta: avatarClassMintAta,
        traitAccount: traitPDA(accounts.avatarClass, accounts.traitMint),
        authority: accounts.authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async updateClassVariantMetadata(
    accounts: UpdateClassVariantMetadataAccounts,
    args: UpdateClassVariantMetadataArgs
  ) {
    const avatarClassData = await this.getAvatarClass(accounts.avatarClass);

    const avatarClassMintAta = splToken.getAssociatedTokenAddressSync(
      avatarClassData.mint,
      accounts.authority
    );

    const tx = await this.program.methods
      .updateClassVariantMetadata(args)
      .accounts({
        avatarClass: accounts.avatarClass,
        avatarClassMintAta: avatarClassMintAta,
        authority: accounts.authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async createPaymentMethod(
    accounts: CreatePaymentMethodAccounts,
    args: CreatePaymentMethodArgs
  ): Promise<[anchor.web3.Transaction, anchor.web3.PublicKey]> {
    const avatarClassData = await this.getAvatarClass(accounts.avatarClass);

    const avatarClassMintAta = await splToken.getAssociatedTokenAddress(
      avatarClassData.mint,
      accounts.authority
    );

    const paymentMethod = paymentMethodPDA(
      accounts.avatarClass,
      avatarClassData.paymentIndex
    );

    // tree accounts
    let paymentMints: anchor.web3.PublicKey | null = null;
    let accountCompression: anchor.web3.PublicKey | null = null;
    let logWrapper: anchor.web3.PublicKey | null = null;

    // if non fungible create all the tree stuff
    const createPaymentMintsTreeIx: anchor.web3.TransactionInstruction[] = [];
    if (args.assetClass instanceof NonFungiblePaymentAssetClass) {
      paymentMints = (args.assetClass as NonFungiblePaymentAssetClass).mints;
      accountCompression = cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID;
      logWrapper = cmp.SPL_NOOP_PROGRAM_ID;

      const maxDepth = 16;
      const maxBufferSize = 64;

      const treeSpace = cmp.getConcurrentMerkleTreeAccountSize(
        maxDepth,
        maxBufferSize
      );

      const treeLamports =
        await this.provider.connection.getMinimumBalanceForRentExemption(
          treeSpace
        );

      createPaymentMintsTreeIx.push(
        await anchor.web3.SystemProgram.createAccount({
          fromPubkey: accounts.authority,
          newAccountPubkey: accounts.mints.publicKey,
          lamports: treeLamports,
          space: treeSpace,
          programId: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        })
      );
    }

    // convert args into anchor compatible enums
    const ixArgs = {
      assetClass: args.assetClass.format(),
      action: args.action.format(),
    };

    const signers: anchor.web3.Keypair[] = [];
    if (accounts.mints) {
      signers.push(accounts.mints);
    }

    const tx = await this.program.methods
      .createPaymentMethod(ixArgs)
      .preInstructions(createPaymentMintsTreeIx)
      .accounts({
        paymentMethod: paymentMethod,
        paymentMints: paymentMints,
        avatarClass: accounts.avatarClass,
        avatarClassMintAta: avatarClassMintAta,
        authority: accounts.authority,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        accountCompression: accountCompression,
        logWrapper: logWrapper,
      })
      .signers(signers)
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return [tx, paymentMethod];
  }

  async beginUpdate(
    accounts: BeginUpdateAccounts,
    args: BeginUpdateArgs
  ): Promise<anchor.web3.Transaction> {
    const updateState = updateStatePDA(accounts.avatar, args.updateTarget);

    const avatarData = await this.getAvatar(accounts.avatar);

    // get avatar authority
    const avatarAuthority = await this.getNftHolder(
      this.provider.connection,
      avatarData.mint
    );
    const avatarAuthorityAta = splToken.getAssociatedTokenAddressSync(
      avatarData.mint,
      avatarAuthority
    );

    let traitData: Trait | null = null;
    let isTraitUpdate = false;
    if (args.updateTarget instanceof UpdateTargetTraitVariant) {
      const updateTarget = args.updateTarget as UpdateTargetTraitVariant;
      traitData = await this.getTrait(updateTarget.trait);
      if (
        !traitData.isValidVariant(updateTarget.variantId, updateTarget.optionId)
      ) {
        throw new Error(
          `invalid variant, variantId: ${updateTarget.variantId}, optionId: ${updateTarget.optionId}`
        );
      }
    }

    if (args.updateTarget instanceof UpdateTargetEquipTrait) {
      isTraitUpdate = true;
      const updateTargetEquipTrait =
        args.updateTarget as UpdateTargetEquipTrait;
      traitData = await this.getTrait(updateTargetEquipTrait.traitAccount);
    }

    if (args.updateTarget instanceof UpdateTargetRemoveTrait) {
      isTraitUpdate = true;
      const updateTargetRemoveTrait =
        args.updateTarget as UpdateTargetRemoveTrait;
      traitData = await this.getTrait(updateTargetRemoveTrait.traitAccount);
    }

    const ixArgs = {
      updateTarget: args.updateTarget.format(),
    };

    let tx = new anchor.web3.Transaction();

    // call the correct begin update
    if (isTraitUpdate) {
      const avatarTraitAta = splToken.getAssociatedTokenAddressSync(
        traitData.traitMint,
        accounts.avatar,
        true
      );

      tx = await this.program.methods
        .beginTraitUpdate(ixArgs)
        .accounts({
          avatarClass: avatarData.avatarClass,
          updateState: updateState,
          traitAccount: traitData.traitAddress,
          avatar: accounts.avatar,
          traitMint: traitData.traitMint,
          avatarTraitAta: avatarTraitAta,
          avatarMintAta: avatarAuthorityAta,
          authority: avatarAuthority,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();
    } else {
      let traitAccount: anchor.web3.PublicKey | null = null;
      if (traitData !== null) {
        traitAccount = traitData.traitAddress;
      }

      tx = await this.program.methods
        .beginVariantUpdate(ixArgs)
        .accounts({
          avatarClass: avatarData.avatarClass,
          updateState: updateState,
          traitAccount: traitAccount,
          avatar: accounts.avatar,
          avatarMintAta: avatarAuthorityAta,
          authority: avatarAuthority,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();
    }

    await this.setPayer(tx, avatarAuthority);

    return tx;
  }

  async cancelUpdate(
    accounts: CancelUpdateAccounts,
    args: CancelUpdateArgs
  ): Promise<anchor.web3.Transaction> {
    const updateState = updateStatePDA(accounts.avatar, args.updateTarget);

    const avatarData = await this.getAvatar(accounts.avatar);

    // get avatar authority
    const avatarAuthority = await this.getNftHolder(
      this.provider.connection,
      avatarData.mint
    );
    const avatarAuthorityAta = splToken.getAssociatedTokenAddressSync(
      avatarData.mint,
      avatarAuthority
    );

    const ixArgs = {
      updateTarget: args.updateTarget.format(),
    };

    const tx = await this.program.methods
      .cancelUpdate(ixArgs)
      .accounts({
        updateState: updateState,
        avatar: accounts.avatar,
        avatarMintAta: avatarAuthorityAta,
        authority: avatarAuthority,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();
    await this.setPayer(tx, avatarAuthority);

    return tx;
  }

  async payForUpdate(
    accounts: PayForUpdateAccounts,
    args: PayForUpdateArgs
  ): Promise<anchor.web3.Transaction[]> {
    const updateState = updateStatePDA(accounts.avatar, args.updateTarget);
    const updateStateData = await this.getUpdateState(updateState);

    const avatarData = await this.getAvatar(updateStateData.avatar);
    const avatarClassData = await this.getAvatarClass(avatarData.avatarClass);

    const txns: anchor.web3.Transaction[] = [];

    // if the update state is marked as paid we don't need to do anything
    if (updateStateData.isPaid()) {
      console.log("updateState already paid");
      return txns;
    }

    // get payment method data
    let paymentMethodData: PaymentMethod;
    let paymentMethodAddress: anchor.web3.PublicKey;
    switch (updateStateData.target.constructor) {
      case UpdateTargetClassVariant: {
        const updateTargetClassVariant =
          updateStateData.target as UpdateTargetClassVariant;
        const classVariantMetadata = avatarClassData.variantMetadata.find(
          (vm) => vm.id === updateTargetClassVariant.variantId
        );
        if (classVariantMetadata === undefined) {
          throw new Error(
            `invalid class variant id: ${updateTargetClassVariant.variantId}`
          );
        }

        const classPaymentDetails = classVariantMetadata.options.find(
          (opt) => opt.optionId === updateTargetClassVariant.optionId
        ).paymentDetails;
        if (classPaymentDetails === null) {
          console.log(
            `class paymentDetails are null for ${updateTargetClassVariant.optionId}`
          );
          return txns;
        }
        paymentMethodData = await this.getPaymentMethod(
          classPaymentDetails.paymentMethod
        );
        paymentMethodAddress = classPaymentDetails.paymentMethod;
        break;
      }
      case UpdateTargetTraitVariant: {
        const updateTargetTraitVariant =
          updateStateData.target as UpdateTargetTraitVariant;
        const traitDataVariantUpdate = await this.getTrait(
          updateTargetTraitVariant.trait
        );
        const traitVariantMetadata =
          traitDataVariantUpdate.variantMetadata.find(
            (vm) => vm.id === updateTargetTraitVariant.variantId
          );
        if (traitVariantMetadata === undefined) {
          throw new Error(
            `invalid trait variant id: ${updateTargetTraitVariant.variantId}`
          );
        }

        const traitPaymentDetails = traitVariantMetadata.options.find(
          (opt) => opt.optionId === updateTargetTraitVariant.optionId
        ).paymentDetails;
        if (traitPaymentDetails === null) {
          console.log(
            `trait paymentDetails are null for ${updateTargetTraitVariant.optionId}`
          );
          return txns;
        }
        paymentMethodData = await this.getPaymentMethod(
          traitPaymentDetails.paymentMethod
        );
        paymentMethodAddress = traitPaymentDetails.paymentMethod;
        break;
      }
      case UpdateTargetEquipTrait: {
        const updateTargetEquipTrait =
          updateStateData.target as UpdateTargetEquipTrait;
        const traitDataEquipTrait = await this.getTrait(
          updateTargetEquipTrait.traitAccount
        );
        if (traitDataEquipTrait.equipPaymentDetails === null) {
          console.log(
            `equip trait payment details are null for ${updateTargetEquipTrait.traitAccount.toString()}`
          );
          return txns;
        }
        paymentMethodData =
          traitDataEquipTrait.equipPaymentDetails.paymentMethodData;
        paymentMethodAddress =
          traitDataEquipTrait.equipPaymentDetails.paymentMethodAddress;
        break;
      }
      case UpdateTargetRemoveTrait: {
        const updateTargetRemoveTrait =
          updateStateData.target as UpdateTargetRemoveTrait;
        const traitDataRemoveTrait = await this.getTrait(
          updateTargetRemoveTrait.traitAccount
        );
        if (traitDataRemoveTrait.removePaymentDetails === null) {
          console.log(
            `remove trait payment details are null for ${updateTargetRemoveTrait.traitAccount.toString()}`
          );
          return txns;
        }

        paymentMethodData =
          traitDataRemoveTrait.removePaymentDetails.paymentMethodData;
        paymentMethodAddress =
          traitDataRemoveTrait.removePaymentDetails.paymentMethodAddress;
        break;
      }
      default:
        throw new Error(`update target unsupported: ${updateStateData.target}`);
    }

    // if fungible
    if (paymentMethodData.assetClass instanceof FungiblePaymentAssetClass) {
      if (paymentMethodData.action instanceof BurnPaymentAction) {
        const burnAccounts: BurnPaymentAccounts = {
          avatar: updateStateData.avatar,
          authority: accounts.authority,
          paymentMethod: paymentMethodAddress,
          paymentMint: paymentMethodData.assetClass.mint,
        };
        const tx = await this.burnPayment(burnAccounts, {
          amount: args.amount,
          updateTarget: args.updateTarget,
        });
        txns.push(tx);
      }
      if (paymentMethodData.action instanceof TransferPaymentAction) {
        const transferAccounts: TransferPaymentAccounts = {
          avatar: updateStateData.avatar,
          authority: accounts.authority,
          paymentMethod: paymentMethodAddress,
          paymentMint: paymentMethodData.assetClass.mint,
        };

        const tx = await this.transferPayment(transferAccounts, {
          amount: args.amount,
          updateTarget: args.updateTarget,
        });
        txns.push(tx);
      }
    }

    // if non fungible
    if (paymentMethodData.assetClass instanceof NonFungiblePaymentAssetClass) {
      if (!accounts.paymentMint) {
        throw new Error(
          `paymentMint argument required if payForUpdate on a Non Fungible Asset Class`
        );
      }

      if (!args.verifyPaymentMintArgs) {
        throw new Error(
          `verifyPaymentArgs required if payForUpdate on a Non Fungible Asset Class`
        );
      }

      // skip creating this tx if its already verified
      const verified = await this.getVerifiedPaymentMint(
        verifiedPaymentMintPDA(paymentMethodAddress, accounts.paymentMint!)
      );
      if (!verified) {
        // create the verify mint transaction, must be ran before actionTree transactions
        const verifyPaymentMintAccounts: VerifyPaymentMintAccounts = {
          payer: accounts.authority,
          paymentMethod: paymentMethodAddress,
          paymentMint: accounts.paymentMint!,
        };

        const verifyPaymentMintArgs: VerifyPaymentMintArgs = {
          root: args.verifyPaymentMintArgs.root,
          leafIndex: args.verifyPaymentMintArgs.leafIndex,
          proof: args.verifyPaymentMintArgs.proof,
        };

        const verifyTx = await this.verifyPaymentMint(
          verifyPaymentMintAccounts,
          verifyPaymentMintArgs
        );
        txns.push(verifyTx);
      }

      if (paymentMethodData.action instanceof BurnPaymentAction) {
        const burnPaymentTreeAccounts: BurnPaymentTreeAccounts = {
          avatar: updateStateData.avatar,
          paymentMethod: paymentMethodAddress,
          paymentMint: accounts.paymentMint!,
          authority: accounts.authority,
        };
        const tx = await this.burnPaymentTree(burnPaymentTreeAccounts, {
          amount: args.amount,
          updateTarget: args.updateTarget,
        });
        txns.push(tx);
      }

      if (paymentMethodData.action instanceof TransferPaymentAction) {
        const transferPaymentTreeAccounts: TransferPaymentTreeAccounts = {
          avatar: updateStateData.avatar,
          paymentMethod: paymentMethodAddress,
          paymentMint: accounts.paymentMint!,
          authority: accounts.authority,
        };

        const tx = await this.transferPaymentTree(transferPaymentTreeAccounts, {
          amount: args.amount,
          updateTarget: args.updateTarget,
        });
        txns.push(tx);
      }
    }

    // set same payer for all transactions
    for (const tx of txns) {
      await this.setPayer(tx, accounts.authority);
    }

    return txns;
  }

  async transferPayment(
    accounts: TransferPaymentAccounts,
    args: TransferPaymentArgs
  ): Promise<anchor.web3.Transaction> {
    const avatarData = await this.getAvatar(accounts.avatar);

    const avatarAuthority = await this.getNftHolder(
      this.provider.connection,
      avatarData.mint
    );

    const paymentMethodData = await this.getPaymentMethod(
      accounts.paymentMethod
    );

    const updateState = updateStatePDA(accounts.avatar, args.updateTarget);

    const paymentSource = splToken.getAssociatedTokenAddressSync(
      accounts.paymentMint,
      avatarAuthority
    );
    const paymentDestination = splToken.getAssociatedTokenAddressSync(
      accounts.paymentMint,
      (paymentMethodData.action as TransferPaymentAction).treasury
    );

    const initDestinationAtaIx =
      splToken.createAssociatedTokenAccountIdempotentInstruction(
        this.provider.publicKey,
        paymentDestination,
        (paymentMethodData.action as TransferPaymentAction).treasury,
        accounts.paymentMint,
        splToken.TOKEN_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID
      );

    const tx = await this.program.methods
      .transferPayment(args)
      .preInstructions([initDestinationAtaIx])
      .accounts({
        updateState: updateState,
        paymentMethod: accounts.paymentMethod,
        paymentMint: accounts.paymentMint,
        paymentSource: paymentSource,
        paymentDestination: paymentDestination,
        authority: accounts.authority,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async burnPayment(
    accounts: TransferPaymentAccounts,
    args: TransferPaymentArgs
  ): Promise<anchor.web3.Transaction> {
    const avatarData = await this.getAvatar(accounts.avatar);

    const avatarAuthority = await this.getNftHolder(
      this.provider.connection,
      avatarData.mint
    );

    const updateState = updateStatePDA(accounts.avatar, args.updateTarget);

    const paymentSource = splToken.getAssociatedTokenAddressSync(
      accounts.paymentMint,
      avatarAuthority
    );

    const tx = await this.program.methods
      .burnPayment(args)
      .accounts({
        updateState: updateState,
        paymentMethod: accounts.paymentMethod,
        paymentMint: accounts.paymentMint,
        paymentSource: paymentSource,
        authority: accounts.authority,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async addPaymentMintToPaymentMethod(
    accounts: AddPaymentMintToPaymentMethodAccounts
  ): Promise<anchor.web3.Transaction> {
    const paymentMethodData = await this.getPaymentMethod(
      accounts.paymentMethod
    );
    const paymentMethodMints = (
      paymentMethodData.assetClass as NonFungiblePaymentAssetClass
    ).mints;
    if (paymentMethodMints === undefined) {
      throw new Error(
        `Could Not Parse paymentMethodMints for: ${paymentMethodData}`
      );
    }

    const avatarClassData = await this.getAvatarClass(
      paymentMethodData.avatarClass
    );

    const avatarClassMintAta = splToken.getAssociatedTokenAddressSync(
      avatarClassData.mint,
      accounts.authority
    );

    const tx = await this.program.methods
      .addPaymentMintPaymentMethod()
      .accounts({
        paymentMint: accounts.paymentMint,
        paymentMethod: accounts.paymentMethod,
        paymentMints: paymentMethodMints,
        avatarClass: paymentMethodData.avatarClass,
        avatarClassMintAta: avatarClassMintAta,
        authority: accounts.authority,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async burnPaymentTree(
    accounts: BurnPaymentTreeAccounts,
    args: BurnPaymentTreeArgs
  ): Promise<anchor.web3.Transaction> {
    const updateState = updateStatePDA(accounts.avatar, args.updateTarget);

    const avatarData = await this.getAvatar(accounts.avatar);

    const avatarOwner = await this.getNftHolder(
      this.provider.connection,
      avatarData.mint
    );

    const paymentSource = splToken.getAssociatedTokenAddressSync(
      accounts.paymentMint,
      avatarOwner
    );

    const verifiedPaymentMint = verifiedPaymentMintPDA(
      accounts.paymentMethod,
      accounts.paymentMint
    );

    const tx = await this.program.methods
      .burnPaymentTree(args)
      .accounts({
        updateState: updateState,
        paymentMethod: accounts.paymentMethod,
        paymentMint: accounts.paymentMint,
        verifiedPaymentMint: verifiedPaymentMint,
        paymentSource: paymentSource,
        authority: accounts.authority,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async transferPaymentTree(
    accounts: TransferPaymentTreeAccounts,
    args: TransferPaymentTreeArgs
  ): Promise<anchor.web3.Transaction> {
    const updateState = updateStatePDA(accounts.avatar, args.updateTarget);

    const avatarData = await this.getAvatar(accounts.avatar);

    const avatarOwner = await this.getNftHolder(
      this.provider.connection,
      avatarData.mint
    );

    const paymentSource = splToken.getAssociatedTokenAddressSync(
      accounts.paymentMint,
      avatarOwner
    );

    const paymentMethodData = await this.getPaymentMethod(
      accounts.paymentMethod
    );
    const treasury = (paymentMethodData.action as TransferPaymentAction)
      .treasury;
    if (treasury === undefined) {
      throw new Error(`Could Not Find Treasury for ${paymentMethodData}`);
    }

    const paymentDestination = splToken.getAssociatedTokenAddressSync(
      accounts.paymentMint,
      treasury
    );
    const createPaymentDestinationAtaIx =
      splToken.createAssociatedTokenAccountIdempotentInstruction(
        accounts.authority,
        paymentDestination,
        treasury,
        accounts.paymentMint,
        splToken.TOKEN_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID
      );

    const verifiedPaymentMint = verifiedPaymentMintPDA(
      accounts.paymentMethod,
      accounts.paymentMint
    );

    const tx = await this.program.methods
      .transferPaymentTree(args)
      .preInstructions([createPaymentDestinationAtaIx])
      .accounts({
        updateState: updateState,
        paymentMethod: accounts.paymentMethod,
        paymentMint: accounts.paymentMint,
        verifiedPaymentMint: verifiedPaymentMint,
        paymentSource: paymentSource,
        paymentDestination: paymentDestination,
        authority: accounts.authority,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async updateClassVariantAuthority(
    accounts: UpdateClassVariantAuthorityAccounts,
    args: UpdateClassVariantAuthorityArgs
  ): Promise<anchor.web3.Transaction> {
    if (args.newVariantOptionIds.length !== args.variantIds.length) {
      throw new Error(`variant ids and options length mismatch`);
    }

    const avatarData = await this.getAvatar(accounts.avatar);

    const avatarClassData = await this.getAvatarClass(avatarData.avatarClass);

    const avatarClasAuthorityAta = splToken.getAssociatedTokenAddressSync(
      avatarClassData.mint,
      accounts.authority
    );

    const tx = new anchor.web3.Transaction();
    for (let i = 0; i < args.variantIds.length; i++) {
      // if variant is already selected on the avatar, just skip over it
      const alreadySelected = avatarData.variants.some((variant) => {
        variant.optionId === args.newVariantOptionIds[i];
      });
      if (alreadySelected) {
        continue;
      }

      const ixArgs = {
        variantId: args.variantIds[i],
        newVariantOptionId: args.newVariantOptionIds[i],
      };

      const ix = await this.program.methods
        .updateClassVariantAuthority(ixArgs)
        .accounts({
          avatarClass: avatarData.avatarClass,
          avatarClassMintAta: avatarClasAuthorityAta,
          avatar: accounts.avatar,
          authority: accounts.authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction();
      tx.add(ix);
    }

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async updateTraitVariantAuthority(
    accounts: UpdateTraitVariantAuthorityAccounts,
    args: UpdateTraitVariantAuthorityArgs
  ): Promise<anchor.web3.Transaction> {
    const avatarData = await this.getAvatar(accounts.avatar);

    const avatarClassData = await this.getAvatarClass(avatarData.avatarClass);

    const avatarClassAuthorityAta = splToken.getAssociatedTokenAddressSync(
      avatarClassData.mint,
      accounts.authority
    );

    const trait = traitPDA(avatarData.avatarClass, accounts.traitMint);

    const tx = await this.program.methods
      .updateTraitVariantAuthority(args)
      .accounts({
        avatar: accounts.avatar,
        avatarClass: avatarData.avatarClass,
        avatarClassMintAta: avatarClassAuthorityAta,
        traitAccount: trait,
        authority: accounts.authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    await this.setPayer(tx, accounts.authority);

    return tx;
  }

  async verifyPaymentMint(
    accounts: VerifyPaymentMintAccounts,
    args: VerifyPaymentMintArgs
  ): Promise<anchor.web3.Transaction> {
    const verifiedPaymentMint = verifiedPaymentMintPDA(
      accounts.paymentMethod,
      accounts.paymentMint
    );

    const paymentMethodData = await this.getPaymentMethod(
      accounts.paymentMethod
    );
    const paymentMints = (
      paymentMethodData.assetClass as NonFungiblePaymentAssetClass
    ).mints;
    if (paymentMints === undefined) {
      throw new Error(`Could Not Find paymentMints from ${paymentMethodData}`);
    }

    const proofAsRemainingAccounts = [];
    for (const node of args.proof) {
      const nodeAccount = {
        pubkey: new anchor.web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
      };
      proofAsRemainingAccounts.push(nodeAccount);
    }

    const ixArgs = {
      root: Array.from(JSON.parse(JSON.stringify(args.root))) as number[], // TODO: not sure why I have to do this
      leafIndex: args.leafIndex,
    };

    const tx = await this.program.methods
      .verifyPaymentMint(ixArgs)
      .accounts({
        paymentMint: accounts.paymentMint,
        paymentMethod: accounts.paymentMethod,
        paymentMints: paymentMints,
        verifiedPaymentMint: verifiedPaymentMint,
        payer: accounts.payer,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .transaction();

    await this.setPayer(tx, accounts.payer);

    return tx;
  }

  async verifyPaymentMintTest(
    accounts: VerifyPaymentMintTestAccounts,
    args: VerifyPaymentMintArgs
  ): Promise<anchor.web3.Transaction> {
    const proofAsRemainingAccounts = [];
    for (const node of args.proof) {
      const nodeAccount = {
        pubkey: new anchor.web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
      };
      proofAsRemainingAccounts.push(nodeAccount);
    }

    const ixArgs = {
      root: Array.from(JSON.parse(JSON.stringify(args.root))) as number[], // TODO: not sure why I have to do this
      leafIndex: args.leafIndex,
    };

    const tx = await this.program.methods
      .verifyPaymentMintTest(ixArgs)
      .accounts({
        paymentMint: accounts.paymentMint,
        paymentMints: accounts.paymentMints,
        payer: accounts.payer,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .transaction();

    await this.setPayer(tx, accounts.payer);

    return tx;
  }

  async getAvatar(
    avatar: anchor.web3.PublicKey,
    getInProgressUpdates?: boolean
  ): Promise<Avatar> {
    const avatarDataRaw = await this.program.account.avatar.fetch(avatar);

    const traits: TraitData[] = [];
    for (const td of avatarDataRaw.traits) {
      const vs: VariantOption[] = [];
      for (const vsRaw of td.variantSelection) {
        let tg = null;
        if (vsRaw.traitGate) {
          tg = {
            operator: { and: {} },
            traits: vsRaw.traitGate.traits,
          };
        }

        vs.push({
          variantId: vsRaw.variantId,
          optionId: vsRaw.optionId,
          paymentDetails: vsRaw.paymentDetails,
          traitGate: tg,
        });
      }
      traits.push({
        attributeIds: td.attributeIds,
        traitAddress: td.traitAddress,
        variantSelection: vs,
      });
    }

    const variants: VariantOption[] = [];
    for (const variant of avatarDataRaw.variants) {
      let tg = null;
      if (variant.traitGate) {
        tg = {
          operator: { and: {} },
          traits: variant.traitGate.traits,
        };
      }

      variants.push({
        variantId: variant.variantId,
        optionId: variant.optionId,
        paymentDetails: variant.paymentDetails,
        traitGate: tg,
      });
    }

    const avatarData = new Avatar(
      avatar,
      avatarDataRaw.avatarClass,
      avatarDataRaw.mint,
      "",
      traits,
      variants
    );

    if (getInProgressUpdates) {
      await avatarData.inProgressUpdates(this);
    }

    return avatarData;
  }

  async getAvatarClass(
    avatarClassAddress: anchor.web3.PublicKey
  ): Promise<AvatarClass> {
    const avatarClassData = await this.program.account.avatarClass.fetch(
      avatarClassAddress
    );

    const variantMetadata: VariantMetadata[] = [];
    for (const vmRaw of avatarClassData.variantMetadata) {
      const options: VariantOption[] = [];
      for (const optRaw of vmRaw.options) {
        let tg = null;
        if (optRaw.traitGate) {
          tg = {
            operator: { and: {} },
            traits: optRaw.traitGate.traits,
          };
        }

        options.push({
          variantId: optRaw.variantId,
          optionId: optRaw.optionId,
          paymentDetails: optRaw.paymentDetails,
          traitGate: tg,
        });
      }
      const vm: VariantMetadata = {
        name: vmRaw.name,
        id: vmRaw.id,
        status: vmRaw.status,
        options: options,
      };
      variantMetadata.push(vm);
    }

    const avatarClass = new AvatarClass(
      avatarClassData.mint,
      avatarClassData.traitIndex,
      new anchor.BN(avatarClassData.paymentIndex),
      avatarClassData.attributeMetadata,
      variantMetadata,
      avatarClassData.globalRenderingConfigUri
    );

    return avatarClass;
  }

  async getTrait(trait: anchor.web3.PublicKey): Promise<Trait> {
    const traitData = await this.program.account.trait.fetch(trait);

    const variantMetadata: VariantMetadata[] = [];
    for (const vmRaw of traitData.variantMetadata) {
      const options: VariantOption[] = [];
      for (const optRaw of vmRaw.options) {
        let tg = null;
        if (optRaw.traitGate) {
          tg = {
            operator: { and: {} },
            traits: optRaw.traitGate.traits,
          };
        }

        options.push({
          variantId: optRaw.variantId,
          optionId: optRaw.optionId,
          paymentDetails: optRaw.paymentDetails,
          traitGate: tg,
        });
      }
      const vm: VariantMetadata = {
        name: vmRaw.name,
        id: vmRaw.id,
        status: vmRaw.status,
        options: options,
      };
      variantMetadata.push(vm);
    }

    // get expanded payment details
    let equipPaymentDetailsExpanded: PaymentDetailsExpanded | null = null;
    if (traitData.equipPaymentDetails !== null) {
      const equipPaymentMethodAddr = new anchor.web3.PublicKey(
        traitData.equipPaymentDetails.paymentMethod
      );
      const equipPaymentMethodData = await this.getPaymentMethod(
        equipPaymentMethodAddr
      );
      equipPaymentDetailsExpanded = {
        paymentMethodAddress: equipPaymentMethodAddr,
        paymentMethodData: equipPaymentMethodData,
        amount: traitData.equipPaymentDetails.amount,
      };
    }
    let removePaymentDetailsExpanded: PaymentDetailsExpanded | null = null;
    if (traitData.removePaymentDetails !== null) {
      const removePaymentMethodAddr = new anchor.web3.PublicKey(
        traitData.removePaymentDetails.paymentMethod
      );
      const removePaymentMethodData = await this.getPaymentMethod(
        removePaymentMethodAddr
      );
      removePaymentDetailsExpanded = {
        paymentMethodAddress: removePaymentMethodAddr,
        paymentMethodData: removePaymentMethodData,
        amount: traitData.removePaymentDetails.amount,
      };
    }

    return new Trait(
      new anchor.web3.PublicKey(trait),
      traitData.avatarClass,
      traitData.traitMint,
      traitData.attributeIds,
      traitData.componentUri,
      traitData.status,
      variantMetadata,
      equipPaymentDetailsExpanded,
      removePaymentDetailsExpanded
    );
  }

  async getUpdateState(
    updateState: anchor.web3.PublicKey
  ): Promise<UpdateState | null> {
    let updateStateRaw;
    try {
      updateStateRaw = await this.program.account.updateState.fetch(
        updateState
      );
    } catch (_e) {
      return null;
    }

    let currentPaymentDetails: PaymentDetails | null = null;
    if (updateStateRaw.currentPaymentDetails !== null) {
      currentPaymentDetails = {
        paymentMethod: updateStateRaw.currentPaymentDetails.paymentMethod,
        amount: new anchor.BN(updateStateRaw.currentPaymentDetails.amount),
      };
    }

    let requiredPaymentDetails: PaymentDetails | null = null;
    if (updateStateRaw.requiredPaymentDetails !== null) {
      requiredPaymentDetails = {
        paymentMethod: updateStateRaw.requiredPaymentDetails.paymentMethod,
        amount: new anchor.BN(updateStateRaw.requiredPaymentDetails.amount),
      };
    }

    return new UpdateState(
      updateStateRaw.initialized,
      updateStateRaw.avatar,
      currentPaymentDetails,
      requiredPaymentDetails,
      parseUpdateTarget(updateStateRaw.target)
    );
  }

  async getPaymentMethod(
    paymentMethod: anchor.web3.PublicKey
  ): Promise<PaymentMethod> {
    const paymentMethodRaw = await this.program.account.paymentMethod.fetch(
      paymentMethod
    );

    return new PaymentMethod(
      new anchor.BN(paymentMethodRaw.index),
      paymentMethodRaw.avatarClass,
      parsePaymentAssetClass(paymentMethodRaw.assetClass),
      parsePaymentAction(paymentMethodRaw.action)
    );
  }

  async getVerifiedPaymentMint(
    verifiedPda: anchor.web3.PublicKey
  ): Promise<VerifiedPaymentMint | null> {
    try {
      const verifiedRaw = await this.program.account.verifiedPaymentMint.fetch(
        verifiedPda
      );

      return {
        paymentMethod: new anchor.web3.PublicKey(verifiedRaw.paymentMethod),
        paymentMint: new anchor.web3.PublicKey(verifiedRaw.paymentMint),
      };
    } catch (_e) {
      return null;
    }
  }

  async getNftHolder(
    connection: anchor.web3.Connection,
    mint: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    // should only return 1 account because 'mint' is an nft
    const response = await connection.getTokenLargestAccounts(mint);
    // get data and return owner of the token account
    const tokenAccountData = await splToken.getAccount(
      connection,
      response.value[0].address
    );
    return tokenAccountData.owner;
  }

  async getAvatarRenderConfig(
    avatar: anchor.web3.PublicKey,
    traitMintOverrides: anchor.web3.PublicKey[] = [],
    variantOverrides: Variant[] = []
  ): Promise<AvatarRenderConfig> {
    // get avatar data
    const avatarData = await this.getAvatar(avatar);

    // get avatarClass data
    const avatarClassRenderConfig = await this.getAvatarClassRenderConfig(
      avatarData.avatarClass
    );

    // set global variant overrides
    for (const variantOverride of variantOverrides) {
      for (const primaryVariant of avatarData.variants) {
        // find the matching variant for the override and update its value
        if (variantOverride.variantId === primaryVariant.variantId) {
          primaryVariant.optionId = variantOverride.optionId;
        }
      }
    }

    // only send the variant id and option id to the render code
    const shortVariantData: Variant[] = [];
    for (const v of avatarData.variants) {
      shortVariantData.push({ variantId: v.variantId, optionId: v.optionId });
    }

    // set trait overrides
    const traitOverrideData: {
      attributeIds: number[];
      trait: anchor.web3.PublicKey;
    }[] = [];
    for (const traitMintOverride of traitMintOverrides) {
      const traitOverride = traitPDA(avatarData.avatarClass, traitMintOverride);
      const traitData = await this.program.account.trait.fetch(traitOverride);

      traitOverrideData.push({
        attributeIds: traitData.attributeIds,
        trait: traitOverride,
      });
    }

    // get equipped traits
    let equippedTraits: TraitRenderConfig[] = [];
    const traitVariants: Variant[] = [];
    for (const traitData of avatarData.traits) {
      // check if there's an override for this trait
      let overridden = false;
      for (const override of traitOverrideData) {
        for (const attributeId of traitData.attributeIds) {
          if (override.attributeIds.includes(attributeId)) {
            const traitRenderConfig = await this.getTraitRenderConfig(
              override.trait
            );
            equippedTraits.push(traitRenderConfig);
            overridden = true;
          }

          // right now just get the first option for all variant ids for the override trait
          const overrideTraitData = await this.getTrait(override.trait);
          const overrideVariants: Variant[] =
            overrideTraitData.variantMetadata.map(
              (vm) => (vm.id, vm.options[0])
            );
          traitVariants.push(...overrideVariants);
        }
      }

      // if trait is equipped in this attribute and there's no override
      if (traitData.traitAddress && !overridden) {
        try {
          const traitRenderConfig = await this.getTraitRenderConfig(
            traitData.traitAddress
          );
          equippedTraits.push(traitRenderConfig);

          // grab variant selection
          const variantSelection = traitData.variantSelection.map(
            ({ variantId, optionId }) => ({ variantId, optionId })
          );
          traitVariants.push(...variantSelection);
        } catch (e) {
          throw new Error(e as string);
        }
      }
    }

    // dedup equipped traits list
    // there would be duplicates if an override trait has multiple attribute ids
    equippedTraits = [...new Set(equippedTraits)];

    // set local variant overrides
    for (const variantOverride of variantOverrides) {
      for (const traitVariant of traitVariants) {
        if (variantOverride.variantId === traitVariant.variantId) {
          traitVariant.optionId = variantOverride.optionId;
        }
      }
    }

    // create full
    const avatarRenderConfig: AvatarRenderConfig = {
      avatarClass: avatarData.avatarClass.toString(),
      avatar: avatar.toString(),
      stages: avatarClassRenderConfig.stages,
      adjustmentOperations: avatarClassRenderConfig.adjustmentOperations,
      variants: {
        primaryVariants: shortVariantData.concat(traitVariants),
      },
      traits: equippedTraits,
    };

    return avatarRenderConfig;
  }

  private async getAvatarClassRenderConfig(
    avatarClass: anchor.web3.PublicKey
  ): Promise<AvatarClassRenderConfig> {
    const avatarClassData = await this.program.account.avatarClass.fetch(
      avatarClass
    );

    const response = await (
      await fetch(avatarClassData.globalRenderingConfigUri)
    ).json();
    const stageRenderConfig: StageRenderConfig[] = JSON.parse(
      JSON.stringify(response.stages)
    );

    const avatarClassRenderConfig: AvatarClassRenderConfig = {
      stages: stageRenderConfig,
      variantReference: response.variantReference,
      adjustmentOperations: response.adjustmentOperations,
    };

    return avatarClassRenderConfig;
  }

  private async getTraitRenderConfig(
    traitAccount: anchor.web3.PublicKey
  ): Promise<TraitRenderConfig> {
    const traitData = await this.program.account.trait.fetch(traitAccount);
    const traitComponents = await this.getTraitComponentRenderConfig(
      traitData.componentUri
    );

    const traitRenderConfig: TraitRenderConfig = {
      trait: traitAccount.toString(),
      name: traitComponents.name,
      isAvatarSubject: traitComponents.isAvatarSubject,
      components: traitComponents.components,
    };

    return traitRenderConfig;
  }

  private async getTraitComponentRenderConfig(
    componentUri: string
  ): Promise<any> {
    const response = await fetch(componentUri);
    const traitComponents = await response.json();
    return JSON.parse(JSON.stringify(traitComponents));
  }

  private async setPayer(
    tx: anchor.web3.Transaction,
    payer: anchor.web3.PublicKey
  ) {
    const bh = (await this.provider.connection.getLatestBlockhash()).blockhash;
    tx.recentBlockhash = bh;
    tx.feePayer = payer;
  }
}

export function avatarClassPDA(
  avatarClassMint: anchor.web3.PublicKey
): anchor.web3.PublicKey {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(AVATAR_CLASS_PREFIX), avatarClassMint.toBuffer()],
    Constants.ProgramIds.AVATAR_ID
  )[0];
}

export function avatarPDA(
  avatarMint: anchor.web3.PublicKey,
  avatarClass: anchor.web3.PublicKey
): anchor.web3.PublicKey {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(AVATAR_PREFIX), avatarClass.toBuffer(), avatarMint.toBuffer()],
    Constants.ProgramIds.AVATAR_ID
  )[0];
}

export function traitPDA(
  avatarClass: anchor.web3.PublicKey,
  traitMint: anchor.web3.PublicKey
): anchor.web3.PublicKey {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(TRAIT_PREFIX), avatarClass.toBuffer(), traitMint.toBuffer()],
    Constants.ProgramIds.AVATAR_ID
  )[0];
}

export function paymentMethodPDA(
  avatarClass: anchor.web3.PublicKey,
  paymentIndex: anchor.BN
): anchor.web3.PublicKey {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(PAYMENT_METHOD_PREFIX),
      avatarClass.toBuffer(),
      paymentIndex.toArrayLike(Buffer, "le", 8),
    ],
    Constants.ProgramIds.AVATAR_ID
  )[0];
}

export function updateStatePDA(
  avatar: anchor.web3.PublicKey,
  updateTarget: UpdateTarget
): anchor.web3.PublicKey {
  const hash = hashUpdateTarget(updateTarget);
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(UPDATE_STATE_PREFIX), avatar.toBuffer(), hash],
    Constants.ProgramIds.AVATAR_ID
  )[0];
}

export function verifiedPaymentMintPDA(
  paymentMethod: anchor.web3.PublicKey,
  paymentMint: anchor.web3.PublicKey
): anchor.web3.PublicKey {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(VERIFIED_PAYMENT_MINT_PREFIX),
      paymentMethod.toBuffer(),
      paymentMint.toBuffer(),
    ],
    Constants.ProgramIds.AVATAR_ID
  )[0];
}

export function traitConflictsPDA(
  avatarClass: anchor.web3.PublicKey,
  traitAccount: anchor.web3.PublicKey
): anchor.web3.PublicKey {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(TRAIT_CONFLICTS_PREFIX),
      avatarClass.toBuffer(),
      traitAccount.toBuffer(),
    ],
    Constants.ProgramIds.AVATAR_ID
  )[0];
}
