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
  getBuildPaymentEscrowPda,
  getItemPda,
  getBuildPda,
  PackContents,
  parseItemClassMode,
  formatItemClassModeSelection,
  ItemClassModeSelection,
} from "../state/itemv2";

export class Instruction extends SolKitInstruction {
  constructor(args: { program: Program.Program }) {
    super(args);
  }

  async createItemClass(
    args: CreateItemClassArgs
  ): Promise<[web3.PublicKey, web3.Keypair[], web3.TransactionInstruction[]]> {
    const signers: web3.Keypair[] = [];
    const ixns: web3.TransactionInstruction[] = [];

    // create authority mint account and mint some to the creator
    const authorityMint = web3.Keypair.generate();
    signers.push(authorityMint);

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
    ixns.push(createAuthorityMintAccountIx);

    // make it an SFT
    const initAuthorityMintIx = splToken.createInitializeMintInstruction(
      authorityMint.publicKey,
      0,
      this.program.client.provider.publicKey!,
      this.program.client.provider.publicKey!
    );
    ixns.push(initAuthorityMintIx);

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
    ixns.push(createAuthorityMintDestinationIx);

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
      ixns.push(createAuthorityMintMetadataIx);

    // mint 3 tokens to the deployer/authority
    const mintAuthorityTokensIx = splToken.createMintToInstruction(
      authorityMint.publicKey,
      destinationAta,
      this.program.client.provider.publicKey!,
      3
    );
    ixns.push(mintAuthorityTokensIx);

    // transfer minting authority to item class
    const transferAuthorityToItemClassIx =
      splToken.createSetAuthorityInstruction(
        authorityMint.publicKey,
        this.program.client.provider.publicKey!,
        splToken.AuthorityType.MintTokens,
        itemClass
      );
    ixns.push(transferAuthorityToItemClassIx);
    
    let merkleTree: web3.PublicKey | null = null;
    let logWrapper: web3.PublicKey | null = null;
    let accountCompression: web3.PublicKey | null = null;
    
    switch (args.mode.kind) {
      case "MerkleTree":
        // create merkle tree account
        const tree = web3.Keypair.generate();

        // hardcoded to match the contract code
        const maxDepth = 16;
        const maxBufferSize = 64;

        const treeSpace = cmp.getConcurrentMerkleTreeAccountSize(
          maxDepth,
          maxBufferSize
        );

        const treeLamports =
          await this.program.client.provider.connection.getMinimumBalanceForRentExemption(
            treeSpace
          );

        const createAccountIx = await web3.SystemProgram.createAccount({
          fromPubkey: this.program.client.provider.publicKey!,
          newAccountPubkey: tree.publicKey,
          lamports: treeLamports,
          space: treeSpace,
          programId: cmp.PROGRAM_ID,
        });
        ixns.push(createAccountIx);

        merkleTree = tree.publicKey;
        logWrapper = cmp.SPL_NOOP_PROGRAM_ID;
        accountCompression = cmp.PROGRAM_ID;

        signers.push(tree);
        break;
      case "Collection":
        // client side check that collectionMint is truly a mint account
        await splToken.getMint(this.program.client.provider.connection, args.mode.collectionMint)
        break;
      case "Pack":
        break;
      case "PresetOnly":
        break;
    };

    const ixArgs = {
      itemClassName: args.itemClassName,
      mode: formatItemClassModeSelection(args.mode),
    };

    const createItemClassIx = await this.program.client.methods
      .createItemClass(ixArgs)
      .accounts({
        tree: merkleTree,
        itemClass: itemClass,
        itemClassAuthorityMint: authorityMint.publicKey,
        itemClassAuthorityMintAta: destinationAta,
        authority: this.program.client.provider.publicKey!,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        accountCompression: accountCompression,
        logWrapper: logWrapper,
      })
      .instruction();
    ixns.push(createItemClassIx);

    return [
      itemClass,
      signers,
      ixns,
    ];
  }

  async addItemsToItemClass(
    accounts: AddItemsToItemClass
  ): Promise<web3.TransactionInstruction[]> {
    const itemClassData = await this.program.client.account.itemClass.fetch(
      accounts.itemClass
    );

    const mode = parseItemClassMode(itemClassData);

    if (mode.kind !== "MerkleTree") {
      throw new Error(`invalid item class mode for addItemsToItemClass`);
    }

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
          itemClassMerkleTree: mode.tree,
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
      accounts.itemClass,
      "processed"
    );

    const authorityMint = new web3.PublicKey(itemClassData.authorityMint);
    const authorityMintAta = splToken.getAssociatedTokenAddressSync(
      authorityMint,
      this.program.client.provider.publicKey!
    );

    const mode = parseItemClassMode(itemClassData);

    if (mode.kind !== "Pack") {
      throw new Error(`Invalid Item Class mode: ${mode} for pack creation`);
    }

    const packAccount = getPackPda(accounts.itemClass, mode.index);

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
    
    let ingredientMintMetadata: web3.PublicKey | null = null;
    let ingredientItemClassVerifyAccount: web3.PublicKey | null = null;
    let deterministicIngredient: web3.PublicKey | null = null;
    let logWrapper: web3.PublicKey | null = null;
    let accountCompression: web3.PublicKey | null = null;
    const proofAsRemainingAccounts: web3.AccountMeta[] = [];

    let ixArgs: any | null = null;

    const build = getBuildPda(accounts.itemClass, accounts.builder);
    const buildData = await this.program.client.account.build.fetch(build);
    
    const mode = parseItemClassMode(ingredientItemClassData);

    // check if ingredient is deterministic
    const deterministicIngredientPda = getDeterministicIngredientPda(new web3.PublicKey(buildData.recipe), accounts.ingredientMint);
    const deterministicIngredientData = await this.program.client.account.deterministicIngredient.fetchNullable(deterministicIngredientPda);
    if (deterministicIngredientData !== null) {
      deterministicIngredient = deterministicIngredientPda;
    } else {
      switch (mode.kind) {
        case "MerkleTree":
          logWrapper = cmp.SPL_NOOP_PROGRAM_ID;
          accountCompression = cmp.PROGRAM_ID;
          ingredientItemClassVerifyAccount = mode.tree;

          for (const node of args.proof) {
            const nodeAccount = {
              pubkey: new web3.PublicKey(node),
              isSigner: false,
              isWritable: false,
            };
            proofAsRemainingAccounts.push(nodeAccount);
          }

          ixArgs = {
            root: args.root,
            leafIndex: args.leafIndex,
          };

          break;
        case "Collection":
          const [metadata, _metadataBump] = web3.PublicKey.findProgramAddressSync(
            [
              Buffer.from("metadata"),
              mpl.PROGRAM_ID.toBuffer(),
              accounts.ingredientMint.toBuffer(),
            ],
            mpl.PROGRAM_ID
          );
          ingredientMintMetadata = metadata;
          ingredientItemClassVerifyAccount = mode.collectionMint;

          break;
        case "Pack":
          throw new Error(`ItemClasses in Pack Mode cannot be Ingredients`)
        case "PresetOnly":
          throw new Error(`ItemClasses in PresetOnly Mode cannot be Ingredients`)
      }
    }

    const ix = await this.program.client.methods
      .verifyIngredient(ixArgs)
      .accounts({
        item: getItemPda(accounts.ingredientMint),
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientMintMetadata: ingredientMintMetadata,
        deterministicIngredient: deterministicIngredient,
        ingredientItemClassVerifyAccount: ingredientItemClassVerifyAccount,
        build: build,
        payer: accounts.payer,
        systemProgram: web3.SystemProgram.programId,
        logWrapper: logWrapper,
        accountCompression: accountCompression,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }

  async verifyIngredientMerkleTreeTest(
    accounts: VerifyIngredientMerkleTreeTestAccounts,
    args: VerifyIngredientArgs
  ): Promise<web3.TransactionInstruction> {
    const ingredientItemClassData =
      await this.program.client.account.itemClass.fetch(
        accounts.ingredientItemClass
      );
    
    const mode = parseItemClassMode(ingredientItemClassData);

    if (mode.kind !== "MerkleTree") {
      throw new Error(`Invalid ItemClass mode: ${mode} for Merkle Tree Verification Test`);
    }

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
      .verifyIngredientMerkleTreeTest(ixArgs)
      .accounts({
        ingredientMint: accounts.ingredientMint,
        ingredientItemClass: accounts.ingredientItemClass,
        ingredientItemClassMerkleTree: mode.tree,
        payer: accounts.payer,
        logWrapper: cmp.SPL_NOOP_PROGRAM_ID,
        accountCompression: cmp.SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      })
      .remainingAccounts(proofAsRemainingAccounts)
      .instruction();

    return ix;
  }


  async completeBuild(
    accounts: CompleteBuildAccounts,
    args: CompleteBuildArgs
  ): Promise<web3.TransactionInstruction> {
    const buildData = await this.program.client.account.build.fetch(
      accounts.build
    );

    const itemClass = new web3.PublicKey(buildData.itemClass);

    const itemClassData = await this.program.client.account.itemClass.fetch(
      itemClass
    );

    let itemMint: web3.PublicKey | null = null;
    let itemMintMetadata: web3.PublicKey | null = null;
    let itemClassVerifyAccount: web3.PublicKey | null = null;
    let pack: web3.PublicKey | null = null;
    let logWrapper: web3.PublicKey | null = null;
    let accountCompression: web3.PublicKey | null = null;
    const proofAsRemainingAccounts: web3.AccountMeta[] = [];
    let ixArgs = {
      merkleTreeArgs: null,
      packArgs: null,
    };

    const mode = parseItemClassMode(itemClassData);

    switch (mode.kind) {
      case "MerkleTree":
        logWrapper = cmp.SPL_NOOP_PROGRAM_ID;
        accountCompression = cmp.PROGRAM_ID;
        itemMint = accounts.itemMint!;
        itemClassVerifyAccount = mode.tree;

        for (const node of args.merkleTreeArgs!.proof) {
          const nodeAccount = {
            pubkey: new web3.PublicKey(node),
            isSigner: false,
            isWritable: false,
          };
          proofAsRemainingAccounts.push(nodeAccount);
        }

        ixArgs.merkleTreeArgs = {
            root: args.merkleTreeArgs!.root,
            leafIndex: args.merkleTreeArgs!.leafIndex,
          }

        break;
      case "Collection":
        itemMint = accounts.itemMint!;
        itemClassVerifyAccount = mode.collectionMint;

        const [metadata, _metadataBump] = web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            mpl.PROGRAM_ID.toBuffer(),
            itemMint.toBuffer(),
          ],
          mpl.PROGRAM_ID
        );

        itemMintMetadata = metadata;
        break;
      case "Pack":
        pack = accounts.pack!;
        ixArgs.packArgs = {
          packContents: args.packArgs.packContents!
        }
        break;
      case "PresetOnly":
        break;
    }

    // if build permit is required create the pda
    let buildPermit: web3.PublicKey | null = null;
    if (buildData.buildPermitInUse) {
      buildPermit = getBuildPermitPda(
        new web3.PublicKey(buildData.builder),
        itemClass
      );
    }

    const ix = await this.program.client.methods
      .completeBuild(ixArgs)
      .accounts({
        itemMint: itemMint,
        itemMintMetadata: itemMintMetadata,
        itemClass: itemClass,
        itemClassVerifyAccount: itemClassVerifyAccount,
        pack: pack,
        buildPermit: buildPermit,
        build: accounts.build,
        payer: accounts.payer,
        systemProgram: web3.SystemProgram.programId,
        logWrapper: logWrapper,
        accountCompression: accountCompression,
      })
      .remainingAccounts(proofAsRemainingAccounts)
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
        systemProgram: web3.SystemProgram.programId,
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
    const newRecipe = getRecipePda(accounts.itemClass, recipeIndex);

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

  async escrowPayment(
    accounts: EscrowPaymentAccounts, 
  ): Promise<web3.TransactionInstruction> {
    const buildPaymentEscrow = getBuildPaymentEscrowPda(accounts.build);

    const ix = await this.program.client.methods
      .escrowPayment()
      .accounts({
        build: accounts.build,
        builder: accounts.builder,
        buildPaymentEscrow: buildPaymentEscrow,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();
    return ix;
  }

  async transferPayment(
    accounts: TransferPaymentAccounts, 
  ): Promise<web3.TransactionInstruction> {
    const buildPaymentEscrow = getBuildPaymentEscrowPda(accounts.build);

    const ix = await this.program.client.methods
      .transferPayment()
      .accounts({
        build: accounts.build,
        buildPaymentEscrow: buildPaymentEscrow,
        destination: accounts.destination,
        payer: accounts.payer,
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

  async migrateBuildAccount(build: web3.PublicKey, recipe: web3.PublicKey): Promise<web3.TransactionInstruction> {
    const ix = await this.program.client.methods
      .migrateBuildAccount()
      .accounts({
        build: build,
        recipe: recipe,
        payer: this.program.client.provider.publicKey!,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix
  }

  async migrateItemClassAccount(itemClass: web3.PublicKey): Promise<web3.TransactionInstruction> {
    const ix = await this.program.client.methods
      .migrateItemClassAccount()
      .accounts({
        itemClass: itemClass,
        payer: this.program.client.provider.publicKey!,
        systemProgram: web3.SystemProgram.programId,
      })
      .instruction();

    return ix
  }
}

export interface CreateItemClassArgs {
  itemClassName: string;
  mode: ItemClassModeSelection;
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

export interface VerifyIngredientMerkleTreeTestAccounts {
  ingredientMint: web3.PublicKey;
  ingredientItemClass: web3.PublicKey;
  payer: web3.PublicKey;
}

export interface CompleteBuildItemAccounts {
  itemMint: web3.PublicKey;
  payer: web3.PublicKey;
  build: web3.PublicKey;
}

export interface CompleteBuildAccounts {
  payer: web3.PublicKey;
  build: web3.PublicKey;
  pack?: web3.PublicKey;
  itemMint?: web3.PublicKey;
}

export interface CompleteBuildArgs {
  merkleTreeArgs?: CompleteBuildMerkleTreeArgs,
  packArgs?: CompleteBuildPackArgs,
}

export interface CompleteBuildMerkleTreeArgs {
  root: Buffer;
  leafIndex: number;
  proof: Buffer[];
}

export interface CompleteBuildPackArgs {
  packContents: PackContents;
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

export interface EscrowPaymentAccounts {
  build: web3.PublicKey;
  builder: web3.PublicKey;
}

export interface TransferPaymentAccounts {
  build: web3.PublicKey;
  destination: web3.PublicKey;
  payer: web3.PublicKey;
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
