import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as metaplex from "@metaplex-foundation/js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Instructions,
  Idls,
  ItemProgramV2,
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

describe.only("itemv2", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it("build pNFT using 1 NFT and 1 pNFT, nft burned after", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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
    const escrowPaymentAccounts: Instructions.ItemV2.EscrowPaymentAccounts = {
      build: build,
      builder: itemProgram.client.provider.publicKey!,
    };

    const escrowPaymentResult = await itemProgram.escrowPayment(
      escrowPaymentAccounts
    );
    console.log("escrowPaymentTxSig: %s", escrowPaymentResult.txid);

    // complete build and receive the item
    await completeBuildMerkleTreeAndReceiveItem(
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
    const verifyIngredientTestAccounts: Instructions.ItemV2.VerifyIngredientMerkleTreeTestAccounts =
      {
        ingredientMint: pNftItemClass.mints[0],
        ingredientItemClass: pNftItemClass.itemClass,
        payer: itemProgram.client.provider.publicKey,
      };

    // get proof for mint
    const proof = pNftItemClass.tree.getProof(0);

    const verifyIngredientArgs: Instructions.ItemV2.VerifyIngredientArgs = {
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

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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
    const escrowPaymentAccounts: Instructions.ItemV2.EscrowPaymentAccounts = {
      build: build,
      builder: itemProgram.client.provider.publicKey!,
    };

    const escrowPaymentResult = await itemProgram.escrowPayment(
      escrowPaymentAccounts
    );
    console.log("escrowPaymentTxSig: %s", escrowPaymentResult.txid);

    // complete build and receive the item
    await completeBuildMerkleTreeAndReceiveItem(
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
    const item = State.ItemV2.getItemPda(pNftItemClass.mints[0]);
    const itemData = await itemProgram.getItem(item);
    assert.isTrue(itemData.itemState.cooldown.gt(new BN(0)));

    // start the build process again
    const startBuild2Accounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuild2Args: Instructions.ItemV2.StartBuildArgs = {
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

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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
    const escrowPaymentAccounts: Instructions.ItemV2.EscrowPaymentAccounts = {
      build: build,
      builder: itemProgram.client.provider.publicKey!,
    };

    const escrowPaymentResult = await itemProgram.escrowPayment(
      escrowPaymentAccounts
    );
    console.log("escrowPaymentTxSig: %s", escrowPaymentResult.txid);

    // complete build and receive the item
    await completeBuildMerkleTreeAndReceiveItem(
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

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
      const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
        itemClass: outputItemClass.itemClass,
        builder: itemProgram.client.provider.publicKey,
      };

      const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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

      const escrowPaymentAccounts: Instructions.ItemV2.EscrowPaymentAccounts = {
        build: build,
        builder: itemProgram.client.provider.publicKey!,
      };

      const escrowPaymentResult = await itemProgram.escrowPayment(
        escrowPaymentAccounts
      );
      console.log("escrowPaymentTxSig: %s", escrowPaymentResult.txid);

      // complete build and receive the item
      await completeBuildMerkleTreeAndReceiveItem(
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

    const builderItemProgramV2 = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
      }
    );

    const crankItemProgramV2 = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(crank),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: builderItemProgramV2.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
    };

    const startBuildResult = await builderItemProgramV2.startBuild(
      startBuildAccounts,
      startBuildArgs
    );
    console.log("startBuildTxSig: %s", startBuildResult.txid);

    const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        builderItemProgramV2.client.provider.publicKey!.toBuffer(),
      ],
      builderItemProgramV2.id
    );

    await assertFreshBuild(
      builderItemProgramV2,
      build,
      payer.publicKey,
      outputItemClass.itemClass
    );

    // add pNFT to build
    await addIngredient(
      builderItemProgramV2,
      pNftItemClass.tree,
      0,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add NFT to build
    await addIngredient(
      builderItemProgramV2,
      pNftItemClass.tree,
      0,
      outputItemClass.itemClass,
      nftItemClass.mints[0],
      nftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add payment to build
    const escrowPaymentAccounts: Instructions.ItemV2.EscrowPaymentAccounts = {
      build: build,
      builder: builderItemProgramV2.client.provider.publicKey!,
    };

    const escrowPaymentResult = await builderItemProgramV2.escrowPayment(
      escrowPaymentAccounts
    );
    console.log("escrowPaymentTxSig: %s", escrowPaymentResult.txid);

    // complete build and receive the item
    await completeBuildMerkleTreeAndReceiveItem(
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
      await builderItemProgramV2.client.provider.connection.getTokenAccountBalance(
        builderItemAta
      );
    assert.isTrue(
      new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
    );

    await cleanBuild(crankItemProgramV2, build);
  });

  it("create item class with multiple recipes", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
      }
    );

    let createItemClassArgs: Instructions.ItemV2.CreateItemClassArgs = {
      itemClassName: "testing",
      mode: { kind: "MerkleTree" },
    };

    let [itemClass, createItemClassResult] = await itemProgram.createItemClass(
      createItemClassArgs
    );
    console.log("createItemClassTxSig: %s", createItemClassResult.txid);

    // no recipes created initially
    const itemClassData0 = await itemProgram.getItemClass(itemClass);
    assert.isNull(itemClassData0.recipeIndex);

    const createRecipe1Accounts: Instructions.ItemV2.CreateRecipeAccounts = {
      itemClass: itemClass,
    };

    const createRecipe1Args: Instructions.ItemV2.CreateRecipeArgs = {
      args: {
        buildEnabled: false,
        payment: null,
        ingredientArgs: [],
        buildPermitRequired: false,
        selectableOutputs: [],
      },
    };

    const createRecipe1Result = await itemProgram.createRecipe(
      createRecipe1Accounts,
      createRecipe1Args
    );
    console.log("createRecipe1TxSig: %s", createRecipe1Result.txid);

    // after 1 recipe have been created
    const itemClassData1 = await itemProgram.getItemClass(itemClass);
    assert.isTrue(itemClassData1.recipeIndex.eq(new anchor.BN(0)));

    const createRecipe2Accounts: Instructions.ItemV2.CreateRecipeAccounts = {
      itemClass: itemClass,
    };

    const createRecipe2Args: Instructions.ItemV2.CreateRecipeArgs = {
      args: {
        buildEnabled: false,
        payment: null,
        ingredientArgs: [],
        buildPermitRequired: false,
        selectableOutputs: [],
      },
    };

    const createRecipe2Result = await itemProgram.createRecipe(
      createRecipe2Accounts,
      createRecipe2Args
    );
    console.log("createRecipe2TxSig: %s", createRecipe2Result.txid);

    // after 2 recipes have been created
    const itemClassData2 = await itemProgram.getItemClass(itemClass);
    assert.isTrue(itemClassData2.recipeIndex.eq(new anchor.BN(1)));
  });

  it("build pNFT with only 1 signature from builder", async () => {
    const builder = await newPayer(connection);
    const payer = await newPayer(connection);

    const itemProgramPayer = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
      }
    );

    const itemProgramBuilder = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(builder),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgramBuilder.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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
    const escrowPaymentAccounts: Instructions.ItemV2.EscrowPaymentAccounts = {
      build: build,
      builder: itemProgramBuilder.client.provider.publicKey!,
    };

    const escrowPaymentIx = await itemProgramBuilder.instruction.escrowPayment(
      escrowPaymentAccounts
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
      escrowPaymentIx
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
    await completeBuildMerkleTreeAndReceiveItem(
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

  it("open a pack of 3 pNFTs", async () => {
    const builder = await newPayer(connection);
    const payer = await newPayer(connection);

    const builderItemProgramV2 = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(builder),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
    const pack = State.ItemV2.getPackPda(outputItemClass.itemClass, new BN(0));
    const packData = await builderItemProgramV2.getPack(pack);
    assert.isTrue(packData.contentsHash.length === 32);
    assert.isTrue(packData.itemClass.equals(outputItemClass.itemClass));
    assert.isTrue(packData.id.eq(new BN(0)));

    // start the build process
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: builderItemProgramV2.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
    };

    const startBuildResult = await builderItemProgramV2.startBuild(
      startBuildAccounts,
      startBuildArgs
    );
    console.log("startBuildTxSig: %s", startBuildResult.txid);

    const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        builderItemProgramV2.client.provider.publicKey!.toBuffer(),
      ],
      builderItemProgramV2.id
    );

    await assertFreshBuild(
      builderItemProgramV2,
      build,
      builder.publicKey,
      outputItemClass.itemClass
    );

    // add pack to the build
    await addIngredient(
      builderItemProgramV2,
      packItemClass.tree,
      0,
      outputItemClass.itemClass,
      packItemClass.mints[0],
      packItemClass.itemClass,
      new anchor.BN(1)
    );

    // add payment to build
    const escrowPaymentAccounts: Instructions.ItemV2.EscrowPaymentAccounts = {
      build: build,
      builder: builderItemProgramV2.client.provider.publicKey!,
    };

    const escrowPaymentResult = await builderItemProgramV2.escrowPayment(
      escrowPaymentAccounts
    );
    console.log("escrowPaymentTxSig: %s", escrowPaymentResult.txid);

    // complete build and receive the item
    await completeBuildPackAndReceiveItems(
      connection,
      build,
      pack,
      outputItemClass.packs[0]
    );

    // clean up
    await cleanBuild(builderItemProgramV2, build);
  });

  it("open a pack of 6 tokens, 1 pNFT and 5 SFTs", async () => {
    const builder = await newPayer(connection);
    const payer = await newPayer(connection);

    const builderItemProgramV2 = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(builder),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
    const pack = State.ItemV2.getPackPda(outputItemClass.itemClass, new BN(0));
    const packData = await builderItemProgramV2.getPack(pack);
    assert.isTrue(packData.contentsHash.length === 32);
    assert.isTrue(packData.itemClass.equals(outputItemClass.itemClass));
    assert.isTrue(packData.id.eq(new BN(0)));

    // start the build process
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: builderItemProgramV2.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
    };

    const startBuildResult = await builderItemProgramV2.startBuild(
      startBuildAccounts,
      startBuildArgs
    );
    console.log("startBuildTxSig: %s", startBuildResult.txid);

    const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        outputItemClass.itemClass.toBuffer(),
        builderItemProgramV2.client.provider.publicKey!.toBuffer(),
      ],
      builderItemProgramV2.id
    );

    await assertFreshBuild(
      builderItemProgramV2,
      build,
      builder.publicKey,
      outputItemClass.itemClass
    );

    // add pack to the build
    await addIngredient(
      builderItemProgramV2,
      packItemClass.tree,
      0,
      outputItemClass.itemClass,
      packItemClass.mints[0],
      packItemClass.itemClass,
      new anchor.BN(1)
    );

    // add payment to build
    const escrowPaymentAccounts: Instructions.ItemV2.EscrowPaymentAccounts = {
      build: build,
      builder: builderItemProgramV2.client.provider.publicKey!,
    };

    const escrowPaymentResult = await builderItemProgramV2.escrowPayment(
      escrowPaymentAccounts
    );
    console.log("escrowPaymentTxSig: %s", escrowPaymentResult.txid);

    // complete build and receive the item
    await completeBuildPackAndReceiveItems(
      connection,
      build,
      pack,
      outputItemClass.packs[0]
    );

    // clean up
    await cleanBuild(builderItemProgramV2, build);
  });

  it("open 3 packs", async () => {
    const builder = await newPayer(connection);
    const payer = await newPayer(connection);

    const builderItemProgramV2 = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(builder),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
    const packs = await builderItemProgramV2.getPacks(
      outputItemClass.itemClass
    );
    assert.strictEqual(packs.length, 3);
    for (let pack of packs) {
      assert.isTrue(pack.contentsHash.length === 32);
      assert.isTrue(pack.itemClass.equals(outputItemClass.itemClass));
    }
    console.log("pack data verified");

    for (let i = 0; i < packs.length; i++) {
      // start the build process
      const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
        itemClass: outputItemClass.itemClass,
        builder: builderItemProgramV2.client.provider.publicKey,
      };

      const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
        recipeIndex: new anchor.BN(0),
        recipeOutputSelection: [],
      };

      const startBuildResult = await builderItemProgramV2.startBuild(
        startBuildAccounts,
        startBuildArgs
      );
      console.log("startBuildTxSig: %s", startBuildResult.txid);

      const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("build"),
          outputItemClass.itemClass.toBuffer(),
          builderItemProgramV2.client.provider.publicKey!.toBuffer(),
        ],
        builderItemProgramV2.id
      );

      await assertFreshBuild(
        builderItemProgramV2,
        build,
        builder.publicKey,
        outputItemClass.itemClass
      );

      // add pack to the build
      await addIngredient(
        builderItemProgramV2,
        packItemClass.tree,
        i,
        outputItemClass.itemClass,
        packItemClass.mints[i],
        packItemClass.itemClass,
        new anchor.BN(1)
      );

      // add payment to build
      const escrowPaymentAccounts: Instructions.ItemV2.EscrowPaymentAccounts = {
        build: build,
        builder: builderItemProgramV2.client.provider.publicKey!,
      };

      const escrowPaymentResult = await builderItemProgramV2.escrowPayment(
        escrowPaymentAccounts
      );
      console.log("escrowPaymentTxSig: %s", escrowPaymentResult.txid);

      // complete build and receive the item
      await completeBuildPackAndReceiveItems(
        connection,
        build,
        packs[i].address,
        outputItemClass.packs[i]
      );

      // clean up
      await cleanBuild(builderItemProgramV2, build);
    }
  });

  it("build pNft requiring a build permit, after permit use try to build again and error", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
      }
    );

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
    const recipe = State.ItemV2.getRecipePda(
      outputItemClass.itemClass,
      new BN(0)
    );
    const recipeData = await itemProgram.getRecipe(recipe);
    assert.isTrue(recipeData.buildPermitRequired);

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(payer, connection, mint, outputItemClass.itemClass);
    }

    // create build permit for builder
    const createBuildPermitResult = await itemProgram.createBuildPermit(
      { itemClass: outputItemClass.itemClass, builder: payer.publicKey },
      { remainingBuilds: 1 }
    );
    console.log("createBuildPermitTxSig: %s", createBuildPermitResult.txid);

    const buildPermitDataPreBuild = await itemProgram.getBuildPermit(
      State.ItemV2.getBuildPermitPda(payer.publicKey, outputItemClass.itemClass)
    );
    assert.isTrue(
      buildPermitDataPreBuild.itemClass.equals(outputItemClass.itemClass)
    );
    assert.isTrue(buildPermitDataPreBuild.remainingBuilds === 1);
    assert.isTrue(buildPermitDataPreBuild.builder.equals(payer.publicKey));

    // start the build process
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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
    await completeBuildMerkleTreeAndReceiveItem(
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
      State.ItemV2.getBuildPermitPda(payer.publicKey, outputItemClass.itemClass)
    );
    assert.isNull(buildPermitDataPostBuild);

    // try t start the build process again, but this time we have no remaining uses and it will error
    const startBuildFailAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildFailArgs: Instructions.ItemV2.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [],
    };

    assertRejects(
      itemProgram.startBuild(startBuildFailAccounts, startBuildFailArgs)
    );
  });

  it("build pNft requiring a build permit twice", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
      }
    );

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
    const recipe = State.ItemV2.getRecipePda(
      outputItemClass.itemClass,
      new BN(0)
    );
    const recipeData = await itemProgram.getRecipe(recipe);
    assert.isTrue(recipeData.buildPermitRequired);

    // transfer output mints to their item class
    for (let mint of outputItemClass.mints) {
      await transferPNft(payer, connection, mint, outputItemClass.itemClass);
    }

    // create build permit for builder
    const createBuildPermitResult = await itemProgram.createBuildPermit(
      { itemClass: outputItemClass.itemClass, builder: payer.publicKey },
      { remainingBuilds: 2 }
    );
    console.log("createBuildPermitTxSig: %s", createBuildPermitResult.txid);

    const buildPermitDataPreBuild = await itemProgram.getBuildPermit(
      State.ItemV2.getBuildPermitPda(payer.publicKey, outputItemClass.itemClass)
    );
    assert.isTrue(
      buildPermitDataPreBuild.itemClass.equals(outputItemClass.itemClass)
    );
    assert.isTrue(buildPermitDataPreBuild.remainingBuilds === 2);
    assert.isTrue(buildPermitDataPreBuild.builder.equals(payer.publicKey));

    // start the build process
    const startBuild1Accounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuild1Args: Instructions.ItemV2.StartBuildArgs = {
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
    await completeBuildMerkleTreeAndReceiveItem(
      connection,
      outputItemClass.tree,
      0,
      build1,
      outputItemClass.mints
    );

    await cleanBuild(itemProgram, build1);

    const buildPermitDataPostBuild = await itemProgram.getBuildPermit(
      State.ItemV2.getBuildPermitPda(payer.publicKey, outputItemClass.itemClass)
    );
    assert.isTrue(
      buildPermitDataPostBuild.itemClass.equals(outputItemClass.itemClass)
    );
    assert.isTrue(buildPermitDataPostBuild.remainingBuilds === 1);
    assert.isTrue(buildPermitDataPostBuild.builder.equals(payer.publicKey));

    // start build 2
    const startBuild2Accounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuild2Args: Instructions.ItemV2.StartBuildArgs = {
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
    await completeBuildMerkleTreeAndReceiveItem(
      connection,
      outputItemClass.tree,
      1,
      build2,
      outputItemClass.mints
    );

    await cleanBuild(itemProgram, build1);

    const buildPermitDataPostBuild2 = await itemProgram.getBuildPermit(
      State.ItemV2.getBuildPermitPda(payer.publicKey, outputItemClass.itemClass)
    );
    assert.isNull(buildPermitDataPostBuild2);
  });

  it("build item using deterministic inputs", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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
    const recipe = State.ItemV2.getRecipePda(
      outputItemClass.itemClass,
      new anchor.BN(0)
    );
    const deterministicOutputs = await createDeterministicIngredient(
      itemProgram.client.provider.connection,
      payer,
      outputItemClass.itemClass,
      recipe,
      pNftItemClass.mints[0],
      3
    );

    // start the build process
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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
    await completeBuildMerkleTreeAndReceiveItem(
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

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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

    // create mints for selectable outputs
    const outputSelectionGroups = await createOutputSelectionGroups(
      connection,
      payer,
      2
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
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [
        { groupId: 0, outputId: 0 },
        { groupId: 1, outputId: 0 },
      ],
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
    await completeBuildMerkleTreeAndReceiveItem(
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
      outputSelectionGroups[1].choices[0].mint,
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

  it("open pack with selectable output and deterministic ingredient", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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

    // create mints for selectable outputs
    const outputSelectionGroups = await createOutputSelectionGroups(
      connection,
      payer,
      3
    );

    // output pNft
    const outputItemClass = await createItemClassPack(
      payer,
      connection,
      {
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
        selectableOutputs: outputSelectionGroups,
      },
      [
        {
          pNftCount: 2,
          nftCount: 2,
          sftCount: 3,
        },
      ]
    );

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

    // create deterministic pda
    const deterministicOutputs = await createDeterministicIngredient(
      itemProgram.client.provider.connection,
      payer,
      outputItemClass.itemClass,
      State.ItemV2.getRecipePda(outputItemClass.itemClass, new anchor.BN(0)),
      pNftItemClass.mints[0],
      1
    );

    // start the build process
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [
        { groupId: 0, outputId: 0 },
        { groupId: 1, outputId: 0 },
        { groupId: 2, outputId: 0 },
      ],
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
    const pack = State.ItemV2.getPackPda(outputItemClass.itemClass, new BN(0));
    await completeBuildPackAndReceiveItems(
      connection,
      build,
      pack,
      outputItemClass.packs[0]
    );

    const packMints: anchor.web3.PublicKey[] = [];
    for (let entry of outputItemClass.packs[0].entries) {
      packMints.push(entry.mint);
    }

    // assert builder received the pack items and the deterministic item
    const expectedMints: anchor.web3.PublicKey[] = [
      ...packMints,
      deterministicOutputs[0].mint,
      outputSelectionGroups[0].choices[0].mint,
      outputSelectionGroups[1].choices[0].mint,
      outputSelectionGroups[2].choices[0].mint,
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
        new anchor.BN(tokenBalanceResponse.value.amount).gt(new anchor.BN(0))
      );
    }

    await cleanBuild(itemProgram, build);
  });

  it("open pack with deterministic ingredient", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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

    // output pNft
    const outputItemClass = await createItemClassPack(
      payer,
      connection,
      {
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
      },
      [
        {
          pNftCount: 3,
          nftCount: 5,
          sftCount: 3,
        },
      ]
    );

    // create deterministic pda
    const deterministicOutputs = await createDeterministicIngredient(
      itemProgram.client.provider.connection,
      payer,
      outputItemClass.itemClass,
      State.ItemV2.getRecipePda(outputItemClass.itemClass, new anchor.BN(0)),
      pNftItemClass.mints[0],
      1
    );

    // start the build process
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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
    const pack = State.ItemV2.getPackPda(outputItemClass.itemClass, new BN(0));
    await completeBuildPackAndReceiveItems(
      connection,
      build,
      pack,
      outputItemClass.packs[0]
    );

    const packMints: anchor.web3.PublicKey[] = [];
    for (let entry of outputItemClass.packs[0].entries) {
      packMints.push(entry.mint);
    }

    // assert builder received the pack items and the deterministic item
    const expectedMints: anchor.web3.PublicKey[] = [
      ...packMints,
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
        new anchor.BN(tokenBalanceResponse.value.amount).gt(new anchor.BN(0))
      );
    }

    await cleanBuild(itemProgram, build);
  });

  it("build item class in preset only mode with selection groups", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
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

    // create mints for selectable outputs
    const outputSelectionGroups = await createOutputSelectionGroups(
      connection,
      payer,
      2
    );

    // output pNft, set in preset only mode
    const outputItemClass = await createItemClassPresetOnly(payer, connection, {
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
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
      recipeIndex: new anchor.BN(0),
      recipeOutputSelection: [
        { groupId: 0, outputId: 0 },
        { groupId: 1, outputId: 0 },
      ],
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
    await completeBuildPresetOnlyAndReceiveItem(connection, build);

    // assert builder received the output item and the deterministic item
    const expectedMints: anchor.web3.PublicKey[] = [
      outputSelectionGroups[0].choices[0].mint,
      outputSelectionGroups[1].choices[0].mint,
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

  it("handle verified build items that aren't escrowed", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
      }
    );

    // nft ingredient
    const nftItemClass = await createItemClass(payer, connection, 2, false, {
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
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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

    for (let i = 0; i < nftItemClass.mints.length; i++) {
      // verify build ingredient
      const verifyIngredientAccounts: Instructions.ItemV2.VerifyIngredientAccounts =
        {
          ingredientMint: nftItemClass.mints[i],
          ingredientItemClass: nftItemClass.itemClass,
          itemClass: outputItemClass.itemClass,
          builder: itemProgram.client.provider.publicKey,
          payer: itemProgram.client.provider.publicKey,
        };

      // get proof for mint
      const proof = nftItemClass.tree.getProof(i);

      const verifyIngredientArgs: Instructions.ItemV2.VerifyIngredientArgs = {
        root: proof.root,
        leafIndex: proof.leafIndex,
        proof: proof.proof,
      };

      const verifyIngredientResult = await itemProgram.verifyIngredient(
        verifyIngredientAccounts,
        verifyIngredientArgs
      );
      console.log("verifyIngredientTxSig: %s", verifyIngredientResult.txid);
    }

    const buildData = await itemProgram.getBuild(build);
    console.log(JSON.stringify(buildData));

    const closeBuildResutl = await itemProgram.closeBuild({
      build: build,
      payer: itemProgram.client.provider.publicKey!,
    });
    console.log("closeBuildTxSig: %s", closeBuildResutl.txid);
  });

  it("build item class in collection verify mode", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgramV2.getProgramWithConfig(
      ItemProgramV2,
      {
        asyncSigning: false,
        provider: new anchor.AnchorProvider(
          connection,
          new anchor.Wallet(payer),
          { commitment: "confirmed" }
        ),
        idl: Idls.ItemV2IDL,
      }
    );

    // ingredient 1, nft
    const nftItemClass = await createItemClassCollectionMode(
      payer,
      connection,
      1,
      true
    );

    // output nft
    const outputItemClass = await createItemClassCollectionMode(
      payer,
      connection,
      1,
      true,
      {
        buildEnabled: true,
        payment: null,
        ingredientArgs: [
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

    // transfer nfts to the output item class
    for (let mint of outputItemClass.mints) {
      const source = splToken.getAssociatedTokenAddressSync(
        mint,
        payer.publicKey
      );
      const destination = await splToken.getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        outputItemClass.itemClass,
        true,
        "processed"
      );
      await splToken.transfer(
        connection,
        payer,
        source,
        destination.address,
        payer.publicKey,
        1
      );
    }

    // start the build process
    const startBuildAccounts: Instructions.ItemV2.StartBuildAccounts = {
      itemClass: outputItemClass.itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.ItemV2.StartBuildArgs = {
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

    // add ingredient to build using collection verification
    await addIngredientCollection(
      itemProgram,
      outputItemClass.itemClass,
      nftItemClass.mints[0],
      nftItemClass.itemClass,
      new anchor.BN(1)
    );

    // complete build and receive the item
    await completeBuildCollectionAndReceiveItem(
      connection,
      build,
      outputItemClass.mints[0]
    );

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
  recipeArgs?: Instructions.ItemV2.RecipeArgs
): Promise<ItemClassContainer> {
  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
  });

  let createItemClassArgs: Instructions.ItemV2.CreateItemClassArgs = {
    itemClassName: "testing",
    mode: { kind: "MerkleTree" },
  };

  let [itemClass, createItemClassResult] = await itemProgram.createItemClass(
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
        tokenStandard: mpl.TokenStandard.ProgrammableNonFungible as number,
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
        tokenStandard: mpl.TokenStandard.NonFungible as number,
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
    const addItemsToItemClassAccounts: Instructions.ItemV2.AddItemsToItemClass =
      {
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

  // if recipe args are defined, create them
  if (recipeArgs) {
    const createRecipeAccounts: Instructions.ItemV2.CreateRecipeAccounts = {
      itemClass: itemClass,
    };

    const createRecipeArgs: Instructions.ItemV2.CreateRecipeArgs = {
      args: recipeArgs,
    };

    const createRecipeResult = await itemProgram.createRecipe(
      createRecipeAccounts,
      createRecipeArgs
    );
    console.log("createRecipeTxSig: %s", createRecipeResult.txid);
  }

  return { itemClass, mints, tree };
}

async function createItemClassPack(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  recipeArgs: Instructions.ItemV2.RecipeArgs,
  packConfig: PackConfig[]
): Promise<ItemClassPackContainer> {
  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
  });

  let createItemClassArgs: Instructions.ItemV2.CreateItemClassArgs = {
    itemClassName: "testing",
    mode: { kind: "Pack" },
  };

  let [itemClass, createItemClassResult] = await itemProgram.createItemClass(
    createItemClassArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(payer)
  );

  const packs: State.ItemV2.PackContents[] = [];
  for (let y = 0; y < packConfig.length; y++) {
    // entries for one pack
    const entries: State.ItemV2.PackContentsEntry[] = [];

    // create all the pNfts
    for (let i = 0; i < packConfig[y].pNftCount; i++) {
      const ingredientCollectionNft = await createCollectionPNft(
        payer,
        connection
      );

      const ruleSetPda = await createRuleSet(payer, connection);

      const ingredientMintOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.ProgrammableNonFungible as number,
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
        tokenStandard: mpl.TokenStandard.NonFungible as number,
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
    const packContents = new State.ItemV2.PackContents(
      entries,
      new Uint8Array(16)
    );
    packs.push(packContents);

    const createPackAccounts: Instructions.ItemV2.CreatePackAccounts = {
      itemClass: itemClass,
    };

    const createPackArgs: Instructions.ItemV2.CreatePackArgs = {
      contentsHash: packContents.hash(),
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
  }

  // if recipe args are defined, create them
  if (recipeArgs) {
    const createRecipeAccounts: Instructions.ItemV2.CreateRecipeAccounts = {
      itemClass: itemClass,
    };

    const createRecipeArgs: Instructions.ItemV2.CreateRecipeArgs = {
      args: recipeArgs,
    };

    const createRecipeResult = await itemProgram.createRecipe(
      createRecipeAccounts,
      createRecipeArgs
    );
    console.log("createRecipeTxSig: %s", createRecipeResult.txid);
  }

  return { itemClass, packs };
}

async function createItemClassPresetOnly(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  recipeArgs: Instructions.ItemV2.RecipeArgs
): Promise<ItemClassPresetOnlyContainer> {
  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
  });

  let createItemClassArgs: Instructions.ItemV2.CreateItemClassArgs = {
    itemClassName: "testing",
    mode: { kind: "PresetOnly" },
  };

  let [itemClass, createItemClassResult] = await itemProgram.createItemClass(
    createItemClassArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  const tree = initTree({ maxDepth: 16, maxBufferSize: 64 });
  console.log("tree created: %s", itemClass.toString());

  // if recipe args are defined, create them
  if (recipeArgs) {
    const createRecipeAccounts: Instructions.ItemV2.CreateRecipeAccounts = {
      itemClass: itemClass,
    };

    const createRecipeArgs: Instructions.ItemV2.CreateRecipeArgs = {
      args: recipeArgs,
    };

    const createRecipeResult = await itemProgram.createRecipe(
      createRecipeAccounts,
      createRecipeArgs
    );
    console.log("createRecipeTxSig: %s", createRecipeResult.txid);
  }

  return { itemClass };
}

async function createItemClassCollectionMode(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  itemCount: number,
  isPNft: boolean,
  recipeArgs?: Instructions.ItemV2.RecipeArgs
): Promise<ItemClassCollectionContainer> {
  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(payer)
  );

  const collectionMint = await createCollectionNft(payer, connection);

  const mints: anchor.web3.PublicKey[] = [];
  for (let i = 0; i < itemCount; i++) {
    const ingredientMintOutput = await client.nfts().create({
      tokenStandard: mpl.TokenStandard.NonFungible as number,
      uri: "https://foo.com/bar.json",
      name: "NFT1",
      sellerFeeBasisPoints: 500,
      symbol: "N",
      collection: collectionMint,
      collectionAuthority: payer,
    });
    console.log("createNftTxSig: %s", ingredientMintOutput.response.signature);
    mints.push(ingredientMintOutput.mintAddress);
  }

  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
  });

  let createItemClassArgs: Instructions.ItemV2.CreateItemClassArgs = {
    itemClassName: "testing",
    mode: { kind: "Collection", collectionMint },
  };

  let [itemClass, createItemClassResult] = await itemProgram.createItemClass(
    createItemClassArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  if (recipeArgs) {
    const createRecipeAccounts: Instructions.ItemV2.CreateRecipeAccounts = {
      itemClass: itemClass,
    };

    const createRecipeArgs: Instructions.ItemV2.CreateRecipeArgs = {
      args: recipeArgs,
    };

    const createRecipeResult = await itemProgram.createRecipe(
      createRecipeAccounts,
      createRecipeArgs
    );
    console.log("createRecipeTxSig: %s", createRecipeResult.txid);
  }

  return { itemClass, mints };
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

  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(owner), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
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
    tokenStandard: mpl.TokenStandard.NonFungible as number,
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
    tokenStandard: mpl.TokenStandard.ProgrammableNonFungible as number,
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
  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
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
  itemProgram: ItemProgramV2,
  tree: cmp.MerkleTree,
  leafIndex: number,
  outputItemClass: anchor.web3.PublicKey,
  ingredientMint: anchor.web3.PublicKey,
  ingredientItemClass: anchor.web3.PublicKey,
  ingredientAmount: anchor.BN
) {
  // verify build ingredient
  const verifyIngredientAccounts: Instructions.ItemV2.VerifyIngredientAccounts =
    {
      ingredientMint: ingredientMint,
      ingredientItemClass: ingredientItemClass,
      itemClass: outputItemClass,
      builder: itemProgram.client.provider.publicKey,
      payer: itemProgram.client.provider.publicKey,
    };

  // get proof for mint
  const proof = tree.getProof(leafIndex);

  const verifyIngredientArgs: Instructions.ItemV2.VerifyIngredientArgs = {
    root: proof.root,
    leafIndex: proof.leafIndex,
    proof: proof.proof,
  };

  const verifyIngredientResult = await itemProgram.verifyIngredient(
    verifyIngredientAccounts,
    verifyIngredientArgs
  );
  console.log("verifyIngredientTxSig: %s", verifyIngredientResult.txid);

  const addIngredientAccounts: Instructions.ItemV2.AddIngredientAccounts = {
    itemClass: outputItemClass,
    ingredientMint: ingredientMint,
    ingredientItemClass: ingredientItemClass,
    builder: itemProgram.client.provider.publicKey,
    payer: itemProgram.client.provider.publicKey,
  };

  const addIngredientArgs: Instructions.ItemV2.AddIngredientArgs = {
    amount: ingredientAmount,
  };

  const addIngredientResult = await itemProgram.addIngredient(
    addIngredientAccounts,
    addIngredientArgs
  );
  console.log("addIngredientTxSig: %s", addIngredientResult.txid);
}

async function addIngredientCollection(
  itemProgram: ItemProgramV2,
  outputItemClass: anchor.web3.PublicKey,
  ingredientMint: anchor.web3.PublicKey,
  ingredientItemClass: anchor.web3.PublicKey,
  ingredientAmount: anchor.BN
) {
  // verify build ingredient
  const verifyIngredientAccounts: Instructions.ItemV2.VerifyIngredientAccounts =
    {
      ingredientMint: ingredientMint,
      ingredientItemClass: ingredientItemClass,
      itemClass: outputItemClass,
      builder: itemProgram.client.provider.publicKey,
      payer: itemProgram.client.provider.publicKey,
    };

  const verifyIngredientResult = await itemProgram.verifyIngredient(
    verifyIngredientAccounts
  );
  console.log("verifyIngredientTxSig: %s", verifyIngredientResult.txid);

  const addIngredientAccounts: Instructions.ItemV2.AddIngredientAccounts = {
    itemClass: outputItemClass,
    ingredientMint: ingredientMint,
    ingredientItemClass: ingredientItemClass,
    builder: itemProgram.client.provider.publicKey,
    payer: itemProgram.client.provider.publicKey,
  };

  const addIngredientArgs: Instructions.ItemV2.AddIngredientArgs = {
    amount: ingredientAmount,
  };

  const addIngredientResult = await itemProgram.addIngredient(
    addIngredientAccounts,
    addIngredientArgs
  );
  console.log("addIngredientTxSig: %s", addIngredientResult.txid);
}

async function addIngredientPermissionless(
  itemProgram: ItemProgramV2,
  builder: anchor.web3.PublicKey,
  tree: cmp.MerkleTree,
  outputItemClass: anchor.web3.PublicKey,
  ingredientMint: anchor.web3.PublicKey,
  ingredientItemClass: anchor.web3.PublicKey,
  ingredientAmount: anchor.BN
) {
  // verify build ingredient
  const verifyIngredientAccounts: Instructions.ItemV2.VerifyIngredientAccounts =
    {
      ingredientMint: ingredientMint,
      ingredientItemClass: ingredientItemClass,
      itemClass: outputItemClass,
      builder: builder,
      payer: itemProgram.client.provider.publicKey,
    };

  // get proof for mint
  const proof = tree.getProof(0);

  const verifyIngredientArgs: Instructions.ItemV2.VerifyIngredientArgs = {
    root: proof.root,
    leafIndex: proof.leafIndex,
    proof: proof.proof,
  };

  const verifyIngredientResult = await itemProgram.verifyIngredient(
    verifyIngredientAccounts,
    verifyIngredientArgs
  );
  console.log("verifyIngredientTxSig: %s", verifyIngredientResult.txid);

  const addIngredientAccounts: Instructions.ItemV2.AddIngredientAccounts = {
    itemClass: outputItemClass,
    ingredientMint: ingredientMint,
    ingredientItemClass: ingredientItemClass,
    builder: builder,
    payer: itemProgram.client.provider.publicKey,
  };

  const addIngredientArgs: Instructions.ItemV2.AddIngredientArgs = {
    amount: ingredientAmount,
  };

  const addIngredientResult = await itemProgram.addIngredient(
    addIngredientAccounts,
    addIngredientArgs
  );
  console.log("addIngredientPermissionlessTxSig: %s", addIngredientResult.txid);
}

async function completeBuildMerkleTreeAndReceiveItem(
  connection: anchor.web3.Connection,
  tree: cmp.MerkleTree,
  leafIndex: number,
  build: anchor.web3.PublicKey,
  outputItemMints: anchor.web3.PublicKey[]
) {
  const signer = await initSigner(TEST_SIGNER_FILE_PATH, connection);

  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(signer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
  });

  // complete the build process
  const completeBuildItemAccounts: Instructions.ItemV2.CompleteBuildAccounts = {
    itemMint: outputItemMints[leafIndex],
    payer: itemProgram.client.provider.publicKey,
    build: build,
  };

  const proof = tree.getProof(leafIndex);

  const completeBuildItemArgs: Instructions.ItemV2.CompleteBuildArgs = {
    merkleTreeArgs: {
      root: proof.root,
      leafIndex: proof.leafIndex,
      proof: proof.proof,
    },
  };

  const completeBuildResult = await itemProgram.completeBuild(
    completeBuildItemAccounts,
    completeBuildItemArgs
  );
  console.log("completeBuildItemTxSig: %s", completeBuildResult.txid);

  // send item to builder
  const receiveItemAccounts: Instructions.ItemV2.ReceiveItemAccounts = {
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
  build: anchor.web3.PublicKey,
  pack: anchor.web3.PublicKey,
  packContents: State.ItemV2.PackContents
) {
  const signer = await initSigner(TEST_SIGNER_FILE_PATH, connection);

  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(signer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
  });

  // complete the build process
  const completeBuildPackAccounts: Instructions.ItemV2.CompleteBuildAccounts = {
    pack: pack,
    payer: itemProgram.client.provider.publicKey,
    build: build,
  };

  const completeBuildPackArgs: Instructions.ItemV2.CompleteBuildArgs = {
    packArgs: {
      packContents: packContents,
    },
  };

  const completeBuildResult = await itemProgram.completeBuild(
    completeBuildPackAccounts,
    completeBuildPackArgs
  );
  console.log("completeBuildPackTxSig: %s", completeBuildResult.txid);

  // send item to builder
  const receiveItemAccounts: Instructions.ItemV2.ReceiveItemAccounts = {
    build: build,
    payer: itemProgram.client.provider.publicKey,
  };

  const receiveItemResults = await itemProgram.receiveItem(receiveItemAccounts);
  for (let result of receiveItemResults) {
    console.log("receiveItemTxSig: %s", result.txid);
  }
}

async function completeBuildPresetOnlyAndReceiveItem(
  connection: anchor.web3.Connection,
  build: anchor.web3.PublicKey
) {
  const signer = await initSigner(TEST_SIGNER_FILE_PATH, connection);

  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(signer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
  });

  // complete the build process
  const completeBuildAccounts: Instructions.ItemV2.CompleteBuildAccounts = {
    payer: itemProgram.client.provider.publicKey,
    build: build,
  };

  const completeBuildArgs: Instructions.ItemV2.CompleteBuildArgs = {};

  const completeBuildResult = await itemProgram.completeBuild(
    completeBuildAccounts,
    completeBuildArgs
  );
  console.log("completeBuildPresetOnlyTxSig: %s", completeBuildResult.txid);

  // send items to builder
  const receiveItemAccounts: Instructions.ItemV2.ReceiveItemAccounts = {
    build: build,
    payer: itemProgram.client.provider.publicKey,
  };

  const receiveItemResults = await itemProgram.receiveItem(receiveItemAccounts);
  for (let result of receiveItemResults) {
    console.log("receiveItemTxSig: %s", result.txid);
  }
}

async function completeBuildCollectionAndReceiveItem(
  connection: anchor.web3.Connection,
  build: anchor.web3.PublicKey,
  outputItemMint: anchor.web3.PublicKey
) {
  const signer = await initSigner(TEST_SIGNER_FILE_PATH, connection);

  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(signer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemV2IDL,
  });

  // complete the build process
  const completeBuildItemAccounts: Instructions.ItemV2.CompleteBuildAccounts = {
    itemMint: outputItemMint,
    payer: itemProgram.client.provider.publicKey,
    build: build,
  };

  const completeBuildItemArgs: Instructions.ItemV2.CompleteBuildArgs = {};

  const completeBuildResult = await itemProgram.completeBuild(
    completeBuildItemAccounts,
    completeBuildItemArgs
  );
  console.log("completeBuildItemTxSig: %s", completeBuildResult.txid);

  // send item to builder
  const receiveItemAccounts: Instructions.ItemV2.ReceiveItemAccounts = {
    build: build,
    payer: itemProgram.client.provider.publicKey,
  };

  const receiveItemResults = await itemProgram.receiveItem(receiveItemAccounts);
  for (let result of receiveItemResults) {
    console.log("receiveItemTxSig: %s", result.txid);
  }
}

async function cleanBuild(
  itemProgram: ItemProgramV2,
  build: anchor.web3.PublicKey
) {
  // get all build ingredient mints/item classes
  const buildData = await itemProgram.getBuild(build);
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
      const applyBuildEffectAccounts: Instructions.ItemV2.ApplyBuildEffectAccounts =
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
      const item = State.ItemV2.getItemPda(mint);
      const itemData = await itemProgram.getItem(item);

      if (itemData.itemState.durability.lte(new anchor.BN(0))) {
        // destroy it
        const destroyIngredientAccounts: Instructions.ItemV2.DestroyIngredientAccounts =
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
        const returnIngredientAccounts: Instructions.ItemV2.ReturnIngredientAccounts =
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

  if (buildData.payment !== null) {
    const transferPaymentAccounts: Instructions.ItemV2.TransferPaymentAccounts =
      {
        build: build,
        destination: buildData.payment.paymentDetails.treasury,
        payer: itemProgram.client.provider.publicKey!,
      };

    const transferPaymentResult = await itemProgram.transferPayment(
      transferPaymentAccounts
    );
    console.log("transferPaymentTxSig: %s", transferPaymentResult.txid);
  }

  const closeBuildAccounts: Instructions.ItemV2.CloseBuildAccounts = {
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
  recipe: anchor.web3.PublicKey,
  ingredientMint: anchor.web3.PublicKey,
  outputCount: number
): Promise<State.ItemV2.DeterministicIngredientOutput[]> {
  const itemProgram = await ItemProgramV2.getProgramWithConfig(ItemProgramV2, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(authority),
      {
        commitment: "confirmed",
      }
    ),
    idl: Idls.ItemV2IDL,
  });

  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(authority)
  );

  // create output mints and mint to item class
  const deterministicIngredientOutputs: State.ItemV2.DeterministicIngredientOutput[] =
    [];
  for (let i = 0; i < outputCount; i++) {
    const ingredientCollectionNft = await createCollectionNft(
      authority,
      connection
    );

    const ingredientMintOutput = await client.nfts().create({
      tokenStandard: mpl.TokenStandard.NonFungible as number,
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
      { outputs: deterministicIngredientOutputs, recipes: [recipe] }
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
): Promise<State.ItemV2.OutputSelectionGroup[]> {
  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(authority)
  );

  // create output mints and mint to item class
  const outputSelectionGroups: State.ItemV2.OutputSelectionGroup[] = [];
  for (let i = 0; i < groupCount; i++) {
    const ingredientCollectionNft = await createCollectionNft(
      authority,
      connection
    );

    const ingredientMintOutput = await client.nfts().create({
      tokenStandard: mpl.TokenStandard.NonFungible as number,
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
  packs: State.ItemV2.PackContents[];
}

interface ItemClassPresetOnlyContainer {
  itemClass: anchor.web3.PublicKey;
}

interface ItemClassCollectionContainer {
  itemClass: anchor.web3.PublicKey;
  mints: anchor.web3.PublicKey[];
}

async function assertFreshBuild(
  itemProgram: ItemProgramV2,
  build: anchor.web3.PublicKey,
  builder: anchor.web3.PublicKey,
  itemClass: anchor.web3.PublicKey
) {
  const buildData = await itemProgram.getBuild(build);
  assert.isTrue(buildData.builder.equals(builder));
  assert.isTrue(buildData.itemClass.equals(itemClass));
  assert.isTrue(
    buildData.payment.status === State.ItemV2.PaymentStatus.NotPaid
  );
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
