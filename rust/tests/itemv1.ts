import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as metaplex from "@metaplex-foundation/js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Instructions,
  Idls,
  ItemProgram,
  Utils,
} from "@raindrops-protocol/raindrops";
import * as splToken from "@solana/spl-token";
import * as cmp from "@solana/spl-account-compression";
import * as mplAuth from "@metaplex-foundation/mpl-token-auth-rules";
import { assert } from "chai";
import { encode } from "@msgpack/msgpack";

describe.only("itemv1", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it("build pNFT using 1 NFT and 1 pNFT, nft burned after", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.ItemIDL,
    });

    // ingredient 1, pNFT
    const pNftItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
    });

    // ingredient 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: true,
      payment: {
        treasury: payer.publicKey,
        amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
      },
      ingredientArgs: [
        {
          itemClass: pNftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degredation: null,
            cooldown: null,
          },
        },
        {
          itemClass: nftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degredation: { amount: new anchor.BN(100000) }, // single use
            cooldown: null,
          },
        },
      ],
    });

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(payer, connection, mint, outputItemClass.itemClass);
    }

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
    };

    const startBuildResult = await itemProgram.startBuild(
      startBuildAccounts,
      startBuildArgs
    );
    console.log("startBuildTxSig: %s", startBuildResult.txid);

    const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        itemProgram.client.provider.publicKey!.toBuffer(),
      ],
      itemProgram.id
    );

    await assertFreshBuild(
      itemProgram,
      build,
      payer.publicKey,
      outputItemClass.itemClass
    );

    // add pNFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add NFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      outputItemClass.itemClass,
      nftItemClass.mints[0],
      nftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add payment to build
    const addPaymentAccounts: Instructions.Item.AddPaymentAccounts = {
      build: build,
      builder: payer.publicKey,
      treasury: payer.publicKey,
    };

    const addPaymentResult = await itemProgram.addPayment(addPaymentAccounts);
    console.log("addPaymentTxSig: %s", addPaymentResult.txid);

    // complete build and receive the item
    await completeBuildAndReceiveItem(
      itemProgram,
      outputItemClass.tree,
      0,
      build,
      outputItemClass.mints
    );

    // assert builder received their item
    const builderItemAta = splToken.getAssociatedTokenAddressSync(
      outputItemClass.mints[0],
      payer.publicKey
    );
    const tokenBalanceResponse =
      await itemProgram.client.provider.connection.getTokenAccountBalance(
        builderItemAta
      );
    assert.isTrue(
      new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
    );

    await cleanBuild(itemProgram, build);
  });

  it.only("build pNFT using 1 NFT and 1 pNFT, both burned after usage", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.ItemIDL,
    });

    // ingredient 1, pNFT
    const pNftItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
    });

    // ingredient 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: true,
      payment: {
        treasury: payer.publicKey,
        amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
      },
      ingredientArgs: [
        {
          itemClass: pNftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degredation: { amount: new anchor.BN(100000)}, // single use
            cooldown: null,
          },
        },
        {
          itemClass: nftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degredation: { amount: new anchor.BN(100000)}, // single use
            cooldown: null,
          },
        },
      ],
    });

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(payer, connection, mint, outputItemClass.itemClass);
    }

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
    };

    const startBuildResult = await itemProgram.startBuild(
      startBuildAccounts,
      startBuildArgs
    );
    console.log("startBuildTxSig: %s", startBuildResult.txid);

    const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        itemProgram.client.provider.publicKey!.toBuffer(),
      ],
      itemProgram.id
    );

    await assertFreshBuild(
      itemProgram,
      build,
      payer.publicKey,
      outputItemClass.itemClass
    );

    // add pNFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add NFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      outputItemClass.itemClass,
      nftItemClass.mints[0],
      nftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add payment to build
    const addPaymentAccounts: Instructions.Item.AddPaymentAccounts = {
      build: build,
      builder: payer.publicKey,
      treasury: payer.publicKey,
    };

    const addPaymentResult = await itemProgram.addPayment(addPaymentAccounts);
    console.log("addPaymentTxSig: %s", addPaymentResult.txid);

    // complete build and receive the item
    await completeBuildAndReceiveItem(
      itemProgram,
      outputItemClass.tree,
      0,
      build,
      outputItemClass.mints
    );

    // assert builder received their item
    const builderItemAta = splToken.getAssociatedTokenAddressSync(
      outputItemClass.mints[0],
      payer.publicKey
    );
    const tokenBalanceResponse =
      await itemProgram.client.provider.connection.getTokenAccountBalance(
        builderItemAta
      );
    assert.isTrue(
      new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
    );

    await cleanBuild(itemProgram, build);
  });

  it("build pNFT twice with the same builder", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.ItemIDL,
    });

    // ingredient 1, pNFT
    const pNftItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
    });

    // ingredient 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
    });

    // output pNft
    const availableItemsToBuild = 2;
    const outputItemClass = await createItemClass(
      payer,
      connection,
      availableItemsToBuild,
      true,
      {
        buildEnabled: true,
        payment: {
          treasury: payer.publicKey,
          amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
        },
        ingredientArgs: [
          {
            itemClass: pNftItemClass.itemClass,
            requiredAmount: new BN(1),
            buildEffect: {
              degredation: null,
              cooldown: null,
            },
          },
          {
            itemClass: nftItemClass.itemClass,
            requiredAmount: new BN(1),
            buildEffect: {
              degredation: null,
              cooldown: null,
            },
          },
        ],
      }
    );

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(payer, connection, mint, outputItemClass.itemClass);
    }

    // use the same builder and build multiple items
    for (let i = 0; i < availableItemsToBuild; i++) {
      // start the build process
      const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
        itemClass: outputItemClass.itemClass,
        builder: itemProgram.client.provider.publicKey,
      };

      const startBuildArgs: Instructions.Item.StartBuildArgs = {
        recipeIndex: new anchor.BN(0),
      };

      const startBuildResult = await itemProgram.startBuild(
        startBuildAccounts,
        startBuildArgs
      );
      console.log("startBuildTxSig: %s", startBuildResult.txid);

      const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("build"),
          outputItemClass.itemClass.toBuffer(),
          itemProgram.client.provider.publicKey!.toBuffer(),
        ],
        itemProgram.id
      );

      // check build data
      await assertFreshBuild(
        itemProgram,
        build,
        payer.publicKey,
        outputItemClass.itemClass
      );

      // add pNFT to build
      await addIngredient(
        itemProgram,
        pNftItemClass.tree,
        outputItemClass.itemClass,
        pNftItemClass.mints[0],
        pNftItemClass.itemClass,
        new anchor.BN(1)
      );

      // add NFT to build
      await addIngredient(
        itemProgram,
        pNftItemClass.tree,
        outputItemClass.itemClass,
        nftItemClass.mints[0],
        nftItemClass.itemClass,
        new anchor.BN(1)
      );

      const addPaymentAccounts: Instructions.Item.AddPaymentAccounts = {
        build: build,
        builder: payer.publicKey,
        treasury: payer.publicKey,
      };

      const addPaymentResult = await itemProgram.addPayment(addPaymentAccounts);
      console.log("addPaymentTxSig: %s", addPaymentResult.txid);

      // complete build and receive the item
      await completeBuildAndReceiveItem(
        itemProgram,
        outputItemClass.tree,
        i,
        build,
        outputItemClass.mints
      );

      // assert builder received their item
      const builderItemAta = splToken.getAssociatedTokenAddressSync(
        outputItemClass.mints[i],
        payer.publicKey
      );
      const tokenBalanceResponse =
        await itemProgram.client.provider.connection.getTokenAccountBalance(
          builderItemAta
        );
      assert.isTrue(
        new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
      );

      await cleanBuild(itemProgram, build);
    }
  });

  it("permissionless build flow", async () => {
    const payer = await newPayer(connection);
    const crank = await newPayer(connection);

    const builderItemProgram = await ItemProgram.getProgramWithConfig(
      ItemProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemIDL,
      }
    );

    const crankItemProgram = await ItemProgram.getProgramWithConfig(
      ItemProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(crank),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemIDL,
      }
    );

    // ingredient 1, pNFT
    const pNftItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
    });

    // ingredient 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: true,
      payment: {
        treasury: payer.publicKey,
        amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
      },
      ingredientArgs: [
        {
          itemClass: pNftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degredation: null,
            cooldown: null,
          },
        },
        {
          itemClass: nftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degredation: null,
            cooldown: null,
          },
        },
      ],
    });

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(payer, connection, mint, outputItemClass.itemClass);
    }

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: builderItemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
    };

    const startBuildResult = await builderItemProgram.startBuild(
      startBuildAccounts,
      startBuildArgs
    );
    console.log("startBuildTxSig: %s", startBuildResult.txid);

    const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        builderItemProgram.client.provider.publicKey!.toBuffer(),
      ],
      builderItemProgram.id
    );

    await assertFreshBuild(
      builderItemProgram,
      build,
      payer.publicKey,
      outputItemClass.itemClass
    );

    // add pNFT to build
    await addIngredient(
      builderItemProgram,
      pNftItemClass.tree,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add NFT to build
    await addIngredient(
      builderItemProgram,
      pNftItemClass.tree,
      outputItemClass.itemClass,
      nftItemClass.mints[0],
      nftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add payment to build
    const addPaymentAccounts: Instructions.Item.AddPaymentAccounts = {
      build: build,
      builder: payer.publicKey,
      treasury: payer.publicKey,
    };

    const addPaymentResult = await builderItemProgram.addPayment(
      addPaymentAccounts
    );
    console.log("addPaymentTxSig: %s", addPaymentResult.txid);

    // complete build and receive the item
    await completeBuildAndReceiveItem(
      crankItemProgram,
      outputItemClass.tree,
      0,
      build,
      outputItemClass.mints
    );

    // assert builder received their item
    const builderItemAta = splToken.getAssociatedTokenAddressSync(
      outputItemClass.mints[0],
      payer.publicKey
    );
    const tokenBalanceResponse =
      await builderItemProgram.client.provider.connection.getTokenAccountBalance(
        builderItemAta
      );
    assert.isTrue(
      new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
    );

    await cleanBuild(crankItemProgram, build);
  });

  it("create item class with multiple recipes", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.ItemIDL,
    });

    let createItemClassArgs: Instructions.Item.CreateItemClassV1Args = {
      recipeArgs: {
        buildEnabled: false,
        payment: null,
        ingredientArgs: [],
      },
    };

    let [itemClass, createItemClassResult] =
      await itemProgram.createItemClassV1(createItemClassArgs);
    console.log("createItemClassTxSig: %s", createItemClassResult.txid);

    // first recipe is created during item class creation
    const itemClassDataPre = await itemProgram.getItemClassV1(itemClass);
    assert.isTrue(itemClassDataPre.recipeIndex.eq(new anchor.BN(0)));

    const createRecipeAccounts: Instructions.Item.CreateRecipeAccounts = {
      itemClass: itemClass,
      authority: payer.publicKey,
    };

    const createRecipeArgs: Instructions.Item.CreateRecipeArgs = {
      args: {
        buildEnabled: false,
        payment: null,
        ingredientArgs: [],
      },
    };

    const createRecipeResult = await itemProgram.createRecipe(
      createRecipeAccounts,
      createRecipeArgs
    );
    console.log("createRecipeTxSig: %s", createRecipeResult.txid);

    // first recipe is created during item class creation
    const itemClassDataPost = await itemProgram.getItemClassV1(itemClass);
    assert.isTrue(itemClassDataPost.recipeIndex.eq(new anchor.BN(1)));
  });
});

async function newPayer(
  connection: anchor.web3.Connection
): Promise<anchor.web3.Keypair> {
  const payer = anchor.web3.Keypair.generate();

  const txSig = await connection.requestAirdrop(
    payer.publicKey,
    100 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(txSig);

  return payer;
}

function initTree(depthSizePair: cmp.ValidDepthSizePair): cmp.MerkleTree {
  const leaves = Array(2 ** depthSizePair.maxDepth).fill(Buffer.alloc(32));
  const tree = new cmp.MerkleTree(leaves);
  return tree;
}

async function createItemClass(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  ingredientCount: number,
  isPNft: boolean,
  recipeArgs: Instructions.Item.RecipeArgs
): Promise<ItemClassContainer> {
  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  let createItemClassArgs: Instructions.Item.CreateItemClassV1Args = {
    recipeArgs: recipeArgs,
  };

  let [itemClass, createItemClassResult] = await itemProgram.createItemClassV1(
    createItemClassArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  const tree = initTree({ maxDepth: 14, maxBufferSize: 64 });
  console.log("tree created: %s", itemClass.toString());

  // collection nft for ingredient
  const ingredientCollectionNft = await createCollectionNft(payer, connection);

  const mints: anchor.web3.PublicKey[] = [];
  for (let i = 0; i < ingredientCount; i++) {
    const client = new metaplex.Metaplex(connection, {}).use(
      metaplex.keypairIdentity(payer)
    );

    let ingredientMintOutput: metaplex.CreateNftOutput;
    if (isPNft) {
      const ruleSetPda = await createRuleSet(payer, connection);

      // TODO: test with a verified collection, for some reason this func fails
      ingredientMintOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.ProgrammableNonFungible,
        uri: "https://foo.com/bar.json",
        name: "pNFT1",
        sellerFeeBasisPoints: 500,
        symbol: "PN",
        ruleSet: ruleSetPda,
        //collection: ingredientCollectionNft,
        //collectionAuthority: payer,
      });
      console.log("createPNftTxSig: %s", ingredientMintOutput.response.signature);
    } else {
      ingredientMintOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.NonFungible,
        uri: "https://foo.com/bar.json",
        name: "NFT1",
        sellerFeeBasisPoints: 500,
        symbol: "N",
        collection: ingredientCollectionNft,
        collectionAuthority: payer,
      });
      console.log("createNftTxSig: %s", ingredientMintOutput.response.signature);
    }

    // add mint to the items tree on chain
    const addItemsToItemClassAccounts: Instructions.Item.AddItemsToItemClass = {
      itemClass: itemClass,
      itemMints: [ingredientMintOutput.mintAddress],
    };

    const addItemsToItemClassResult = await itemProgram.addItemsToItemClass(
      addItemsToItemClassAccounts
    );
    console.log("addItemsToItemClassTxSig: %s", addItemsToItemClassResult.txid);
    console.log(
      "itemClass: %s, item: %s",
      itemClass.toString(),
      ingredientMintOutput.mintAddress.toString()
    );

    // add mint to items tree off chain
    tree.updateLeaf(i, ingredientMintOutput.mintAddress.toBuffer());

    mints.push(ingredientMintOutput.mintAddress);
  }

  return { itemClass: itemClass, mints: mints, tree: tree };
}

async function transferPNft(
  owner: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  nftMint: anchor.web3.PublicKey,
  receiver: anchor.web3.PublicKey
) {
  const [ruleSetPda, _ruleSetBump] = await mplAuth.findRuleSetPDA(
    owner.publicKey,
    "AllRuleSet"
  );

  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(owner)
  );

  const pNft = await client.nfts().findByMint({
    mintAddress: nftMint,
  });

  const sourceAta = splToken.getAssociatedTokenAddressSync(
    nftMint,
    owner.publicKey,
    true
  );

  const itemClassPNftAta = splToken.getAssociatedTokenAddressSync(
    nftMint,
    receiver,
    true
  );

  const [itemSourceTokenRecord, _itemSourceTokenRecordBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        nftMint.toBuffer(),
        Buffer.from("token_record"),
        sourceAta.toBuffer(),
      ],
      mpl.PROGRAM_ID
    );

  const [itemDestinationTokenRecord, _itemDestinationTokenRecordBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        nftMint.toBuffer(),
        Buffer.from("token_record"),
        itemClassPNftAta.toBuffer(),
      ],
      mpl.PROGRAM_ID
    );

  // double CU and fee

  const increaseCUIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: 400000,
  });

  const addPriorityFeeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice(
    {
      microLamports: 5000,
    }
  );

  // escrow the pNFT with the item class
  const transferIx = mpl.createTransferInstruction(
    {
      token: sourceAta,
      tokenOwner: owner.publicKey,
      destination: itemClassPNftAta,
      destinationOwner: receiver,
      mint: nftMint,
      metadata: pNft.metadataAddress,
      edition: await Utils.PDA.getEdition(nftMint),
      ownerTokenRecord: itemSourceTokenRecord,
      destinationTokenRecord: itemDestinationTokenRecord,
      authority: owner.publicKey,
      payer: owner.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      splTokenProgram: splToken.TOKEN_PROGRAM_ID,
      splAtaProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      authorizationRulesProgram: mplAuth.PROGRAM_ID,
      authorizationRules: ruleSetPda,
    },
    {
      transferArgs: {
        __kind: "V1",
        amount: 1,
        authorizationData: null,
      },
    }
  );

  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(owner), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  const transferTx = new anchor.web3.Transaction().add(
    increaseCUIx,
    addPriorityFeeIx,
    transferIx
  );
  const itemTransferTxSig = await itemProgram.client.provider.sendAndConfirm!(
    transferTx,
    undefined,
    { skipPreflight: false }
  );
  console.log("itemTransferTxSig: %s", itemTransferTxSig);
}

async function createCollectionNft(payer: anchor.web3.Keypair, connection: anchor.web3.Connection): Promise<anchor.web3.PublicKey> {
  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(payer)
  );
  
  const result = await client.nfts().create({
    tokenStandard: mpl.TokenStandard.NonFungible,
    uri: "https://foo.com/bar.json",
    name: "collectionNft",
    sellerFeeBasisPoints: 0,
    symbol: "CN",
    isCollection: true,
  });

  return result.mintAddress
}

async function createRuleSet(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
): Promise<anchor.web3.PublicKey> {
  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });
  // use an allow all ruleset
  const ruleSetData = {
    libVersion: 1,
    ruleSetName: "AllRuleSet",
    owner: Array.from(payer.publicKey.toBytes()),
    operations: {
      "Delegate:Transfer": {
        ProgramOwnedList: {
          programs: [Array.from(itemProgram.PROGRAM_ID.toBytes())],
          field: "Delegate",
        },
      },
      "Transfer:Owner": {
        All: {
          rules: [
            {
              Any: {
                rules: [
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(itemProgram.PROGRAM_ID.toBytes())],
                      field: "Source",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(itemProgram.PROGRAM_ID.toBytes())],
                      field: "Destination",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(itemProgram.PROGRAM_ID.toBytes())],
                      field: "Authority",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      "Transfer:TransferDelegate": {
        All: {
          rules: [
            {
              Any: {
                rules: [
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(itemProgram.PROGRAM_ID.toBytes())],
                      field: "Source",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(itemProgram.PROGRAM_ID.toBytes())],
                      field: "Destination",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(itemProgram.PROGRAM_ID.toBytes())],
                      field: "Authority",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  };

  const [ruleSetPda, _ruleSetBump] = await mplAuth.findRuleSetPDA(
    itemProgram.client.provider.publicKey!,
    "AllRuleSet"
  );

  const createAuthRulesAccounts: mplAuth.CreateOrUpdateInstructionAccounts = {
    payer: itemProgram.client.provider.publicKey!,
    ruleSetPda: ruleSetPda,
  };

  const createAuthRulesArgs: mplAuth.CreateOrUpdateInstructionArgs = {
    createOrUpdateArgs: {
      __kind: "V1",
      serializedRuleSet: encode(ruleSetData),
    },
  };

  const createAuthRulesetIx = await mplAuth.createCreateOrUpdateInstruction(
    createAuthRulesAccounts,
    createAuthRulesArgs
  );
  const createAuthRulesetTx = new anchor.web3.Transaction().add(
    createAuthRulesetIx
  );
  const createAuthRulesetTxSig = await itemProgram.client.provider
    .sendAndConfirm!(createAuthRulesetTx, undefined, {
    commitment: "confirmed",
  });
  console.log("createAuthRulesetTxSig: %s", createAuthRulesetTxSig);

  return ruleSetPda;
}

async function addIngredient(
  itemProgram: ItemProgram,
  tree: cmp.MerkleTree,
  outputItemClass: anchor.web3.PublicKey,
  ingredientMint: anchor.web3.PublicKey,
  ingredientItemClass: anchor.web3.PublicKey,
  ingredientAmount: anchor.BN
) {
  // verify build ingredient
  const verifyIngredientAccounts: Instructions.Item.VerifyIngredientAccounts =
    {
      ingredientMint: ingredientMint,
      ingredientItemClass: ingredientItemClass,
      itemClass: outputItemClass,
      builder: itemProgram.client.provider.publicKey,
    };

  // get proof for mint
  const proof = tree.getProof(0);

  const verifyIngredientArgs: Instructions.Item.VerifyIngredientArgs = {
    root: proof.root,
    leafIndex: proof.leafIndex,
    proof: proof.proof,
  };

  const verifyIngredientResult = await itemProgram.verifyIngredient(
    verifyIngredientAccounts,
    verifyIngredientArgs
  );
  console.log("verifyIngredientTxSig: %s", verifyIngredientResult.txid);

  const addIngredientAccounts: Instructions.Item.AddIngredientAccounts = {
    itemClass: outputItemClass,
    ingredientMint: ingredientMint,
    ingredientItemClass: ingredientItemClass,
    builder: itemProgram.client.provider.publicKey,
  };

  const addIngredientArgs: Instructions.Item.AddIngredientArgs = {
    amount: ingredientAmount,
  };

  const addIngredientResult = await itemProgram.addIngredient(
    addIngredientAccounts,
    addIngredientArgs
  );
  console.log("addIngredientTxSig: %s", addIngredientResult.txid);
}

async function completeBuildAndReceiveItem(
  itemProgram: ItemProgram,
  tree: cmp.MerkleTree,
  leafIndex: number,
  build: anchor.web3.PublicKey,
  outputItemMints: anchor.web3.PublicKey[]
) {
  // complete the build process
  const completeBuildAccounts: Instructions.Item.CompleteBuildAccounts = {
    itemMint: outputItemMints[leafIndex],
    payer: itemProgram.client.provider.publicKey,
    build: build,
  };

  const proof = tree.getProof(leafIndex);

  const completeBuildArgs: Instructions.Item.CompleteBuildArgs = {
    root: proof.root,
    leafIndex: proof.leafIndex,
    proof: proof.proof,
  };

  const completeBuildResult = await itemProgram.completeBuild(
    completeBuildAccounts,
    completeBuildArgs
  );
  console.log("completeBuildTxSig: %s", completeBuildResult.txid);

  // send item to builder
  const receiveItemAccounts: Instructions.Item.ReceiveItemAccounts = {
    build: build,
    payer: itemProgram.client.provider.publicKey,
  };

  const receiveItemResult = await itemProgram.receiveItem(receiveItemAccounts);
  console.log("receiveItemTxSig: %s", receiveItemResult.txid);
}

async function cleanBuild(
  itemProgram: ItemProgram,
  build: anchor.web3.PublicKey
) {
  // get all build ingredient mints/item classes
  const buildData = await itemProgram.client.account.build.fetch(build);
  // [item_class, mint pubkeys]
  const buildIngredientMints: [anchor.web3.PublicKey, anchor.web3.PublicKey[]][] =
    [];
  for (let ingredientData of buildData.ingredients as any[]) {
    let mints: anchor.web3.PublicKey[] = [];
    for (let mintData of ingredientData.mints) {
      if (mintData.buildEffectApplied) {
        continue;
      }

      mints.push(mintData.mint);
    }
    buildIngredientMints.push([ingredientData.itemClass, mints]);
  }
  // apply the build effect to each ingredient and then return them to the builder
  for (let buildIngredientData of buildIngredientMints) {
    for (let mint of buildIngredientData[1]) {
      const applyBuildEffectAccounts: Instructions.Item.ApplyBuildEffectAccounts =
        {
          ingredientItemClass: buildIngredientData[0],
          ingredientMint: mint,
          payer: itemProgram.client.provider.publicKey,
          build: build,
        };

      const applyBuildEffectResult = await itemProgram.applyBuildEffect(
        applyBuildEffectAccounts
      );
      console.log("applyBuildEffectTxSig: %s", applyBuildEffectResult.txid);

      // detect if item is returnable or consumable
      const [item, _itemBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("item_v1"),
          buildIngredientData[0].toBuffer(),
          mint.toBuffer(),
        ],
        itemProgram.PROGRAM_ID
      );
      const itemData = await itemProgram.getItemV1(item);

      if (itemData.itemState.durability.lte(new anchor.BN(0))) {
        // consume it
        const consumeIngredientAccounts: Instructions.Item.ConsumeIngredientAccounts =
          {
            ingredientMint: mint,
            ingredientItemClass: buildIngredientData[0],
            build: build,
            payer: itemProgram.client.provider.publicKey,
          };

        const consumeIngredientResult =
          await itemProgram.consumeIngredient(consumeIngredientAccounts);
        console.log(
          "consumeIngredientTxSig: %s",
          consumeIngredientResult.txid
        );
      } else {
        // return it
        const returnIngredientAccounts: Instructions.Item.ReturnIngredientAccounts =
          {
            ingredientMint: mint,
            ingredientItemClass: buildIngredientData[0],
            build: build,
            payer: itemProgram.client.provider.publicKey,
          };

        const returnIngredientResult = await itemProgram.returnIngredient(
          returnIngredientAccounts
        );
        console.log(
          "returnIngredientTxSig: %s",
          returnIngredientResult.txid
        );
        // assert builder received their item back
        const builderItemAta = splToken.getAssociatedTokenAddressSync(
          mint,
          new anchor.web3.PublicKey(buildData.builder)
        );
        const tokenBalanceResponse =
          await itemProgram.client.provider.connection.getTokenAccountBalance(
            builderItemAta
          );
        assert.isTrue(
          new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
        );
      }
    }
  }

  const closeBuildAccounts: Instructions.Item.CloseBuildAccounts = {
    build: build,
    payer: itemProgram.client.provider.publicKey,
  };

  // clean up build pda
  const closeBuildResult = await itemProgram.closeBuild(closeBuildAccounts);
  console.log("closeBuildTxSig: %s", closeBuildResult.txid);
}

interface ItemClassContainer {
  itemClass: anchor.web3.PublicKey;
  mints: anchor.web3.PublicKey[];
  tree: cmp.MerkleTree;
}

async function assertFreshBuild(
  itemProgram: ItemProgram,
  build: anchor.web3.PublicKey,
  builder: anchor.web3.PublicKey,
  itemClass: anchor.web3.PublicKey
) {
  const buildData = await itemProgram.getBuild(build);
  assert.isTrue(buildData.builder.equals(builder));
  assert.isTrue(buildData.itemClass.equals(itemClass));
  assert.isFalse(buildData.payment.paid);
  for (let ingredient of buildData.ingredients) {
    assert.isTrue(ingredient.currentAmount.eq(new anchor.BN(0)));
    assert.equal(ingredient.mints.length, 0);
  }
}
