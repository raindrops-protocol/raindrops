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

  it("build pNFT using 1 NFT and 1 pNFT, both returned to builder after", async () => {
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

    // material 1, pNFT
    const pNftItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: false,
      payment: null,
      materialArgs: [],
    });

    // material 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      materialArgs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: true,
      payment: {
        treasury: payer.publicKey,
        amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
      },
      materialArgs: [
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
      builder: itemProgram.client.provider.publicKey,
    };

    const startBuildArgs: Instructions.Item.StartBuildArgs = {
      schemaIndex: new anchor.BN(0),
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
    await addMaterial(
      itemProgram,
      pNftItemClass.tree,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add NFT to build
    await addMaterial(
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

    // material 1, pNFT
    const pNftItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: false,
      payment: null,
      materialArgs: [],
    });

    // material 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      materialArgs: [],
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
        materialArgs: [
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
        schemaIndex: new anchor.BN(0),
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
      await addMaterial(
        itemProgram,
        pNftItemClass.tree,
        outputItemClass.itemClass,
        pNftItemClass.mints[0],
        pNftItemClass.itemClass,
        new anchor.BN(1)
      );

      // add NFT to build
      await addMaterial(
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

    // material 1, pNFT
    const pNftItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: false,
      payment: null,
      materialArgs: [],
    });

    // material 2, NFT
    const nftItemClass = await createItemClass(payer, connection, 1, false, {
      buildEnabled: false,
      payment: null,
      materialArgs: [],
    });

    // output pNft
    const outputItemClass = await createItemClass(payer, connection, 1, true, {
      buildEnabled: true,
      payment: {
        treasury: payer.publicKey,
        amount: new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
      },
      materialArgs: [
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
      schemaIndex: new anchor.BN(0),
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
    await addMaterial(
      builderItemProgram,
      pNftItemClass.tree,
      outputItemClass.itemClass,
      pNftItemClass.mints[0],
      pNftItemClass.itemClass,
      new anchor.BN(1)
    );

    // add NFT to build
    await addMaterial(
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

  it("create item class with multiple schemas", async () => {
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
      schemaArgs: {
        buildEnabled: false,
        payment: null,
        materialArgs: [],
      },
    };

    let [itemClass, createItemClassResult] =
      await itemProgram.createItemClassV1(createItemClassArgs);
    console.log("createItemClassTxSig: %s", createItemClassResult.txid);

    // first schema is created during item class creation
    const itemClassDataPre = await itemProgram.getItemClassV1(itemClass);
    assert.isTrue(itemClassDataPre.schemaIndex.eq(new anchor.BN(0)));

    const addSchemaAccounts: Instructions.Item.AddSchemaAccounts = {
      itemClass: itemClass,
      authority: payer.publicKey,
    };

    const addSchemaArgs: Instructions.Item.AddSchemaArgs = {
      args: {
        buildEnabled: false,
        payment: null,
        materialArgs: [],
      },
    };

    const addSchemaResult = await itemProgram.addSchema(
      addSchemaAccounts,
      addSchemaArgs
    );
    console.log("addSchemaTxSig: %s", addSchemaResult.txid);

    // first schema is created during item class creation
    const itemClassDataPost = await itemProgram.getItemClassV1(itemClass);
    assert.isTrue(itemClassDataPost.schemaIndex.eq(new anchor.BN(1)));
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
  materialCount: number,
  isPNft: boolean,
  schemaArgs: Instructions.Item.SchemaArgs
): Promise<ItemClassContainer> {
  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  let createItemClassArgs: Instructions.Item.CreateItemClassV1Args = {
    schemaArgs: schemaArgs,
  };

  let [itemClass, createItemClassResult] = await itemProgram.createItemClassV1(
    createItemClassArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  const tree = initTree({ maxDepth: 14, maxBufferSize: 64 });
  console.log("tree created: %s", itemClass.toString());

  const mints: anchor.web3.PublicKey[] = [];
  for (let i = 0; i < materialCount; i++) {
    const client = new metaplex.Metaplex(connection, {}).use(
      metaplex.keypairIdentity(payer)
    );

    let materialMintOutput: metaplex.CreateNftOutput;
    if (isPNft) {
      const ruleSetPda = await createRuleSet(payer, connection);

      materialMintOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.ProgrammableNonFungible,
        uri: "https://foo.com/bar.json",
        name: "pNFT1",
        sellerFeeBasisPoints: 500,
        symbol: "PN",
        ruleSet: ruleSetPda,
      });
      console.log("createPNftTxSig: %s", materialMintOutput.response.signature);
    } else {
      materialMintOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.NonFungible,
        uri: "https://foo.com/bar.json",
        name: "pNFT1",
        sellerFeeBasisPoints: 500,
        symbol: "PN",
      });
      console.log("createNftTxSig: %s", materialMintOutput.response.signature);
    }

    // add mint to the items tree on chain
    const addItemsToItemClassAccounts: Instructions.Item.AddItemsToItemClass = {
      itemClass: itemClass,
      itemMints: [materialMintOutput.mintAddress],
    };

    const addItemsToItemClassResult = await itemProgram.addItemsToItemClass(
      addItemsToItemClassAccounts
    );
    console.log("addItemsToItemClassTxSig: %s", addItemsToItemClassResult.txid);
    console.log(
      "itemClass: %s, item: %s",
      itemClass.toString(),
      materialMintOutput.mintAddress.toString()
    );

    // add mint to items tree off chain
    tree.updateLeaf(i, materialMintOutput.mintAddress.toBuffer());

    mints.push(materialMintOutput.mintAddress);
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

async function addMaterial(
  itemProgram: ItemProgram,
  tree: cmp.MerkleTree,
  outputItemClass: anchor.web3.PublicKey,
  materialMint: anchor.web3.PublicKey,
  materialItemClass: anchor.web3.PublicKey,
  materialAmount: anchor.BN
) {
  // verify build material
  const verifyBuildMaterialAccounts: Instructions.Item.VerifyBuildMaterialAccounts =
    {
      materialMint: materialMint,
      materialItemClass: materialItemClass,
      itemClass: outputItemClass,
      builder: itemProgram.client.provider.publicKey,
    };

  // get proof for mint
  const proof = tree.getProof(0);

  const verifyBuildMaterialArgs: Instructions.Item.VerifyBuildMaterialArgs = {
    root: proof.root,
    leafIndex: proof.leafIndex,
    proof: proof.proof,
  };

  const verifyBuildMaterialResult = await itemProgram.verifyBuildMaterial(
    verifyBuildMaterialAccounts,
    verifyBuildMaterialArgs
  );
  console.log("verifyBuildMaterialTxSig: %s", verifyBuildMaterialResult.txid);

  const addBuildMaterialAccounts: Instructions.Item.AddBuildMaterialAccounts = {
    itemClass: outputItemClass,
    materialMint: materialMint,
    materialItemClass: materialItemClass,
    builder: itemProgram.client.provider.publicKey,
  };

  const addBuildMaterialArgs: Instructions.Item.AddBuildMaterialArgs = {
    amount: materialAmount,
  };

  const addBuildMaterialResult = await itemProgram.addBuildMaterial(
    addBuildMaterialAccounts,
    addBuildMaterialArgs
  );
  console.log("addBuildMaterialTxSig: %s", addBuildMaterialResult.txid);
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
  // get all build material mints/item classes
  const buildData = await itemProgram.client.account.build.fetch(build);
  // [item_class, mint pubkeys]
  const buildMaterialMints: [anchor.web3.PublicKey, anchor.web3.PublicKey[]][] =
    [];
  for (let materialData of buildData.materials as any[]) {
    let mints: anchor.web3.PublicKey[] = [];
    for (let mintData of materialData.mints) {
      if (mintData.buildEffectApplied) {
        continue;
      }

      mints.push(mintData.mint);
    }
    buildMaterialMints.push([materialData.itemClass, mints]);
  }
  // apply the build effect to each material and then return them to the builder
  for (let buildMaterialData of buildMaterialMints) {
    for (let mint of buildMaterialData[1]) {
      const applyBuildEffectAccounts: Instructions.Item.ApplyBuildEffectAccounts =
        {
          materialItemClass: buildMaterialData[0],
          materialMint: mint,
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
          buildMaterialData[0].toBuffer(),
          mint.toBuffer(),
        ],
        itemProgram.PROGRAM_ID
      );
      const itemData = await itemProgram.getItemV1(item);

      if (itemData.itemState.durability.lte(new anchor.BN(0))) {
        // consume it
        const consumeBuildMaterialAccounts: Instructions.Item.ConsumeBuildMaterialAccounts =
          {
            materialMint: mint,
            materialItemClass: buildMaterialData[0],
            build: build,
            payer: itemProgram.client.provider.publicKey,
          };

        const consumeBuildMaterialResult =
          await itemProgram.consumeBuildMaterial(consumeBuildMaterialAccounts);
        console.log(
          "consumeBuildMaterialTxSig: %s",
          consumeBuildMaterialResult.txid
        );
      } else {
        // return it
        const returnBuildMaterialAccounts: Instructions.Item.ReturnBuildMaterialAccounts =
          {
            materialMint: mint,
            materialItemClass: buildMaterialData[0],
            build: build,
            payer: itemProgram.client.provider.publicKey,
          };

        const returnBuildMaterialResult = await itemProgram.returnBuildMaterial(
          returnBuildMaterialAccounts
        );
        console.log(
          "returnBuildMaterialTxSig: %s",
          returnBuildMaterialResult.txid
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
  for (let material of buildData.materials) {
    assert.isTrue(material.currentAmount.eq(new anchor.BN(0)));
    assert.equal(material.mints.length, 0);
  }
}
