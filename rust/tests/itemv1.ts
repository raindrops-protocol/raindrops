import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as metaplex from "@metaplex-foundation/js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Instructions,
  Idls,
  ItemProgram,
  Utils,
  State,
} from "@raindrops-protocol/raindrops";
import * as splToken from "@solana/spl-token";
import * as cmp from "@solana/spl-account-compression";
import * as mplAuth from "@metaplex-foundation/mpl-token-auth-rules";
import { assert } from "chai";
import { encode } from "@msgpack/msgpack";
import fs from "fs";
import path from "path";

// use a local file or set the env var of TEST_SIGNER
const TEST_SIGNER_FILE_PATH = "./tests/files/test-signer.json";

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
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // ingredient 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
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
            degradation: null,
            cooldown: null,
          },
          isDeterministic: false,
        },
        {
          itemClass: nftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degradation: { rate: new anchor.BN(100000) }, // single use
            cooldown: null,
          },
          isDeterministic: false,
        },
      ],
      buildPermitRequired: false,
      selectableOutputs: [],
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
      recipeOutputSelection: [],
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
      0,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add NFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      0,
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
    await completeBuildItemAndReceiveItem(
      connection,
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

    // verify test ingredient
    const verifyIngredientTestAccounts: Instructions.Item.VerifyIngredientTestAccounts =
      {
        ingredientMint: pNftItemClass.mints[0],
        ingredientItemClass: pNftItemClass.itemClass,
        payer: itemProgram.client.provider.publicKey,
      };

    // get proof for mint
    const proof = pNftItemClass.tree.getProof(0);

    const verifyIngredientArgs: Instructions.Item.VerifyIngredientArgs = {
      root: proof.root,
      leafIndex: proof.leafIndex,
      proof: proof.proof,
    };

    const verifyIngredientResult = await itemProgram.verifyIngredientTest(
      verifyIngredientTestAccounts,
      verifyIngredientArgs
    );
    console.log("verifyIngredientTestTxSig: %s", verifyIngredientResult.txid);

    await cleanBuild(itemProgram, build);
  });

  it("build pNFT 1 pNFT which goes on cooldown, try to use again and get error", async () => {
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
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 2, true, {
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
            degradation: null,
            cooldown: { seconds: new BN(60) },
          },
          isDeterministic: false,
        },
      ],
      buildPermitRequired: false,
      selectableOutputs: [],
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
      recipeOutputSelection: [],
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
      0,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
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
    await completeBuildItemAndReceiveItem(
      connection,
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

    // check item is on cooldown
    const item = Utils.PDA.getItemV1(pNftItemClass.mints[0]);
    const itemData = await itemProgram.getItemV1(item);
    assert.isTrue(itemData.itemState.cooldown.gt(new BN(0)));

    // start the build process again
    const startBuild2Accounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuild2Args: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
    };

    const startBuild2Result = await itemProgram.startBuild(
      startBuild2Accounts,
      startBuild2Args
    );
    console.log("startBuildTxSig: %s", startBuild2Result.txid);

    const [build2, _build2Bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        itemProgram.client.provider.publicKey!.toBuffer(),
      ],
      itemProgram.id
    );

    await assertFreshBuild(
      itemProgram,
      build2,
      payer.publicKey,
      outputItemClass.itemClass
    );

    // add pNFT to build
    assertRejects(
      addIngredient(
        itemProgram,
        pNftItemClass.tree,
        0,
        outputItemClass.itemClass,
        pNftItemClass.mints[0],
        pNftItemClass.itemClass,
        new anchor.BN(1)
      )
    );
  });

  it("build pNFT using 1 NFT and 1 pNFT, both burned after usage", async () => {
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
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // ingredient 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
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
            degradation: { rate: new anchor.BN(100000) }, // single use
            cooldown: null,
          },
          isDeterministic: false,
        },
        {
          itemClass: nftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degradation: { rate: new anchor.BN(100000) }, // single use
            cooldown: null,
          },
          isDeterministic: false,
        },
      ],
      buildPermitRequired: false,
      selectableOutputs: [],
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
      recipeOutputSelection: [],
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
      0,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add NFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      0,
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
    await completeBuildItemAndReceiveItem(
      connection,
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
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // ingredient 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
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
              degradation: null,
              cooldown: null,
            },
            isDeterministic: false,
          },
          {
            itemClass: nftItemClass.itemClass,
            requiredAmount: new BN(1),
            buildEffect: {
              degradation: null,
              cooldown: null,
            },
            isDeterministic: false,
          },
        ],
        buildPermitRequired: false,
        selectableOutputs: [],
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
        recipeOutputSelection: [],
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
        0,
        outputItemClass.itemClass,
        pNftItemClass.mints[0],
        pNftItemClass.itemClass,
        new anchor.BN(1)
      );

      // add NFT to build
      await addIngredient(
        itemProgram,
        pNftItemClass.tree,
        0,
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
      await completeBuildItemAndReceiveItem(
        connection,
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
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // ingredient 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
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
            degradation: null,
            cooldown: null,
          },
          isDeterministic: false,
        },
        {
          itemClass: nftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degradation: null,
            cooldown: null,
          },
          isDeterministic: false,
        },
      ],
      buildPermitRequired: false,
      selectableOutputs: [],
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
      recipeOutputSelection: [],
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
      0,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add NFT to build
    await addIngredient(
      builderItemProgram,
      pNftItemClass.tree,
      0,
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
    await completeBuildItemAndReceiveItem(
      connection,
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
        buildPermitRequired: false,
        selectableOutputs: [],
      },
      outputMode: { kind: "Item" },
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
        buildPermitRequired: false,
        selectableOutputs: [],
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

  it("build pNFT with only 1 signature from builder", async () => {
    const builder = await newPayer(connection);
    const payer = await newPayer(connection);

    const itemProgramPayer = await ItemProgram.getProgramWithConfig(
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

    const itemProgramBuilder = await ItemProgram.getProgramWithConfig(
      ItemProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(builder),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemIDL,
      }
    );

    // ingredient 1, pNFT
    const claymakerItemClass = await createItemClass(
      builder,
      connection,
      1,
      true,
      {
        buildEnabled: false,
        payment: null,
        ingredientArgs: [],
        buildPermitRequired: false,
        selectableOutputs: [],
      }
    );

    // ingredient 2, NFT
    const sardItemClass = await createItemClass(builder, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // ingredient 3, pNFT
    const clayItemClass = await createItemClass(builder, connection, 1, true, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(
      builder,
      connection,
      1,
      true,
      {
        buildEnabled: true,
        payment: {
          treasury: payer.publicKey,
          amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
        },
        ingredientArgs: [
          {
            itemClass: claymakerItemClass.itemClass,
            requiredAmount: new BN(1),
            buildEffect: {
              degradation: null,
              cooldown: null,
            },
            isDeterministic: false,
          },
          {
            itemClass: sardItemClass.itemClass,
            requiredAmount: new BN(1),
            buildEffect: {
              degradation: { rate: new anchor.BN(100000) }, // single use
              cooldown: null,
            },
            isDeterministic: false,
          },
          {
            itemClass: clayItemClass.itemClass,
            requiredAmount: new BN(1),
            buildEffect: {
              degradation: { rate: new anchor.BN(100000) }, // single use
              cooldown: null,
            },
            isDeterministic: false,
          },
        ],
        buildPermitRequired: false,
        selectableOutputs: [],
      }
    );

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(builder, connection, mint, outputItemClass.itemClass);
    }

    // start the build ix
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgramBuilder.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
    };

    const startBuildIx = await itemProgramBuilder.instruction.startBuild(
      startBuildAccounts,
      startBuildArgs
    );

    const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        itemProgramBuilder.client.provider.publicKey!.toBuffer(),
      ],
      itemProgramBuilder.id
    );

    // add build payment ix
    const addBuildPaymentAccounts: Instructions.Item.AddPaymentAccounts = {
      build: build,
      builder: builder.publicKey,
      treasury: payer.publicKey,
    };
    const addBuildPaymentIx = await itemProgramBuilder.instruction.addPayment(
      addBuildPaymentAccounts
    );

    // create approve instructions for each ingredient
    const approveClaymakerIx = await createDelegateAuthorityPNftIx(
      builder,
      payer.publicKey,
      claymakerItemClass.mints[0]
    );
    const approveSardIx = await createDelegateAuthoritySplIx(
      builder,
      payer.publicKey,
      sardItemClass.mints[0],
      1
    );
    const approveClayIx = await createDelegateAuthorityPNftIx(
      builder,
      payer.publicKey,
      clayItemClass.mints[0]
    );

    // this is the tx signed by the builder
    const tx = new anchor.web3.Transaction().add(
      startBuildIx,
      approveClaymakerIx,
      approveSardIx,
      approveClayIx,
      addBuildPaymentIx
    );
    const delegateTxSig = await itemProgramBuilder.client.provider
      .sendAndConfirm!(tx, undefined, { skipPreflight: true });
    console.log("delegateTxSig: %s", delegateTxSig);

    // add ingredients to the build
    await addIngredientPermissionless(
      itemProgramPayer,
      builder.publicKey,
      claymakerItemClass.tree,
      outputItemClass.itemClass,
      claymakerItemClass.mints[0],
      claymakerItemClass.itemClass,
      new anchor.BN(1)
    );
    await addIngredientPermissionless(
      itemProgramPayer,
      builder.publicKey,
      claymakerItemClass.tree,
      outputItemClass.itemClass,
      clayItemClass.mints[0],
      clayItemClass.itemClass,
      new anchor.BN(1)
    );
    await addIngredientPermissionless(
      itemProgramPayer,
      builder.publicKey,
      claymakerItemClass.tree,
      outputItemClass.itemClass,
      sardItemClass.mints[0],
      sardItemClass.itemClass,
      new anchor.BN(1)
    );

    // complete build and receive the item
    await completeBuildItemAndReceiveItem(
      connection,
      outputItemClass.tree,
      0,
      build,
      outputItemClass.mints
    );

    // assert builder received their item
    const builderItemAta = splToken.getAssociatedTokenAddressSync(
      outputItemClass.mints[0],
      builder.publicKey
    );
    const tokenBalanceResponse =
      await itemProgramPayer.client.provider.connection.getTokenAccountBalance(
        builderItemAta
      );
    assert.isTrue(
      new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
    );

    await cleanBuild(itemProgramPayer, build);
  });

  it.only("open a pack of 3 pNFTs", async () => {
    const builder = await newPayer(connection);
    const payer = await newPayer(connection);

    const builderItemProgram = await ItemProgram.getProgramWithConfig(
      ItemProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(builder),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemIDL,
      }
    );

    // pack NFT
    const packItemClass = await createItemClass(builder, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // output
    const outputItemClass = await createItemClassPack(
      payer,
      connection,
      {
        buildEnabled: true,
        payment: {
          treasury: payer.publicKey,
          amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
        },
        ingredientArgs: [
          {
            itemClass: packItemClass.itemClass,
            requiredAmount: new BN(1),
            buildEffect: {
              degradation: { rate: new anchor.BN(100000) }, // single use
              cooldown: null,
            },
            isDeterministic: false,
          },
        ],
        buildPermitRequired: false,
        selectableOutputs: [],
      },
      [
        {
          pNftCount: 3,
          nftCount: 0,
          sftCount: 0,
        },
      ]
    );

    // check pack data
    const pack = Utils.PDA.getPack(outputItemClass.itemClass, new BN(0));
    const packData = await builderItemProgram.getPack(pack);
    assert.isTrue(packData.contentsHash.length === 32);
    assert.isTrue(packData.itemClass.equals(outputItemClass.itemClass));
    assert.isTrue(packData.id.eq(new BN(0)));

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: builderItemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
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
      builder.publicKey,
      outputItemClass.itemClass
    );

    // add pack to the build
    await addIngredient(
      builderItemProgram,
      packItemClass.tree,
      0,
      outputItemClass.itemClass,
      packItemClass.mints[0],
      packItemClass.itemClass,
      new anchor.BN(1)
    );

    // add payment to build
    const addPaymentAccounts: Instructions.Item.AddPaymentAccounts = {
      build: build,
      builder: builder.publicKey,
      treasury: payer.publicKey,
    };

    const addPaymentResult = await builderItemProgram.addPayment(
      addPaymentAccounts
    );
    console.log("addPaymentTxSig: %s", addPaymentResult.txid);

    // complete build and receive the item
    await completeBuildPackAndReceiveItems(
      connection,
      outputItemClass.tree,
      0,
      build,
      pack,
      outputItemClass.packs[0]
    );

    // clean up
    await cleanBuild(builderItemProgram, build);
  });

  it.only("open a pack of 6 tokens, 1 pNFT and 5 SFTs", async () => {
    const builder = await newPayer(connection);
    const payer = await newPayer(connection);

    const builderItemProgram = await ItemProgram.getProgramWithConfig(
      ItemProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(builder),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemIDL,
      }
    );

    // pack NFT
    const packItemClass = await createItemClass(builder, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // output
    const outputItemClass = await createItemClassPack(
      payer,
      connection,
      {
        buildEnabled: true,
        payment: {
          treasury: payer.publicKey,
          amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
        },
        ingredientArgs: [
          {
            itemClass: packItemClass.itemClass,
            requiredAmount: new BN(1),
            buildEffect: {
              degradation: { rate: new anchor.BN(100000) }, // single use
              cooldown: null,
            },
            isDeterministic: false,
          },
        ],
        buildPermitRequired: false,
        selectableOutputs: [],
      },
      [
        {
          pNftCount: 1,
          nftCount: 0,
          sftCount: 5,
        },
      ]
    );

    // check pack data
    const pack = Utils.PDA.getPack(outputItemClass.itemClass, new BN(0));
    const packData = await builderItemProgram.getPack(pack);
    assert.isTrue(packData.contentsHash.length === 32);
    assert.isTrue(packData.itemClass.equals(outputItemClass.itemClass));
    assert.isTrue(packData.id.eq(new BN(0)));

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: builderItemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
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
      builder.publicKey,
      outputItemClass.itemClass
    );

    // add pack to the build
    await addIngredient(
      builderItemProgram,
      packItemClass.tree,
      0,
      outputItemClass.itemClass,
      packItemClass.mints[0],
      packItemClass.itemClass,
      new anchor.BN(1)
    );

    // add payment to build
    const addPaymentAccounts: Instructions.Item.AddPaymentAccounts = {
      build: build,
      builder: builder.publicKey,
      treasury: payer.publicKey,
    };

    const addPaymentResult = await builderItemProgram.addPayment(
      addPaymentAccounts
    );
    console.log("addPaymentTxSig: %s", addPaymentResult.txid);

    // complete build and receive the item
    await completeBuildPackAndReceiveItems(
      connection,
      outputItemClass.tree,
      0,
      build,
      pack,
      outputItemClass.packs[0]
    );

    // clean up
    await cleanBuild(builderItemProgram, build);
  });

  it.only("open 3 packs", async () => {
    const builder = await newPayer(connection);
    const payer = await newPayer(connection);

    const builderItemProgram = await ItemProgram.getProgramWithConfig(
      ItemProgram,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(builder),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemIDL,
      }
    );

    // create 3 pack NFTs
    const packItemClass = await createItemClass(builder, connection, 3, false, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // output
    const outputItemClass = await createItemClassPack(
      payer,
      connection,
      {
        buildEnabled: true,
        payment: {
          treasury: payer.publicKey,
          amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
        },
        ingredientArgs: [
          {
            itemClass: packItemClass.itemClass,
            requiredAmount: new BN(1),
            buildEffect: {
              degradation: { rate: new anchor.BN(100000) }, // single use
              cooldown: null,
            },
            isDeterministic: false,
          },
        ],
        buildPermitRequired: false,
        selectableOutputs: [],
      },
      [
        {
          pNftCount: 3,
          nftCount: 3,
          sftCount: 0,
        },
        {
          pNftCount: 2,
          nftCount: 2,
          sftCount: 2,
        },
        {
          pNftCount: 0,
          nftCount: 3,
          sftCount: 3,
        },
      ]
    );

    // check pack data
    const packs: anchor.web3.PublicKey[] = [];
    for (let i = 0; i < 3; i++) {
      const pack = Utils.PDA.getPack(outputItemClass.itemClass, new BN(i));
      const packData = await builderItemProgram.getPack(pack);
      assert.isTrue(packData.contentsHash.length === 32);
      assert.isTrue(packData.itemClass.equals(outputItemClass.itemClass));
      assert.isTrue(packData.id.eq(new BN(i)));
      packs.push(pack);
    }

    for (let i = 0; i < packs.length; i++) {
      // start the build process
      const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
        itemClass: outputItemClass.itemClass,
        builder: builderItemProgram.client.provider.publicKey,
      };

      const startBuildArgs: Instructions.Item.StartBuildArgs = {
        recipeIndex: new anchor.BN(0),
        recipeOutputSelection: [],
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
        builder.publicKey,
        outputItemClass.itemClass
      );

      // add pack to the build
      await addIngredient(
        builderItemProgram,
        packItemClass.tree,
        i,
        outputItemClass.itemClass,
        packItemClass.mints[i],
        packItemClass.itemClass,
        new anchor.BN(1)
      );

      // add payment to build
      const addPaymentAccounts: Instructions.Item.AddPaymentAccounts = {
        build: build,
        builder: builder.publicKey,
        treasury: payer.publicKey,
      };

      const addPaymentResult = await builderItemProgram.addPayment(
        addPaymentAccounts
      );
      console.log("addPaymentTxSig: %s", addPaymentResult.txid);

      // complete build and receive the item
      await completeBuildPackAndReceiveItems(
        connection,
        outputItemClass.tree,
        i,
        build,
        packs[i],
        outputItemClass.packs[i]
      );

      // clean up
      await cleanBuild(builderItemProgram, build);
    }
  });

  it("build pNft requiring a build permit, after permit use try to build again and error", async () => {
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
    const pNftItemClass = await createItemClass(payer, connection, 2, true, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 2, true, {
      buildEnabled: true,
      payment: null,
      ingredientArgs: [
        {
          itemClass: pNftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degradation: null,
            cooldown: null,
          },
          isDeterministic: false,
        },
      ],
      buildPermitRequired: true,
      selectableOutputs: [],
    });

    // check recipe has build permit flag enabled
    const recipeData = await itemProgram.getRecipe(
      Utils.PDA.getRecipe(outputItemClass.itemClass, new BN(0))
    );
    assert.isTrue(recipeData.buildPermitRequired);

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(payer, connection, mint, outputItemClass.itemClass);
    }

    // create build permit for builder
    const createBuildPermitResult = await itemProgram.createBuildPermit(
      { itemClass: outputItemClass.itemClass },
      { wallet: payer.publicKey, remainingBuilds: 1 }
    );
    console.log("createBuildPermitTxSig: %s", createBuildPermitResult.txid);

    const buildPermitDataPreBuild = await itemProgram.getBuildPermit(
      Utils.PDA.getBuildPermit(outputItemClass.itemClass, payer.publicKey)
    );
    assert.isTrue(
      buildPermitDataPreBuild.itemClass.equals(outputItemClass.itemClass)
    );
    assert.isTrue(buildPermitDataPreBuild.remainingBuilds === 1);
    assert.isTrue(buildPermitDataPreBuild.wallet.equals(payer.publicKey));

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
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

    const buildData = await itemProgram.getBuild(build);
    assert.isTrue(buildData.buildPermitInUse);

    // add pNFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      0,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // complete build and receive the item
    await completeBuildItemAndReceiveItem(
      connection,
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

    const buildPermitDataPostBuild = await itemProgram.getBuildPermit(
      Utils.PDA.getBuildPermit(outputItemClass.itemClass, payer.publicKey)
    );
    assert.isNull(buildPermitDataPostBuild);

    // try t start the build process again, but this time we have no remaining uses and it will error
    const startBuildFailAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildFailArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
    };

    assertRejects(
      itemProgram.startBuild(startBuildFailAccounts, startBuildFailArgs)
    );
  });

  it("build pNft requiring a build permit twice", async () => {
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
    const pNftItemClass = await createItemClass(payer, connection, 2, true, {
      buildEnabled: false,
      payment: null,
      ingredientArgs: [],
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 2, true, {
      buildEnabled: true,
      payment: null,
      ingredientArgs: [
        {
          itemClass: pNftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degradation: null,
            cooldown: null,
          },
          isDeterministic: false,
        },
      ],
      buildPermitRequired: true,
      selectableOutputs: [],
    });

    // check recipe has build permit flag enabled
    const recipeData = await itemProgram.getRecipe(
      Utils.PDA.getRecipe(outputItemClass.itemClass, new BN(0))
    );
    assert.isTrue(recipeData.buildPermitRequired);

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(payer, connection, mint, outputItemClass.itemClass);
    }

    // create build permit for builder
    const createBuildPermitResult = await itemProgram.createBuildPermit(
      { itemClass: outputItemClass.itemClass },
      { wallet: payer.publicKey, remainingBuilds: 2 }
    );
    console.log("createBuildPermitTxSig: %s", createBuildPermitResult.txid);

    const buildPermitDataPreBuild = await itemProgram.getBuildPermit(
      Utils.PDA.getBuildPermit(outputItemClass.itemClass, payer.publicKey)
    );
    assert.isTrue(
      buildPermitDataPreBuild.itemClass.equals(outputItemClass.itemClass)
    );
    assert.isTrue(buildPermitDataPreBuild.remainingBuilds === 2);
    assert.isTrue(buildPermitDataPreBuild.wallet.equals(payer.publicKey));

    // start the build process
    const startBuild1Accounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuild1Args: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
    };

    const startBuildResult = await itemProgram.startBuild(
      startBuild1Accounts,
      startBuild1Args
    );
    console.log("startBuild1TxSig: %s", startBuildResult.txid);

    const [build1, _build1Bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        itemProgram.client.provider.publicKey!.toBuffer(),
      ],
      itemProgram.id
    );

    const build1Data = await itemProgram.getBuild(build1);
    assert.isTrue(build1Data.buildPermitInUse);

    // add pNFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      0,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // complete build and receive the item
    await completeBuildItemAndReceiveItem(
      connection,
      outputItemClass.tree,
      0,
      build1,
      outputItemClass.mints
    );

    await cleanBuild(itemProgram, build1);

    const buildPermitDataPostBuild = await itemProgram.getBuildPermit(
      Utils.PDA.getBuildPermit(outputItemClass.itemClass, payer.publicKey)
    );
    assert.isTrue(
      buildPermitDataPostBuild.itemClass.equals(outputItemClass.itemClass)
    );
    assert.isTrue(buildPermitDataPostBuild.remainingBuilds === 1);
    assert.isTrue(buildPermitDataPostBuild.wallet.equals(payer.publicKey));

    // start build 2
    const startBuild2Accounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuild2Args: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
    };

    const startBuild2Result = await itemProgram.startBuild(
      startBuild2Accounts,
      startBuild2Args
    );
    console.log("startBuild2TxSig: %s", startBuild2Result.txid);

    const [build2, _build2Bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        itemProgram.client.provider.publicKey!.toBuffer(),
      ],
      itemProgram.id
    );

    const build2Data = await itemProgram.getBuild(build2);
    assert.isTrue(build2Data.buildPermitInUse);

    // add pNFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      1,
      outputItemClass.itemClass,
      pNftItemClass.mints[1],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // complete build and receive the item
    await completeBuildItemAndReceiveItem(
      connection,
      outputItemClass.tree,
      1,
      build2,
      outputItemClass.mints
    );

    await cleanBuild(itemProgram, build1);

    const buildPermitDataPostBuild2 = await itemProgram.getBuildPermit(
      Utils.PDA.getBuildPermit(outputItemClass.itemClass, payer.publicKey)
    );
    assert.isNull(buildPermitDataPostBuild2);
  });

  it("build item using deterministic inputs", async () => {
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
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: true,
      payment: null,
      ingredientArgs: [
        {
          itemClass: pNftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degradation: null,
            cooldown: null,
          },
          isDeterministic: true,
        },
      ],
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // transfer the pNFT to the item class
    await transferPNft(
      payer,
      connection,
      outputItemClass.mints[0],
      outputItemClass.itemClass
    );

    // create deterministic pda
    const deterministicOutputs = await createDeterministicIngredient(
      itemProgram.client.provider.connection,
      payer,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      1
    );

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
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

    // add pNFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      0,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // complete build and receive the item
    await completeBuildItemAndReceiveItem(
      connection,
      outputItemClass.tree,
      0,
      build,
      outputItemClass.mints
    );

    // assert builder received the output item and the deterministic item
    const expectedMints: anchor.web3.PublicKey[] = [
      outputItemClass.mints[0],
      deterministicOutputs[0].mint,
    ];
    for (let expected of expectedMints) {
      const builderItemAta = splToken.getAssociatedTokenAddressSync(
        expected,
        new anchor.web3.PublicKey(payer.publicKey)
      );
      const tokenBalanceResponse =
        await itemProgram.client.provider.connection.getTokenAccountBalance(
          builderItemAta
        );
      assert.isTrue(
        new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
      );
    }

    await cleanBuild(itemProgram, build);
  });

  it("build item with recipe selection", async () => {
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
      buildPermitRequired: false,
      selectableOutputs: [],
    });

    // create mints for selectable outputs
    const outputSelectionGroups = await createOutputSelectionGroups(
      connection,
      payer,
      1
    );

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: true,
      payment: null,
      ingredientArgs: [
        {
          itemClass: pNftItemClass.itemClass,
          requiredAmount: new BN(1),
          buildEffect: {
            degradation: null,
            cooldown: null,
          },
          isDeterministic: false,
        },
      ],
      buildPermitRequired: false,
      selectableOutputs: outputSelectionGroups,
    });

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(payer, connection, mint, outputItemClass.itemClass);
    }

    // transfer selectable outputs to the item class
    for (let group of outputSelectionGroups) {
      for (let choice of group.choices) {
        // transfer the nft to the item class
        const ata = splToken.getAssociatedTokenAddressSync(
          choice.mint,
          outputItemClass.itemClass,
          true
        );
        const createAtaIx =
          splToken.createAssociatedTokenAccountIdempotentInstruction(
            payer.publicKey,
            ata,
            outputItemClass.itemClass,
            choice.mint
          );
        const transferIx = splToken.createTransferInstruction(
          splToken.getAssociatedTokenAddressSync(choice.mint, payer.publicKey),
          ata,
          payer.publicKey,
          1
        );

        const transferTx = new anchor.web3.Transaction().add(
          createAtaIx,
          transferIx
        );

        const transferNftTxSig =
          await itemProgram.client.provider.sendAndConfirm(transferTx, [], {});
        console.log("transferNftTxSig: %s", transferNftTxSig);
      }
    }

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [{ groupId: 0, outputId: 0 }],
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

    // add pNFT to build
    await addIngredient(
      itemProgram,
      pNftItemClass.tree,
      0,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // complete build and receive the item
    await completeBuildItemAndReceiveItem(
      connection,
      outputItemClass.tree,
      0,
      build,
      outputItemClass.mints
    );

    // assert builder received the output item and the deterministic item
    const expectedMints: anchor.web3.PublicKey[] = [
      outputItemClass.mints[0],
      outputSelectionGroups[0].choices[0].mint,
    ];
    for (let expected of expectedMints) {
      const builderItemAta = splToken.getAssociatedTokenAddressSync(
        expected,
        new anchor.web3.PublicKey(payer.publicKey)
      );
      const tokenBalanceResponse =
        await itemProgram.client.provider.connection.getTokenAccountBalance(
          builderItemAta
        );
      assert.isTrue(
        new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
      );
    }

    await cleanBuild(itemProgram, build);
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
    outputMode: { kind: "Item" },
  };

  let [itemClass, createItemClassResult] = await itemProgram.createItemClassV1(
    createItemClassArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  const tree = initTree({ maxDepth: 16, maxBufferSize: 64 });
  console.log("tree created: %s", itemClass.toString());

  // collection nft for ingredient

  const mints: anchor.web3.PublicKey[] = [];
  for (let i = 0; i < ingredientCount; i++) {
    const client = new metaplex.Metaplex(connection, {}).use(
      metaplex.keypairIdentity(payer)
    );

    let ingredientMintOutput: metaplex.CreateNftOutput;
    if (isPNft) {
      const ingredientCollectionNft = await createCollectionPNft(
        payer,
        connection
      );

      const ruleSetPda = await createRuleSet(payer, connection);

      ingredientMintOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.ProgrammableNonFungible,
        uri: "https://foo.com/bar.json",
        name: "pNFT1",
        sellerFeeBasisPoints: 500,
        symbol: "PN",
        ruleSet: ruleSetPda,
        collection: ingredientCollectionNft,
      });
      console.log(
        "createPNftTxSig: %s",
        ingredientMintOutput.response.signature
      );

      const ata = splToken.getAssociatedTokenAddressSync(
        ingredientCollectionNft,
        payer.publicKey
      );

      const [collectionMetadata, _collectionMetadataBump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            mpl.PROGRAM_ID.toBuffer(),
            ingredientCollectionNft.toBuffer(),
          ],
          mpl.PROGRAM_ID
        );

      const [tokenRecord, _tokenRecordBump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            mpl.PROGRAM_ID.toBuffer(),
            ingredientCollectionNft.toBuffer(),
            Buffer.from("token_record"),
            ata.toBuffer(),
          ],
          mpl.PROGRAM_ID
        );

      const [collectionME, _collectionMEBump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            mpl.PROGRAM_ID.toBuffer(),
            ingredientCollectionNft.toBuffer(),
            Buffer.from("edition"),
          ],
          mpl.PROGRAM_ID
        );

      const verifyIx = mpl.createVerifyInstruction(
        {
          authority: payer.publicKey,
          delegateRecord: tokenRecord,
          metadata: ingredientMintOutput.metadataAddress,
          collectionMint: ingredientCollectionNft,
          collectionMetadata: collectionMetadata,
          collectionMasterEdition: collectionME,
          sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        {
          verificationArgs: mpl.VerificationArgs.CollectionV1,
        }
      );
      const verifyTxSig = await connection.sendTransaction(
        new anchor.web3.Transaction().add(verifyIx),
        [payer],
        { skipPreflight: false }
      );
      console.log("verifyTxSig: %s", verifyTxSig);
      await connection.confirmTransaction(verifyTxSig);
    } else {
      const ingredientCollectionNft = await createCollectionNft(
        payer,
        connection
      );

      ingredientMintOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.NonFungible,
        uri: "https://foo.com/bar.json",
        name: "NFT1",
        sellerFeeBasisPoints: 500,
        symbol: "N",
        collection: ingredientCollectionNft,
        collectionAuthority: payer,
      });
      console.log(
        "createNftTxSig: %s",
        ingredientMintOutput.response.signature
      );
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
  return { itemClass, mints, tree };
}

async function createItemClassPack(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  recipeArgs: Instructions.Item.RecipeArgs,
  packConfig: PackConfig[]
): Promise<ItemClassPackContainer> {
  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  let createItemClassArgs: Instructions.Item.CreateItemClassV1Args = {
    recipeArgs: recipeArgs,
    outputMode: { kind: "Pack", index: new BN(0) },
  };

  let [itemClass, createItemClassResult] = await itemProgram.createItemClassV1(
    createItemClassArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  const tree = initTree({ maxDepth: 16, maxBufferSize: 64 });
  console.log("tree created: %s", itemClass.toString());

  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(payer)
  );

  const packs: Instructions.Item.PackContents[] = [];
  for (let y = 0; y < packConfig.length; y++) {
    // entries for one pack
    const entries: Instructions.Item.PackContentsEntry[] = [];

    // create all the pNfts
    for (let i = 0; i < packConfig[y].pNftCount; i++) {
      const ingredientCollectionNft = await createCollectionPNft(
        payer,
        connection
      );

      const ruleSetPda = await createRuleSet(payer, connection);

      const ingredientMintOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.ProgrammableNonFungible,
        uri: "https://foo.com/bar.json",
        name: "pNFT1",
        sellerFeeBasisPoints: 500,
        symbol: "PN",
        ruleSet: ruleSetPda,
        collection: ingredientCollectionNft,
      });
      console.log(
        "createPNftTxSig: %s",
        ingredientMintOutput.response.signature
      );

      const ata = splToken.getAssociatedTokenAddressSync(
        ingredientCollectionNft,
        payer.publicKey
      );

      const [collectionMetadata, _collectionMetadataBump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            mpl.PROGRAM_ID.toBuffer(),
            ingredientCollectionNft.toBuffer(),
          ],
          mpl.PROGRAM_ID
        );

      const [tokenRecord, _tokenRecordBump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            mpl.PROGRAM_ID.toBuffer(),
            ingredientCollectionNft.toBuffer(),
            Buffer.from("token_record"),
            ata.toBuffer(),
          ],
          mpl.PROGRAM_ID
        );

      const [collectionME, _collectionMEBump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            mpl.PROGRAM_ID.toBuffer(),
            ingredientCollectionNft.toBuffer(),
            Buffer.from("edition"),
          ],
          mpl.PROGRAM_ID
        );

      const verifyIx = mpl.createVerifyInstruction(
        {
          authority: payer.publicKey,
          delegateRecord: tokenRecord,
          metadata: ingredientMintOutput.metadataAddress,
          collectionMint: ingredientCollectionNft,
          collectionMetadata: collectionMetadata,
          collectionMasterEdition: collectionME,
          sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        {
          verificationArgs: mpl.VerificationArgs.CollectionV1,
        }
      );
      const verifyTxSig = await connection.sendTransaction(
        new anchor.web3.Transaction().add(verifyIx),
        [payer],
        { skipPreflight: false }
      );
      console.log("verifyTxSig: %s", verifyTxSig);
      await connection.confirmTransaction(verifyTxSig);

      // transfer the pNFT to the item class
      await transferPNft(
        payer,
        connection,
        ingredientMintOutput.mintAddress,
        itemClass
      );

      entries.push({
        mint: ingredientMintOutput.mintAddress,
        amount: new BN(1),
      });
    }

    // create all nfts
    for (let j = 0; j < packConfig[y].nftCount; j++) {
      const ingredientCollectionNft = await createCollectionNft(
        payer,
        connection
      );

      const ingredientMintOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.NonFungible,
        uri: "https://foo.com/bar.json",
        name: "NFT1",
        sellerFeeBasisPoints: 500,
        symbol: "N",
        collection: ingredientCollectionNft,
        collectionAuthority: payer,
      });
      console.log(
        "createNftTxSig: %s",
        ingredientMintOutput.response.signature
      );

      // transfer the nft to the item class
      const ata = splToken.getAssociatedTokenAddressSync(
        ingredientMintOutput.mintAddress,
        itemClass,
        true
      );
      const createAtaIx =
        splToken.createAssociatedTokenAccountIdempotentInstruction(
          payer.publicKey,
          ata,
          itemClass,
          ingredientMintOutput.mintAddress
        );
      const transferIx = splToken.createTransferInstruction(
        ingredientMintOutput.tokenAddress,
        ata,
        payer.publicKey,
        1
      );

      const transferTx = new anchor.web3.Transaction().add(
        createAtaIx,
        transferIx
      );

      const transferNftTxSig = await itemProgram.client.provider.sendAndConfirm(
        transferTx,
        [],
        {}
      );
      console.log("transferNftTxSig: %s", transferNftTxSig);

      entries.push({
        mint: ingredientMintOutput.mintAddress,
        amount: new BN(1),
      });
    }

    // create all sfts
    for (let k = 0; k < packConfig[y].sftCount; k++) {
      const mint = anchor.web3.Keypair.generate();

      const createMintAccountIx = await anchor.web3.SystemProgram.createAccount(
        {
          programId: splToken.TOKEN_PROGRAM_ID,
          space: splToken.MintLayout.span,
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint.publicKey,
          lamports: await connection.getMinimumBalanceForRentExemption(
            splToken.MintLayout.span
          ),
        }
      );

      const mintIx = await splToken.createInitializeMintInstruction(
        mint.publicKey,
        0,
        payer.publicKey,
        payer.publicKey
      );

      // create metadata
      const [metadata, _metadataBump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            mpl.PROGRAM_ID.toBuffer(),
            mint.publicKey.toBuffer(),
          ],
          mpl.PROGRAM_ID
        );

      const mdAccounts: mpl.CreateMetadataAccountV3InstructionAccounts = {
        metadata: metadata,
        mint: mint.publicKey,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey,
      };
      const mdData: mpl.DataV2 = {
        name: "SFT",
        symbol: "SFT".toUpperCase().substring(0, 2),
        uri: "https://foo.com/bar.json",
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      };

      const mdArgs: mpl.CreateMetadataAccountArgsV3 = {
        data: mdData,
        isMutable: true,
        collectionDetails: null,
      };
      const ixArgs: mpl.CreateMetadataAccountV3InstructionArgs = {
        createMetadataAccountArgsV3: mdArgs,
      };
      const metadataIx = mpl.createCreateMetadataAccountV3Instruction(
        mdAccounts,
        ixArgs
      );

      // mint the tokens to the item class
      const amount = 10;
      const ata = splToken.getAssociatedTokenAddressSync(
        mint.publicKey,
        itemClass,
        true
      );
      const createAtaIx =
        await splToken.createAssociatedTokenAccountIdempotentInstruction(
          payer.publicKey,
          ata,
          itemClass,
          mint.publicKey
        );
      const mintToIx = await splToken.createMintToInstruction(
        mint.publicKey,
        ata,
        payer.publicKey,
        amount
      );

      // create transaction
      const createSftTx = new anchor.web3.Transaction().add(
        createMintAccountIx,
        mintIx,
        metadataIx,
        createAtaIx,
        mintToIx
      );

      const createSftTxSig = await itemProgram.client.provider.sendAndConfirm(
        createSftTx,
        [mint],
        {}
      );
      console.log("createSftTxSig: %s", createSftTxSig);

      entries.push({ mint: mint.publicKey, amount: new BN(amount) });
    }

    // create pack
    const packContents = new Instructions.Item.PackContents(entries);
    packs.push(packContents);

    const createPackAccounts: Instructions.Item.CreatePackAccounts = {
      itemClass: itemClass,
    };

    const createPackArgs: Instructions.Item.CreatePackArgs = {
      contentsHash: packContents.hash(new Uint8Array(16)),
    };

    const [createPackResult, pack] = await itemProgram.createPack(
      createPackAccounts,
      createPackArgs
    );
    console.log("createPackTxSig: %s", createPackResult.txid);
    console.log(
      "itemClass: %s, pack: %s",
      itemClass.toString(),
      pack.toString()
    );

    // add mint to items tree off chain
    tree.updateLeaf(y, pack.toBuffer());
  }

  return { itemClass, tree, packs };
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

async function createCollectionNft(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
): Promise<anchor.web3.PublicKey> {
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

  return result.mintAddress;
}

async function createCollectionPNft(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
): Promise<anchor.web3.PublicKey> {
  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(payer)
  );

  const result = await client.nfts().create({
    tokenStandard: mpl.TokenStandard.ProgrammableNonFungible,
    uri: "https://foo.com/bar.json",
    name: "collectionNft",
    sellerFeeBasisPoints: 0,
    symbol: "CN",
    isCollection: true,
  });

  return result.mintAddress;
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
        All: {
          rules: [],
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
  leafIndex: number,
  outputItemClass: anchor.web3.PublicKey,
  ingredientMint: anchor.web3.PublicKey,
  ingredientItemClass: anchor.web3.PublicKey,
  ingredientAmount: anchor.BN
) {
  // verify build ingredient
  const verifyIngredientAccounts: Instructions.Item.VerifyIngredientAccounts = {
    ingredientMint: ingredientMint,
    ingredientItemClass: ingredientItemClass,
    itemClass: outputItemClass,
    builder: itemProgram.client.provider.publicKey,
    payer: itemProgram.client.provider.publicKey,
  };

  // get proof for mint
  const proof = tree.getProof(leafIndex);

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
    payer: itemProgram.client.provider.publicKey,
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

async function addIngredientPermissionless(
  itemProgram: ItemProgram,
  builder: anchor.web3.PublicKey,
  tree: cmp.MerkleTree,
  outputItemClass: anchor.web3.PublicKey,
  ingredientMint: anchor.web3.PublicKey,
  ingredientItemClass: anchor.web3.PublicKey,
  ingredientAmount: anchor.BN
) {
  // verify build ingredient
  const verifyIngredientAccounts: Instructions.Item.VerifyIngredientAccounts = {
    ingredientMint: ingredientMint,
    ingredientItemClass: ingredientItemClass,
    itemClass: outputItemClass,
    builder: builder,
    payer: itemProgram.client.provider.publicKey,
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
    builder: builder,
    payer: itemProgram.client.provider.publicKey,
  };

  const addIngredientArgs: Instructions.Item.AddIngredientArgs = {
    amount: ingredientAmount,
  };

  const addIngredientResult = await itemProgram.addIngredient(
    addIngredientAccounts,
    addIngredientArgs
  );
  console.log("addIngredientPermissionlessTxSig: %s", addIngredientResult.txid);
}

async function completeBuildItemAndReceiveItem(
  connection: anchor.web3.Connection,
  tree: cmp.MerkleTree,
  leafIndex: number,
  build: anchor.web3.PublicKey,
  outputItemMints: anchor.web3.PublicKey[]
) {
  const signer = await initSigner(TEST_SIGNER_FILE_PATH, connection);

  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(signer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  // complete the build process
  const completeBuildItemAccounts: Instructions.Item.CompleteBuildItemAccounts =
    {
      itemMint: outputItemMints[leafIndex],
      payer: itemProgram.client.provider.publicKey,
      build: build,
    };

  const proof = tree.getProof(leafIndex);

  const completeBuildItemArgs: Instructions.Item.CompleteBuildItemArgs = {
    root: proof.root,
    leafIndex: proof.leafIndex,
    proof: proof.proof,
  };

  const completeBuildResult = await itemProgram.completeBuildItem(
    completeBuildItemAccounts,
    completeBuildItemArgs
  );
  console.log("completeBuildItemTxSig: %s", completeBuildResult.txid);

  // send item to builder
  const receiveItemAccounts: Instructions.Item.ReceiveItemAccounts = {
    build: build,
    payer: itemProgram.client.provider.publicKey,
  };

  const receiveItemResults = await itemProgram.receiveItem(receiveItemAccounts);
  for (let result of receiveItemResults) {
    console.log("receiveItemTxSig: %s", result.txid);
  }
}

async function completeBuildPackAndReceiveItems(
  connection: anchor.web3.Connection,
  tree: cmp.MerkleTree,
  leafIndex: number,
  build: anchor.web3.PublicKey,
  pack: anchor.web3.PublicKey,
  packContents: Instructions.Item.PackContents
) {
  const signer = await initSigner(TEST_SIGNER_FILE_PATH, connection);

  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(signer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  // complete the build process
  const completeBuildPackAccounts: Instructions.Item.CompleteBuildPackAccounts =
    {
      pack: pack,
      payer: itemProgram.client.provider.publicKey,
      build: build,
    };

  const proof = tree.getProof(leafIndex);

  const completeBuildPackArgs: Instructions.Item.CompleteBuildPackArgs = {
    root: proof.root,
    leafIndex: proof.leafIndex,
    proof: proof.proof,
    packContents: packContents,
    packContentsHashNonce: new Uint8Array(16),
  };

  const completeBuildResult = await itemProgram.completeBuildPack(
    completeBuildPackAccounts,
    completeBuildPackArgs
  );
  console.log("completeBuildPackTxSig: %s", completeBuildResult.txid);

  // send item to builder
  const receiveItemAccounts: Instructions.Item.ReceiveItemAccounts = {
    build: build,
    payer: itemProgram.client.provider.publicKey,
  };

  const receiveItemResults = await itemProgram.receiveItem(receiveItemAccounts);
  for (let result of receiveItemResults) {
    console.log("receiveItemTxSig: %s", result.txid);
  }
}

async function cleanBuild(
  itemProgram: ItemProgram,
  build: anchor.web3.PublicKey
) {
  // get all build ingredient mints/item classes
  const buildData = await itemProgram.client.account.build.fetch(build);
  // [item_class, mint pubkeys]
  const buildIngredientMints: [
    anchor.web3.PublicKey,
    anchor.web3.PublicKey[]
  ][] = [];
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
      const item = Utils.PDA.getItemV1(mint);
      const itemData = await itemProgram.getItemV1(item);

      if (itemData.itemState.durability.lte(new anchor.BN(0))) {
        // destroy it
        const destroyIngredientAccounts: Instructions.Item.DestroyIngredientAccounts =
          {
            ingredientMint: mint,
            ingredientItemClass: buildIngredientData[0],
            build: build,
            payer: itemProgram.client.provider.publicKey,
          };

        const destroyIngredientResult = await itemProgram.destroyIngredient(
          destroyIngredientAccounts
        );
        console.log("destroyIngredientTxSig: %s", destroyIngredientResult.txid);
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
        console.log("returnIngredientTxSig: %s", returnIngredientResult.txid);
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

async function createDeterministicIngredient(
  connection: anchor.web3.Connection,
  authority: anchor.web3.Keypair,
  itemClass: anchor.web3.PublicKey,
  ingredientMint: anchor.web3.PublicKey,
  outputCount: number
): Promise<State.Item.DeterministicIngredientOutput[]> {
  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(authority),
      {
        commitment: "confirmed",
      }
    ),
    idl: Idls.ItemIDL,
  });

  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(authority)
  );

  // create output mints and mint to item class
  const deterministicIngredientOutputs: State.Item.DeterministicIngredientOutput[] =
    [];
  for (let i = 0; i < outputCount; i++) {
    const ingredientCollectionNft = await createCollectionNft(
      authority,
      connection
    );

    const ingredientMintOutput = await client.nfts().create({
      tokenStandard: mpl.TokenStandard.NonFungible,
      uri: "https://foo.com/bar.json",
      name: "NFT1",
      sellerFeeBasisPoints: 500,
      symbol: "N",
      collection: ingredientCollectionNft,
      collectionAuthority: authority,
    });
    console.log("createNftTxSig: %s", ingredientMintOutput.response.signature);

    // transfer the nft to the item class
    const ata = splToken.getAssociatedTokenAddressSync(
      ingredientMintOutput.mintAddress,
      itemClass,
      true
    );
    const createAtaIx =
      splToken.createAssociatedTokenAccountIdempotentInstruction(
        authority.publicKey,
        ata,
        itemClass,
        ingredientMintOutput.mintAddress
      );
    const transferIx = splToken.createTransferInstruction(
      ingredientMintOutput.tokenAddress,
      ata,
      authority.publicKey,
      1
    );

    const transferTx = new anchor.web3.Transaction().add(
      createAtaIx,
      transferIx
    );

    const transferNftTxSig = await itemProgram.client.provider.sendAndConfirm(
      transferTx,
      [],
      {}
    );
    console.log("transferNftTxSig: %s", transferNftTxSig);
    deterministicIngredientOutputs.push({
      mint: ingredientMintOutput.mintAddress,
      amount: new anchor.BN(1),
    });
  }

  // create the deterministic ingredient pda for the pNft ingredient

  const createDeterministicIngredientResult =
    await itemProgram.createDeterministicIngredient(
      { itemClass: itemClass, ingredientMint: ingredientMint },
      { outputs: deterministicIngredientOutputs }
    );
  console.log(
    "createDeterministicIngredientTxSig: %s",
    createDeterministicIngredientResult.txid
  );

  return deterministicIngredientOutputs;
}

async function createOutputSelectionGroups(
  connection: anchor.web3.Connection,
  authority: anchor.web3.Keypair,
  groupCount: number
): Promise<State.Item.OutputSelectionGroup[]> {
  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(authority),
      {
        commitment: "confirmed",
      }
    ),
    idl: Idls.ItemIDL,
  });

  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(authority)
  );

  // create output mints and mint to item class
  const outputSelectionGroups: State.Item.OutputSelectionGroup[] = [];
  for (let i = 0; i < groupCount; i++) {
    const ingredientCollectionNft = await createCollectionNft(
      authority,
      connection
    );

    const ingredientMintOutput = await client.nfts().create({
      tokenStandard: mpl.TokenStandard.NonFungible,
      uri: "https://foo.com/bar.json",
      name: "NFT1",
      sellerFeeBasisPoints: 500,
      symbol: "N",
      collection: ingredientCollectionNft,
      collectionAuthority: authority,
    });
    console.log("createNftTxSig: %s", ingredientMintOutput.response.signature);

    outputSelectionGroups.push({
      groupId: i,
      choices: [
        {
          outputId: 0,
          mint: ingredientMintOutput.mintAddress,
          amount: new BN(1),
        },
      ],
      maxChoices: 1,
    });
  }

  return outputSelectionGroups;
}

async function createDelegateAuthorityPNftIx(
  authority: anchor.web3.Keypair,
  delegate: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.TransactionInstruction> {
  const ata = splToken.getAssociatedTokenAddressSync(mint, authority.publicKey);

  const [metadata, _metadataBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), mpl.PROGRAM_ID.toBuffer(), mint.toBuffer()],
      mpl.PROGRAM_ID
    );

  const [masterEdition, _masterEditionBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

  const [tokenRecord, _tokenRecordBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("token_record"),
        ata.toBuffer(),
      ],
      mpl.PROGRAM_ID
    );

  const [ruleSetPda, _ruleSetBump] = await mplAuth.findRuleSetPDA(
    authority.publicKey,
    "AllRuleSet"
  );

  // delegate clay ix
  const ix = mpl.createDelegateInstruction(
    {
      delegate: delegate,
      metadata: metadata,
      masterEdition: masterEdition,
      tokenRecord: tokenRecord,
      mint: mint,
      token: ata,
      authority: authority.publicKey,
      payer: authority.publicKey,
      authorizationRules: ruleSetPda,
      authorizationRulesProgram: mplAuth.PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      splTokenProgram: splToken.TOKEN_PROGRAM_ID,
    },
    {
      delegateArgs: {
        __kind: "TransferV1",
        amount: 1,
        authorizationData: null,
      },
    }
  );

  return ix;
}

function createDelegateAuthoritySplIx(
  authority: anchor.web3.Keypair,
  delegate: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey,
  amount: number
): anchor.web3.TransactionInstruction {
  const ata = splToken.getAssociatedTokenAddressSync(mint, authority.publicKey);
  const ix = splToken.createApproveInstruction(
    ata,
    delegate,
    authority.publicKey,
    amount
  );
  return ix;
}

interface ItemClassContainer {
  itemClass: anchor.web3.PublicKey;
  mints: anchor.web3.PublicKey[];
  tree: cmp.MerkleTree;
}

interface ItemClassPackContainer {
  itemClass: anchor.web3.PublicKey;
  tree: cmp.MerkleTree;
  packs: Instructions.Item.PackContents[];
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

async function assertRejects(fn: Promise<any | void>) {
  let err: Error;
  try {
    await fn;
  } catch (e) {
    err = e;
  } finally {
    if (!err) {
      assert.fail("should have failed");
    }
  }
}

// either read from file or env var
async function initSigner(
  filePath: string,
  connection: anchor.web3.Connection
): Promise<anchor.web3.Keypair> {
  let kpSecret;
  try {
    kpSecret = fs.readFileSync(
      filePath.startsWith("/") ? filePath : path.join(process.cwd(), filePath),
      "utf8"
    );
  } catch (_e) {
    try {
      kpSecret = Buffer.from(process.env.TEST_SIGNER, "utf8");
    } catch (_e) {
      throw new Error(
        `It's required to have a signer for testing raindrops_item, refer to the static variable 'TEST_SIGNER' in the program code`
      );
    }
  }

  const keypairSecret = new Uint8Array(JSON.parse(kpSecret));

  const signer = anchor.web3.Keypair.fromSecretKey(keypairSecret);

  // get this signer some lamports
  const airdropTxSig = await connection.requestAirdrop(
    signer.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropTxSig, "confirmed");

  return signer;
}

interface PackConfig {
  sftCount: number;
  pNftCount: number;
  nftCount: number;
}
