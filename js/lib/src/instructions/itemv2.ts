import { web3, BN } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as splToken from "spl-token-latest";
import {
  Program,
  Instruction as SolKitInstruction,
} from "@raindrop-studios/sol-kit";
import {
  MPL_AUTH_RULES_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "../constants/programIds";
import { Constants, Utils } from "../main";
import * as cmp from "@solana/spl-account-compression";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  DeterministicIngredientOutput,
  OutputSelectionArgs,
  OutputSelectionGroup,
  getPackPda,
  getItemClassPda,
  getRecipePda,
  Payment,
  getDeterministicIngredientPda,
  getBuildPermitPda,
  getItemPda,
  getBuildPda,
  PackContents,
  ItemClassOutputMode,
  formatItemClassOutputMode,
} from "../state/itemv2";

export class Instruction extends SolKitInstruction {
  constructor(args: { program: Program.Program }) {
    super(args);
  }

  async createItemClass(
    args: CreateItemClassArgs
  ): Promise<[web3.PublicKey, web3.Keypair[], web3.TransactionInstruction[]]> {
    // create authority mint account and mint some to the creator
    const authorityMint = web3.Keypair.generate();

    // derive item class pda
    const itemClass = getItemClassPda(authorityMint.publicKey);

    const createAuthorityMintAccountIx = await web3.SystemProgram.createAccount(
      {
        programId: splToken.TOKEN_PROGRAM_ID,
        space: splToken.MintLayout.span,
        fromPubkey: this.program.client.provider.publicKey!,
        newAccountPubkey: authorityMint.publicKey,
        lamports:
          await this.program.client.provider.connection.getMinimumBalanceForRentExemption(
            splToken.MintLayout.span
          ),
      }
    );

    // make it an SFT
    const initAuthorityMintIx = splToken.createInitializeMintInstruction(
      authorityMint.publicKey,
      0,
      this.program.client.provider.publicKey!,
      this.program.client.provider.publicKey!
    );

    const destinationAta = splToken.getAssociatedTokenAddressSync(
      authorityMint.publicKey,
      this.program.client.provider.publicKey!
    );

    const createAuthorityMintDestinationIx =
      splToken.createAssociatedTokenAccountIdempotentInstruction(
        this.program.client.provider.publicKey!,
        destinationAta,
        this.program.client.provider.publicKey!,
        authorityMint.publicKey
      );

    const [metadata, _metadataBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        authorityMint.publicKey.toBuffer(),
      ],
      mpl.PROGRAM_ID
    );

    const createAuthorityMintMetadataIx =
      mpl.createCreateMetadataAccountV3Instruction(
        {
          metadata: metadata,
          mint: authorityMint.publicKey,
          mintAuthority: this.program.client.provider.publicKey!,
          payer: this.program.client.provider.publicKey!,
          updateAuthority: this.program.client.provider.publicKey!,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: "ItemsV2 Auth Token",
              symbol: "AUTH",
              uri: "https://foo.com/bar.json",
              sellerFeeBasisPoints: 0,
              creators: null,
              collection: null,
              uses: null,
            },
            collectionDetails: null,
            isMutable: true,
          },
        }
      );

    // mint 3 tokens to the deployer/authority
    const mintAuthorityTokensIx = splToken.createMintToInstruction(
      authorityMint.publicKey,
      destinationAta,
      this.program.client.provider.publicKey!,
      3
    );

    // transfer minting authority to item class
    const transferAuthorityToItemClassIx =
      splToken.createSetAuthorityInstruction(
        authorityMint.publicKey,
        this.program.client.provider.publicKey!,
        splToken.AuthorityType.MintTokens,
        itemClass
      );

    // create merkle tree account
    const items = web3.Keypair.generate();

    const maxDepth = 16;
    const maxBufferSize = 64;

    const treeSpace = cmp.getConcurrentMerkleTreeAccountSize(
      maxDepth,
      maxBufferSize
      //maxDepth // store max depth of tree in the canopy
    );

    const treeLamports =
      await this.program.client.provider.connection.getMinimumBalanceForRentExemption(
        treeSpace
      );

    const createMembersAccountIx = await web3.SystemProgram.createAccount({
      fromPubkey: this.program.client.provider.publicKey!,
      newAccountPubkey: items.publicKey,
      lamports: treeLamports,
      space: treeSpace,
      programId: cmp.PROGRAM_ID,
    });

    const ixArgs = {
      itemClassName: args.itemClassName,
      outputMode: formatItemClassOutputMode(args.outputMode),
    };

    const createItemClassIx = await this.program.client.methods
      .createItemClass(ixArgs)
      .accounts({
        items: items.publicKey,
        itemClass: itemClass,
        itemClassAuthorityMint: authorityMint.publicKey,
        itemClassAuthorityMintAta: destinationAta,
        authority: this.program.client.provider.publicKey!,
        rent: web3.SYSVAR_RENT_PUBKEY,
        accountCompression: cmp.PROGRAM_ID,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return [
      itemClass,
      [items, authorityMint],
      [
        createMembersAccountIx,
        createAuthorityMintAccountIx,
        initAuthorityMintIx,
        createAuthorityMintDestinationIx,
        createAuthorityMintMetadataIx,
        mintAuthorityTokensIx,
        transferAuthorityToItemClassIx,
        createItemClassIx,
      ],
    ];
  }

  async addItemsToItemClass(
    accounts: AddItemsToItemClass
  ): Promise<web3.TransactionInstruction[]> {
    const itemClassData = await this.program.client.account.itemClass.fetch(
      accounts.itemClass
    );
    const itemClassItems = new web3.PublicKey(itemClassData.items);

    const authorityMint = new web3.PublicKey(itemClassData.authorityMint);
    const authorityMintAta = splToken.getAssociatedTokenAddressSync(
      authorityMint,
      this.program.client.provider.publicKey!
    );

    const ixns: web3.TransactionInstruction[] = [];
    for (const itemMint of accounts.itemMints) {
      const ix = await this.program.client.methods
        .addItemToItemClass()
        .accounts({
          itemMint: itemMint,
          itemClass: accounts.itemClass,
          itemClassAuthorityMint: authorityMint,
          itemClassAuthorityMintAta: authorityMintAta,
          items: itemClassItems,
          authority: this.program.client.provider.publicKey!,
          logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
          accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        })
        .instruction();

      ixns.push(ix);
    }

    return ixns;
  }

  async createPack(
    accounts: CreatePackAccounts,
    args: CreatePackArgs
  ): Promise<[web3.TransactionInstruction, web3.PublicKey]> {
    const itemClassData = await this.program.client.account.itemClass.fetch(
      accounts.itemClass
    );

    const authorityMint = new web3.PublicKey(itemClassData.authorityMint);
    const authorityMintAta = splToken.getAssociatedTokenAddressSync(
      authorityMint,
      this.program.client.provider.publicKey!
    );

    const packIndex = new BN((itemClassData.outputMode as any).pack.index);

    const packAccount = getPackPda(accounts.itemClass, packIndex);

    const ix = await this.program.client.methods
      .createPack(args)
      .accounts({
        pack: packAccount,
        itemClass: accounts.itemClass,
        itemClassAuthorityMint: authorityMint,
        itemClassAuthorityMintAta: authorityMintAta,
        authority: this.program.client.provider.publicKey!,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return [ix, packAccount];
  }

  async startBuild(
    accounts: StartBuildAccounts,
    args: StartBuildArgs
  ): Promise<web3.TransactionInstruction> {
    const recipe = getRecipePda(accounts.itemClass, args.recipeIndex);

    const build = getBuildPda(accounts.itemClass, accounts.builder);

    const recipeDataRaw = await this.program.client.account.recipe.fetch(
      recipe
    );

    // if build permit is required create the pda
    let buildPermit: web3.PublicKey | null = null;
    if (recipeDataRaw.buildPermitRequired) {
      buildPermit = getBuildPermitPda(accounts.builder, accounts.itemClass);
    }

    const ix = await this.program.client.methods
      .startBuild(args)
      .accounts({
        build: build,
        recipe: recipe,
        itemClass: accounts.itemClass,
        buildPermit: buildPermit,
        builder: accounts.builder,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix;
  }

  async addIngredient(
    accounts: AddIngredientAccounts,
    args: AddIngredientArgs
  ): Promise<web3.TransactionInstruction[]> {
    const item = getItemPda(accounts.ingredientMint);
    const build = getBuildPda(accounts.itemClass, accounts.builder);

    // detect what type of token we are adding
    const tokenStandard = await Utils.Item.getTokenStandard(
      this.program.client.provider.connection,
      accounts.ingredientMint
    );

    const buildDataRaw = await this.program.client.account.build.fetch(build);

    const recipe = getRecipePda(
      accounts.itemClass,
      new BN(buildDataRaw.recipeIndex as any)
    );

    // get deterministic ingredient pda if applicable
    let deterministicIngredient: web3.PublicKey | null = null;
    for (const rawIngredient of buildDataRaw.ingredients as any[]) {
      const match = (rawIngredient.mints as any[]).some((mintData) =>
        new web3.PublicKey(mintData.mint).equals(accounts.ingredientMint)
      );
      if (match && Boolean(rawIngredient.isDeterministic)) {
        deterministicIngredient = getDeterministicIngredientPda(
          recipe,
          accounts.ingredientMint
        );
      }
    }

    const ixns: web3.TransactionInstruction[] = [];
    if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
      const pNftIxns = await this.addIngredientPnft(
        accounts,
        build,
        item,
        recipe,
        deterministicIngredient
      );
      ixns.push(...pNftIxns);
    } else {
      const ix = await this.addIngredientSpl(
        accounts,
        build,
        item,
        recipe,
        deterministicIngredient,
        args
      );
      ixns.push(ix);
    }

    return ixns;
  }

  private async addIngredientSpl(
    accounts: AddIngredientAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey,
    recipe: web3.PublicKey,
    deterministicIngredient: web3.PublicKey | null,
    args: AddIngredientArgs
  ): Promise<web3.TransactionInstruction> {
    const ingredientSource = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      accounts.builder
    );
    const ingredientDestination = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      build,
      true
    );

    const ix = await this.program.client.methods
      .addIngredientSpl(args)
      .accounts({
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientSource: ingredientSource,
        ingredientDestination: ingredientDestination,
        deterministicIngredient: deterministicIngredient,
        recipe: recipe,
        build: build,
        item: item,
        builder: accounts.builder,
        payer: accounts.payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

    return ix;
  }

  private async addIngredientPnft(
    accounts: AddIngredientAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey,
    recipe: web3.PublicKey,
    deterministicIngredient: web3.PublicKey | null
  ): Promise<web3.TransactionInstruction[]> {
    const [ingredientMetadata, _ingredientMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const ingredientMetadataData = await mpl.Metadata.fromAccountAddress(
      this.program.client.provider.connection,
      ingredientMetadata,
      "confirmed"
    );

    const [ingredientME, _ingredientMEBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("edition"),
        ],
        mpl.PROGRAM_ID
      );

    const ingredientSource = splToken.getAssociatedTokenAddressSync(
      accounts.ingredientMint,
      accounts.builder
    );

    const ingredientDestination = splToken.getAssociatedTokenAddressSync(
      accounts.ingredientMint,
      build,
      true
    );

    const [ingredientSourceTokenRecord, _ingredientSourceTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("token_record"),
          ingredientSource.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [
      ingredientDestinationTokenRecord,
      _ingredientDestinationTokenRecordBump,
    ] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        accounts.ingredientMint.toBuffer(),
        Buffer.from("token_record"),
        ingredientDestination.toBuffer(),
      ],
      mpl.PROGRAM_ID
    );

    // double CU and fee

    const increaseCUIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    const addPriorityFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 5000,
    });

    const ix = await this.program.client.methods
      .addIngredientPnft()
      .accounts({
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientMetadata: ingredientMetadata,
        ingredientEdition: ingredientME,
        deterministicIngredient: deterministicIngredient,
        authRules: ingredientMetadataData.programmableConfig.ruleSet,
        ingredientSource: ingredientSource,
        ingredientSourceTokenRecord: ingredientSourceTokenRecord,
        ingredientDestination: ingredientDestination,
        ingredientDestinationTokenRecord: ingredientDestinationTokenRecord,
        recipe: recipe,
        build: build,
        item: item,
        payer: accounts.payer,
        builder: accounts.builder,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadata: TOKEN_METADATA_PROGRAM_ID,
        authRulesProgram: Constants.ProgramIds.MPL_AUTH_RULES_PROGRAM_ID,
      })
      .instruction();

    return [increaseCUIx, addPriorityFeeIx, ix];
  }

  async verifyIngredient(
    accounts: VerifyIngredientAccounts,
    args: VerifyIngredientArgs
  ): Promise<web3.TransactionInstruction> {
    const ingredientItemClassData =
      await this.program.client.account.itemClass.fetch(
        accounts.ingredientItemClass
      );
    const ingredientItemClassItems = new web3.PublicKey(
      ingredientItemClassData.items
    );

    const build = getBuildPda(accounts.itemClass, accounts.builder);

    const proofAsRemainingAccounts = [];
    for (const node of args.proof) {
      const nodeAccount = {
        pubkey: new web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
      };
      proofAsRemainingAccounts.push(nodeAccount);
    }

    const ixArgs = {
      root: args.root,
      leafIndex: args.leafIndex,
    };

    const ix = await this.program.client.methods
      .verifyIngredient(ixArgs)
      .accounts({
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientItemClassItems: ingredientItemClassItems,
        build: build,
        payer: accounts.payer,
        systemProgram: web3.SystemProgram.programId,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async verifyIngredientTest(
    accounts: VerifyIngredientTestAccounts,
    args: VerifyIngredientArgs
  ): Promise<web3.TransactionInstruction> {
    const ingredientItemClassData =
      await this.program.client.account.itemClass.fetch(
        accounts.ingredientItemClass
      );
    const ingredientItemClassItems = new web3.PublicKey(
      ingredientItemClassData.items
    );

    const proofAsRemainingAccounts = [];
    for (const node of args.proof) {
      const nodeAccount = {
        pubkey: new web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
      };
      proofAsRemainingAccounts.push(nodeAccount);
    }

    const ixArgs = {
      root: Buffer.from(args.root.toString()),
      leafIndex: args.leafIndex,
    };

    const ix = await this.program.client.methods
      .verifyIngredientTest(ixArgs)
      .accounts({
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientItemClassItems: ingredientItemClassItems,
        payer: accounts.payer,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async completeBuildItem(
    accounts: CompleteBuildItemAccounts,
    args: CompleteBuildItemArgs
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );

    const itemClass = new web3.PublicKey(buildData.itemClass);

    const itemClassData = await this.program.client.account.itemClass.fetch(
      itemClass
    );
    const itemClassItems = new web3.PublicKey(itemClassData.items);

    const proofAsRemainingAccounts = [];
    for (const node of args.proof) {
      const nodeAccount = {
        pubkey: new web3.PublicKey(node),
        isSigner: false,
        isWritable: false,
      };
      proofAsRemainingAccounts.push(nodeAccount);
    }

    // if build permit is required create the pda
    let buildPermit: web3.PublicKey | null = null;
    if (buildData.buildPermitInUse) {
      buildPermit = getBuildPermitPda(
        new web3.PublicKey(buildData.builder),
        itemClass
      );
    }

    const ixArgs = {
      root: args.root,
      leafIndex: args.leafIndex,
    };

    const ix = await this.program.client.methods
      .completeBuildItem(ixArgs)
      .accounts({
        itemMint: accounts.itemMint,
        itemClass: itemClass,
        itemClassItems: itemClassItems,
        buildPermit: buildPermit,
        build: accounts.build,
        payer: accounts.payer,
        systemProgram: web3.SystemProgram.programId,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async completeBuildPack(
    accounts: CompleteBuildPackAccounts,
    args: CompleteBuildPackArgs
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );

    const itemClass = new web3.PublicKey(buildData.itemClass);

    // if build permit is required create the pda
    let buildPermit: web3.PublicKey | null = null;
    if (buildData.buildPermitInUse) {
      buildPermit = getBuildPermitPda(
        new web3.PublicKey(buildData.builder),
        itemClass,
      );
    }

    const ixArgs = {
      packContents: args.packContents,
      packContentsHashNonce: args.packContents.nonce,
    };

    const ix = await this.program.client.methods
      .completeBuildPack(ixArgs)
      .accounts({
        pack: accounts.pack,
        itemClass: itemClass,
        buildPermit: buildPermit,
        build: accounts.build,
        payer: accounts.payer,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix;
  }

  async completeBuildPresetOnly(
    accounts: CompleteBuildPresetOnlyAccounts
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );

    const itemClass = new web3.PublicKey(buildData.itemClass);

    // if build permit is required create the pda
    let buildPermit: web3.PublicKey | null = null;
    if (buildData.buildPermitInUse) {
      buildPermit = getBuildPermitPda(
        new web3.PublicKey(buildData.builder),
        itemClass,
      );
    }

    const ix = await this.program.client.methods
      .completeBuildPresetOnly()
      .accounts({
        itemClass: itemClass,
        buildPermit: buildPermit,
        build: accounts.build,
        payer: accounts.payer,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix;
  }

  async receiveItem(
    accounts: ReceiveItemAccounts
  ): Promise<web3.TransactionInstruction[][]> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );

    const ixnGroups: web3.TransactionInstruction[][] = [];
    for (const item of (buildData.output as any).items) {
      // if received already, dont send again
      if (item.received === true) {
        continue;
      }

      const itemMint = new web3.PublicKey(item.mint);

      // detect what type of token we are adding
      const tokenStandard = await Utils.Item.getTokenStandard(
        this.program.client.provider.connection,
        new web3.PublicKey(item.mint)
      );

      if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
        const pNftIxns = await this.receiveItemPNft(
          accounts.build,
          accounts.payer,
          itemMint
        );
        ixnGroups.push(pNftIxns);
      } else {
        const splIx = await this.receiveItemSpl(
          accounts.build,
          accounts.payer,
          itemMint
        );
        ixnGroups.push([splIx]);
      }
    }

    return ixnGroups;
  }

  private async receiveItemPNft(
    build: web3.PublicKey,
    payer: web3.PublicKey,
    itemMint: web3.PublicKey
  ): Promise<web3.TransactionInstruction[]> {
    const buildData = await this.program.client.account.build.fetch(build);

    const itemClass = new web3.PublicKey(buildData.itemClass);
    const builder = new web3.PublicKey(buildData.builder);

    const [itemMetadata, _itemMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );
    const itemMetadataData = await mpl.Metadata.fromAccountAddress(
      this.program.client.provider.connection,
      itemMetadata,
      "confirmed"
    );

    const [itemME, _itemMEBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        itemMint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

    const itemSource = splToken.getAssociatedTokenAddressSync(
      itemMint,
      itemClass,
      true
    );
    const itemDestination = await splToken.getAssociatedTokenAddress(
      itemMint,
      builder
    );

    const [itemSourceTokenRecord, _itemSourceTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMint.toBuffer(),
          Buffer.from("token_record"),
          itemSource.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [itemDestinationTokenRecord, _itemDestinationTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMint.toBuffer(),
          Buffer.from("token_record"),
          itemDestination.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    // double CU and fee

    const increaseCUIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    const addPriorityFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 5000,
    });

    const ix = await this.program.client.methods
      .receiveItemPnft()
      .accounts({
        itemMint: itemMint,
        itemMetadata: itemMetadata,
        itemEdition: itemME,
        authRules: itemMetadataData.programmableConfig.ruleSet,
        itemSource: itemSource,
        itemSourceTokenRecord: itemSourceTokenRecord,
        itemDestination: itemDestination,
        itemDestinationTokenRecord: itemDestinationTokenRecord,
        itemClass: itemClass,
        build: build,
        builder: builder,
        payer: payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadata: TOKEN_METADATA_PROGRAM_ID,
        authRulesProgram: MPL_AUTH_RULES_PROGRAM_ID,
      })
      .instruction();

    return [increaseCUIx, addPriorityFeeIx, ix];
  }

  private async receiveItemSpl(
    build: web3.PublicKey,
    payer: web3.PublicKey,
    itemMint: web3.PublicKey
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(build);

    const itemClass = new web3.PublicKey(buildData.itemClass);
    const builder = new web3.PublicKey(buildData.builder);

    const itemSource = splToken.getAssociatedTokenAddressSync(
      itemMint,
      itemClass,
      true
    );
    const itemDestination = await splToken.getAssociatedTokenAddress(
      itemMint,
      builder
    );

    return await this.program.client.methods
      .receiveItemSpl()
      .accounts({
        itemMint: itemMint,
        itemSource: itemSource,
        itemDestination: itemDestination,
        itemClass: itemClass,
        build: build,
        builder: builder,
        payer: payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();
  }

  async applyBuildEffect(
    accounts: ApplyBuildEffectAccounts
  ): Promise<web3.TransactionInstruction> {
    const item = getItemPda(accounts.ingredientMint);

    const ix = await this.program.client.methods
      .applyBuildEffect()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        build: accounts.build,
        payer: accounts.payer,
      })
      .instruction();
    return ix;
  }

  async returnIngredient(
    accounts: ReturnIngredientAccounts
  ): Promise<web3.TransactionInstruction[]> {
    const item = getItemPda(accounts.ingredientMint);

    // detect what type of token we are adding
    const tokenStandard = await Utils.Item.getTokenStandard(
      this.program.client.provider.connection,
      accounts.ingredientMint
    );

    const ixns: web3.TransactionInstruction[] = [];
    if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
      const pNftIxns = await this.returnIngredientPNft(
        accounts,
        accounts.build,
        item
      );
      ixns.push(...pNftIxns);
    } else {
      const ix = await this.returnIngredientSpl(accounts, accounts.build, item);
      ixns.push(ix);
    }

    return ixns;
  }

  private async returnIngredientPNft(
    accounts: ReturnIngredientAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey
  ): Promise<web3.TransactionInstruction[]> {
    const [itemMetadata, _itemMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const itemMetadataData = await mpl.Metadata.fromAccountAddress(
      this.program.client.provider.connection,
      itemMetadata,
      "confirmed"
    );

    const [itemME, _itemMEBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        accounts.ingredientMint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

    const buildData = await this.program.client.account.build.fetch(build);
    const builder = new web3.PublicKey(buildData.builder);

    const itemSource = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      build,
      true
    );
    const itemDestination = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      builder
    );

    const [itemSourceTokenRecord, _itemSourceTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("token_record"),
          itemSource.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [itemDestinationTokenRecord, _itemDestinationTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("token_record"),
          itemDestination.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    // double CU and fee

    const increaseCUIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    const addPriorityFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 5000,
    });

    const ix = await this.program.client.methods
      .returnIngredientPnft()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        itemMetadata: itemMetadata,
        itemEdition: itemME,
        authRules: itemMetadataData.programmableConfig.ruleSet,
        itemSource: itemSource,
        itemSourceTokenRecord: itemSourceTokenRecord,
        itemDestination: itemDestination,
        itemDestinationTokenRecord: itemDestinationTokenRecord,
        build: build,
        builder: builder,
        payer: accounts.payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadata: TOKEN_METADATA_PROGRAM_ID,
        authRulesProgram: Constants.ProgramIds.MPL_AUTH_RULES_PROGRAM_ID,
      })
      .instruction();

    return [increaseCUIx, addPriorityFeeIx, ix];
  }

  private async returnIngredientSpl(
    accounts: ReturnIngredientAccounts,
    build: web3.PublicKey,
    item: web3.PublicKey
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(build);
    const builder = new web3.PublicKey(buildData.builder);

    const itemSource = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      build,
      true
    );
    const itemDestination = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      builder
    );

    const ix = await this.program.client.methods
      .returnIngredientSpl()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        itemSource: itemSource,
        itemDestination: itemDestination,
        build: build,
        builder: builder,
        payer: accounts.payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();
    return ix;
  }

  async destroyIngredient(
    accounts: DestroyIngredientAccounts
  ): Promise<web3.TransactionInstruction[]> {
    const item = getItemPda(accounts.ingredientMint);

    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );
    const builder = new web3.PublicKey(buildData.builder);

    const tokenStandard = await Utils.Item.getTokenStandard(
      this.program.client.provider.connection,
      accounts.ingredientMint
    );

    const itemSource = await splToken.getAssociatedTokenAddress(
      accounts.ingredientMint,
      accounts.build,
      true
    );

    const ixns: web3.TransactionInstruction[] = [];
    if (tokenStandard === Utils.Item.TokenStandard.ProgrammableNft) {
      const pNftIx = await this.destroyIngredientPnft(
        accounts,
        item,
        itemSource
      );
      ixns.push(pNftIx);
    } else {
      const ix = await this.destroyIngredientSpl(
        accounts,
        item,
        builder,
        itemSource
      );
      ixns.push(ix);
    }

    return ixns;
  }

  private async destroyIngredientPnft(
    accounts: DestroyIngredientAccounts,
    item: web3.PublicKey,
    itemAta: web3.PublicKey
  ): Promise<web3.TransactionInstruction> {
    const [itemMetadata, _itemMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [itemME, _itemMEBump] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        accounts.ingredientMint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

    const [itemTokenRecord, _itemTokenRecordBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          accounts.ingredientMint.toBuffer(),
          Buffer.from("token_record"),
          itemAta.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const itemMetadataData = await mpl.Metadata.fromAccountAddress(
      this.program.client.provider.connection,
      itemMetadata
    );

    const [collectionMetadata, _collectionMetadataBump] =
      web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMetadataData.collection.key.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const ix = await this.program.client.methods
      .destroyIngredientPnft()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        itemMetadata: itemMetadata,
        collectionMetadata: collectionMetadata,
        itemEdition: itemME,
        itemAta: itemAta,
        itemTokenRecord: itemTokenRecord,
        build: accounts.build,
        payer: accounts.payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenMetadata: TOKEN_METADATA_PROGRAM_ID,
      })
      .instruction();

    return ix;
  }

  private async destroyIngredientSpl(
    accounts: DestroyIngredientAccounts,
    item: web3.PublicKey,
    builder: web3.PublicKey,
    itemSource: web3.PublicKey
  ): Promise<web3.TransactionInstruction> {
    const ix = await this.program.client.methods
      .destroyIngredientSpl()
      .accounts({
        item: item,
        itemMint: accounts.ingredientMint,
        itemSource: itemSource,
        build: accounts.build,
        builder: builder,
        payer: accounts.payer,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return ix;
  }

  async createRecipe(
    accounts: CreateRecipeAccounts,
    args: CreateRecipeArgs
  ): Promise<web3.TransactionInstruction> {
    const ingredients: any[] = [];
    for (const ingredientArg of args.args.ingredientArgs) {
      let degradationBuildEffect;
      if (ingredientArg.buildEffect.degradation) {
        degradationBuildEffect = {
          on: { rate: ingredientArg.buildEffect.degradation.rate },
        };
      } else {
        degradationBuildEffect = { off: {} };
      }

      let cooldownBuildEffect;
      if (ingredientArg.buildEffect.cooldown) {
        cooldownBuildEffect = {
          on: { seconds: ingredientArg.buildEffect.cooldown.seconds },
        };
      } else {
        cooldownBuildEffect = { off: {} };
      }

      const ingredient = {
        itemClass: ingredientArg.itemClass,
        requiredAmount: ingredientArg.requiredAmount,
        buildEffect: {
          degradation: degradationBuildEffect,
          cooldown: cooldownBuildEffect,
        },
        isDeterministic: ingredientArg.isDeterministic,
      };

      ingredients.push(ingredient);
    }

    const ixArgs = {
      buildEnabled: args.args.buildEnabled,
      ingredients: ingredients,
      payment: args.args.payment,
      buildPermitRequired: args.args.buildPermitRequired,
      selectableOutputs: args.args.selectableOutputs,
    };

    const itemClassData = await this.program.client.account.itemClass.fetch(
      accounts.itemClass
    );

    const authorityMint = new web3.PublicKey(itemClassData.authorityMint);
    const authorityMintAta = splToken.getAssociatedTokenAddressSync(
      authorityMint,
      this.program.client.provider.publicKey!
    );

    let recipeIndex: BN;
    if (itemClassData.recipeIndex === null) {
      recipeIndex = new BN(0);
    } else {
      recipeIndex = new BN(itemClassData.recipeIndex as any).add(new BN(1));
    }

    // get new recipe pda based off item class recipe index
    const newRecipe = getRecipePda(
      accounts.itemClass,
      recipeIndex,
    );

    const ix = await this.program.client.methods
      .createRecipe(ixArgs)
      .accounts({
        recipe: newRecipe,
        itemClass: accounts.itemClass,
        itemClassAuthorityMint: authorityMint,
        itemClassAuthorityMintAta: authorityMintAta,
        authority: this.program.client.provider.publicKey!,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    return ix;
  }

  async closeBuild(
    accounts: CloseBuildAccounts
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );
    const builder = new web3.PublicKey(buildData.builder);

    const ix = await this.program.client.methods
      .closeBuild()
      .accounts({
        build: accounts.build,
        builder: builder,
        payer: accounts.payer,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix;
  }

  async addPayment(
    accounts: AddPaymentAccounts
  ): Promise<web3.TransactionInstruction> {
    const ix = await this.program.client.methods
      .addPayment()
      .accounts({
        build: accounts.build,
        builder: accounts.builder,
        treasury: accounts.treasury,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    return ix;
  }

  async createBuildPermit(
    accounts: CreateBuildPermitAccounts,
    args: CreateBuildPermitArgs
  ): Promise<web3.TransactionInstruction> {
    const itemClassData = await this.program.client.account.itemClass.fetch(
      accounts.itemClass
    );

    const authorityMint = new web3.PublicKey(itemClassData.authorityMint);
    const authorityMintAta = splToken.getAssociatedTokenAddressSync(
      authorityMint,
      this.program.client.provider.publicKey!
    );

    const buildPermit = getBuildPermitPda(accounts.builder, accounts.itemClass);

    const ix = await this.program.client.methods
      .createBuildPermit(args)
      .accounts({
        buildPermit: buildPermit,
        builder: accounts.builder,
        itemClass: accounts.itemClass,
        itemClassAuthorityMint: authorityMint,
        itemClassAuthorityMintAta: authorityMintAta,
        authority: this.program.client.provider.publicKey!,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix;
  }

  async createDeterministicIngredient(
    accounts: CreateDeterministicIngredientAccounts,
    args: CreateDeterministicIngredientArgs
  ): Promise<web3.TransactionInstruction> {
    const recipeData = await this.program.client.account.recipe.fetch(
      accounts.recipe
    );
    const itemClass = new web3.PublicKey(recipeData.itemClass);

    const itemClassData = await this.program.client.account.itemClass.fetch(
      itemClass
    );
    const authorityMint = new web3.PublicKey(itemClassData.authorityMint);
    const authorityMintAta = splToken.getAssociatedTokenAddressSync(
      authorityMint,
      this.program.client.provider.publicKey!
    );

    const deterministicIngredient = getDeterministicIngredientPda(
      accounts.recipe,
      accounts.ingredientMint
    );

    const ix = await this.program.client.methods
      .createDeterministicIngredient(args)
      .accounts({
        recipe: accounts.recipe,
        itemClass: itemClass,
        ingredientMint: accounts.ingredientMint,
        deterministicIngredient: deterministicIngredient,
        itemClassAuthorityMint: authorityMint,
        itemClassAuthorityMintAta: authorityMintAta,
        authority: this.program.client.provider.publicKey!,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix;
  }
}

export interface CreateItemClassArgs {
  itemClassName: string;
  outputMode: ItemClassOutputMode;
}

export interface RecipeArgs {
  buildEnabled: boolean;
  payment: Payment | null;
  ingredientArgs: RecipeIngredientDataArgs[];
  buildPermitRequired: boolean;
  selectableOutputs: OutputSelectionGroup[];
}

export interface RecipeIngredientDataArgs {
  itemClass: web3.PublicKey;
  requiredAmount: BN;
  buildEffect: BuildEffect;
  isDeterministic: boolean;
}

export interface BuildEffect {
  degradation: Degradation | null;
  cooldown: Cooldown | null;
}

export interface Degradation {
  rate: BN;
}

export interface Cooldown {
  seconds: BN;
}

export interface BuildOutput {
  items: BuildOutputItem[];
}

export interface BuildOutputItem {
  mint: web3.PublicKey;
  amount: BN;
  received: boolean;
}

export interface StartBuildAccounts {
  itemClass: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface StartBuildArgs {
  recipeIndex: BN;
  recipeOutputSelection: OutputSelectionArgs[];
}

export interface AddIngredientAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  itemClass: web3.PublicKey;
  payer: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface AddIngredientArgs {
  amount: BN;
}

export interface VerifyIngredientAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  itemClass: web3.PublicKey;
  payer: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface VerifyIngredientArgs {
  root: Buffer;
  leafIndex: number;
  proof: Buffer[];
}

export interface VerifyIngredientTestAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface CompleteBuildItemAccounts {
  itemMint: web3.PublicKey;
  payer: web3.PublicKey;
  build: web3.PublicKey;
}

export interface CompleteBuildItemArgs {
  root: Buffer;
  leafIndex: number;
  proof: Buffer[];
}

export interface CompleteBuildPackAccounts {
  pack: web3.PublicKey;
  payer: web3.PublicKey;
  build: web3.PublicKey;
}

export interface CompleteBuildPackArgs {
  packContents: PackContents;
}

export interface CompleteBuildPresetOnlyAccounts {
  payer: web3.PublicKey;
  build: web3.PublicKey;
}

export interface ReceiveItemAccounts {
  build: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface AddItemsToItemClass {
  itemClass: web3.PublicKey;
  itemMints: web3.PublicKey[];
}

export interface CreatePackAccounts {
  itemClass: web3.PublicKey;
}

export interface CreatePackArgs {
  contentsHash: Buffer;
}

export interface ApplyBuildEffectAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  build: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface ReturnIngredientAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  build: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface CreateRecipeAccounts {
  itemClass: web3.PublicKey;
}

export interface CreateRecipeArgs {
  args: RecipeArgs;
}

export interface DestroyIngredientAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  payer: web3.PublicKey;
  build: web3.PublicKey;
}

export interface CloseBuildAccounts {
  build: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface AddPaymentAccounts {
  build: web3.PublicKey;
  builder: web3.PublicKey;
  treasury: web3.PublicKey;
}

export interface CreateBuildPermitAccounts {
  itemClass: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface CreateBuildPermitArgs {
  remainingBuilds: number;
}

export interface CreateDeterministicIngredientAccounts {
  ingredientMint: web3.PublicKey;
  recipe: web3.PublicKey;
}

export interface CreateDeterministicIngredientArgs {
  outputs: DeterministicIngredientOutput[];
}
