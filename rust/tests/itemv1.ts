import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as metaplex from "@metaplex-foundation/js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import { Instructions, Idls, ItemProgram } from "@raindrops-protocol/raindrops";
import * as splToken from "@solana/spl-token";
import * as cmp from "@solana/spl-account-compression";
import * as mplAuth from "@metaplex-foundation/mpl-token-auth-rules";
import { assert } from "chai";
import { encode } from "@msgpack/msgpack";

describe.only("itemv1", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it("build pNFT item class", async () => {
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

    // build all the material item classes
    const materials: [anchor.web3.PublicKey, cmp.MerkleTree][] = [];
    for (let i = 0; i < 3; i++) {
      let createItemClassArgs: Instructions.Item.CreateItemClassV1Args = {
        schemaArgs: {
          buildEnabled: false,
          materialArgs: [],
        },
      };

      let [itemClass, createItemClassResult] =
        await itemProgram.createItemClassV1(createItemClassArgs);
      console.log("createItemClassTxSig: %s", createItemClassResult.txid);

      // TODO: currently these are hardcoded in the contract
      let offchainTree = initTree({ maxBufferSize: 64, maxDepth: 14 });

      materials.push([itemClass, offchainTree]);
    }

    // create the item class which will be built using the materials
    const createItemClassArgs: Instructions.Item.CreateItemClassV1Args = {
      schemaArgs: {
        buildEnabled: true,
        materialArgs: [
          {
            itemClass: materials[0][0],
            requiredAmount: new BN(1),
            buildEffect: {
              degredation: { amount: new anchor.BN(100000) }, // single use
              cooldown: null,
            },
          },
          {
            itemClass: materials[1][0],
            requiredAmount: new BN(1),
            buildEffect: {
              degredation: null,
              cooldown: null,
            },
          },
          {
            itemClass: materials[2][0],
            requiredAmount: new BN(1),
            buildEffect: {
              degredation: null,
              cooldown: null,
            },
          },
        ],
      },
    };

    const [itemClass, createItemClassResult] =
      await itemProgram.createItemClassV1(createItemClassArgs);
    console.log("createItemClassTxSig: %s", createItemClassResult.txid);

    const itemClassOffChainTree = initTree({ maxDepth: 14, maxBufferSize: 64 });

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: itemClass,
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

    // escrow the materials with the build pda
    for (let i = 0; i < materials.length; i++) {
      // create pNFTs which represent the material item classes
      const client = new metaplex.Metaplex(connection, {}).use(
        metaplex.keypairIdentity(payer)
      );

      let tokenStandard: mpl.TokenStandard;
      let ruleSet: anchor.web3.PublicKey | null = null;
      if (i === 0) {
        tokenStandard = mpl.TokenStandard.NonFungible;
      } else {
        tokenStandard = mpl.TokenStandard.ProgrammableNonFungible;

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
                            programs: [
                              Array.from(itemProgram.PROGRAM_ID.toBytes()),
                            ],
                            field: "Source",
                          },
                        },
                        {
                          ProgramOwnedList: {
                            programs: [
                              Array.from(itemProgram.PROGRAM_ID.toBytes()),
                            ],
                            field: "Destination",
                          },
                        },
                        {
                          ProgramOwnedList: {
                            programs: [
                              Array.from(itemProgram.PROGRAM_ID.toBytes()),
                            ],
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
                            programs: [
                              Array.from(itemProgram.PROGRAM_ID.toBytes()),
                            ],
                            field: "Source",
                          },
                        },
                        {
                          ProgramOwnedList: {
                            programs: [
                              Array.from(itemProgram.PROGRAM_ID.toBytes()),
                            ],
                            field: "Destination",
                          },
                        },
                        {
                          ProgramOwnedList: {
                            programs: [
                              Array.from(itemProgram.PROGRAM_ID.toBytes()),
                            ],
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
          itemProgram.client.provider.publicKey,
          "AllRuleSet"
        );

        const createAuthRulesAccounts: mplAuth.CreateOrUpdateInstructionAccounts =
          {
            payer: itemProgram.client.provider.publicKey,
            ruleSetPda: ruleSetPda,
          };

        const createAuthRulesArgs: mplAuth.CreateOrUpdateInstructionArgs = {
          createOrUpdateArgs: {
            __kind: "V1",
            serializedRuleSet: encode(ruleSetData),
          },
        };

        const createAuthRulesetIx =
          await mplAuth.createCreateOrUpdateInstruction(
            createAuthRulesAccounts,
            createAuthRulesArgs
          );
        const createAuthRulesetTx = new anchor.web3.Transaction().add(
          createAuthRulesetIx
        );
        const createAuthRulesetTxSig =
          await itemProgram.client.provider.sendAndConfirm(
            createAuthRulesetTx,
            undefined,
            { commitment: "confirmed" }
          );
        console.log("createAuthRulesetTxSig: %s", createAuthRulesetTxSig);

        ruleSet = ruleSetPda;
      }

      const materialMintNftOutput = await client.nfts().create({
        tokenStandard: tokenStandard,
        uri: "https://foo.com/bar.json",
        name: "pNFT1",
        sellerFeeBasisPoints: 500,
        symbol: "PN",
        ruleSet: ruleSet,
      });
      console.log(
        "createPNftTxSig: %s",
        materialMintNftOutput.response.signature
      );

      // add mint to the items tree on chain
      const addItemsToItemClassAccounts: Instructions.Item.AddItemsToItemClass =
        {
          itemClass: materials[i][0],
          itemMints: [materialMintNftOutput.mintAddress],
        };

      const addItemsToItemClassResult = await itemProgram.addItemsToItemClass(
        addItemsToItemClassAccounts
      );
      console.log(
        "addItemsToItemClassTxSig: %s",
        addItemsToItemClassResult.txid
      );

      // add mint to the off chain tree, eventually this won't be a manual operation when we have an indexer
      // right now index 0 because we are only adding 1 item
      materials[i][1].updateLeaf(
        0,
        materialMintNftOutput.mintAddress.toBuffer()
      );

      const materialProof = materials[i][1].getProof(0);

      // verify build material
      const verifyBuildMaterialAccounts: Instructions.Item.VerifyBuildMaterialAccounts =
        {
          materialMint: materialMintNftOutput.mintAddress,
          materialItemClass: materials[i][0],
          itemClass: itemClass,
          builder: itemProgram.client.provider.publicKey,
        };

      const verifyBuildMaterialArgs: Instructions.Item.VerifyBuildMaterialArgs =
        {
          root: materialProof.root,
          leafIndex: materialProof.leafIndex,
          proof: materialProof.proof,
        };

      const verifyBuildMaterialResult = await itemProgram.verifyBuildMaterial(
        verifyBuildMaterialAccounts,
        verifyBuildMaterialArgs
      );
      console.log(
        "verifyBuildMaterialTxSig: %s",
        verifyBuildMaterialResult.txid
      );

      const addBuildMaterialAccounts: Instructions.Item.AddBuildMaterialAccounts =
        {
          itemClass: itemClass,
          materialMint: materialMintNftOutput.mintAddress,
          materialItemClass: materials[i][0],
          builder: itemProgram.client.provider.publicKey,
        };

      const addBuildMaterialArgs: Instructions.Item.AddBuildMaterialArgs = {
        amount: new anchor.BN(1),
      };

      const addBuildMaterialResult = await itemProgram.addBuildMaterial(
        addBuildMaterialAccounts,
        addBuildMaterialArgs
      );
      console.log("addBuildMaterialTxSig: %s", addBuildMaterialResult.txid);
    }

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
                        programs: [
                          Array.from(itemProgram.PROGRAM_ID.toBytes()),
                        ],
                        field: "Source",
                      },
                    },
                    {
                      ProgramOwnedList: {
                        programs: [
                          Array.from(itemProgram.PROGRAM_ID.toBytes()),
                        ],
                        field: "Destination",
                      },
                    },
                    {
                      ProgramOwnedList: {
                        programs: [
                          Array.from(itemProgram.PROGRAM_ID.toBytes()),
                        ],
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
                        programs: [
                          Array.from(itemProgram.PROGRAM_ID.toBytes()),
                        ],
                        field: "Source",
                      },
                    },
                    {
                      ProgramOwnedList: {
                        programs: [
                          Array.from(itemProgram.PROGRAM_ID.toBytes()),
                        ],
                        field: "Destination",
                      },
                    },
                    {
                      ProgramOwnedList: {
                        programs: [
                          Array.from(itemProgram.PROGRAM_ID.toBytes()),
                        ],
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
      itemProgram.client.provider.publicKey,
      "AllRuleSet"
    );

    const createAuthRulesAccounts: mplAuth.CreateOrUpdateInstructionAccounts = {
      payer: itemProgram.client.provider.publicKey,
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
    const createAuthRulesetTxSig =
      await itemProgram.client.provider.sendAndConfirm(
        createAuthRulesetTx,
        undefined,
        { commitment: "confirmed" }
      );
    console.log("createAuthRulesetTxSig: %s", createAuthRulesetTxSig);

    // create item pNFT, transferred to the builder when the build is complete
    const client = new metaplex.Metaplex(connection, {}).use(
      metaplex.keypairIdentity(payer)
    );

    console.log("RULE_SET: %s", ruleSetPda.toString());

    const itemMintPNftOutput = await client.nfts().create({
      tokenStandard: mpl.TokenStandard.ProgrammableNonFungible,
      uri: "https://foo.com/bar.json",
      name: "pNFT1",
      sellerFeeBasisPoints: 500,
      symbol: "PN",
      ruleSet: ruleSetPda,
    });
    console.log("createPNftTxSig: %s", itemMintPNftOutput.response.signature);

    const itemClassPNftAta = splToken.getAssociatedTokenAddressSync(
      itemMintPNftOutput.mintAddress,
      itemClass,
      true
    );

    const [itemSourceTokenRecord, _itemSourceTokenRecordBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMintPNftOutput.mintAddress.toBuffer(),
          Buffer.from("token_record"),
          itemMintPNftOutput.tokenAddress.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [itemDestinationTokenRecord, _itemDestinationTokenRecordBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          itemMintPNftOutput.mintAddress.toBuffer(),
          Buffer.from("token_record"),
          itemClassPNftAta.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    // double CU and fee

    const increaseCUIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    const addPriorityFeeIx =
      anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 5000,
      });

    // escrow the pNFT with the item class
    const transferIx = mpl.createTransferInstruction(
      {
        token: itemMintPNftOutput.tokenAddress,
        tokenOwner: payer.publicKey,
        destination: itemClassPNftAta,
        destinationOwner: itemClass,
        mint: itemMintPNftOutput.mintAddress,
        metadata: itemMintPNftOutput.metadataAddress,
        edition: itemMintPNftOutput.masterEditionAddress,
        ownerTokenRecord: itemSourceTokenRecord,
        destinationTokenRecord: itemDestinationTokenRecord,
        authority: payer.publicKey,
        payer: payer.publicKey,
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

    const transferTx = new anchor.web3.Transaction().add(
      increaseCUIx,
      addPriorityFeeIx,
      transferIx
    );
    const itemTransferTxSig = await itemProgram.client.provider.sendAndConfirm(
      transferTx,
      undefined,
      { skipPreflight: false }
    );
    console.log("itemTransferTxSig: %s", itemTransferTxSig);

    // add item to on chain tree
    const addItemsToItemClassAccounts: Instructions.Item.AddItemsToItemClass = {
      itemClass: itemClass,
      itemMints: [itemMintPNftOutput.mintAddress],
    };

    const addItemsToItemClassResult = await itemProgram.addItemsToItemClass(
      addItemsToItemClassAccounts
    );
    console.log("addItemsToItemClassTxSig: %s", addItemsToItemClassResult.txid);

    // add item to off chain tree
    itemClassOffChainTree.updateLeaf(
      0,
      itemMintPNftOutput.mintAddress.toBuffer()
    );
    const itemProof = itemClassOffChainTree.getProof(0);

    // complete the build process
    const completeBuildAccounts: Instructions.Item.CompleteBuildAccounts = {
      itemMint: itemMintPNftOutput.mintAddress,
      itemClass: itemClass,
      builder: itemProgram.client.provider.publicKey,
    };
    const completeBuildArgs: Instructions.Item.CompleteBuildArgs = {
      root: itemProof.root,
      leafIndex: itemProof.leafIndex,
      proof: itemProof.proof,
    };

    const completeBuildResult = await itemProgram.completeBuild(
      completeBuildAccounts,
      completeBuildArgs
    );
    console.log("completeBuildTxSig: %s", completeBuildResult.txid);

    // send item to builder
    const receiveItemAccounts: Instructions.Item.ReceiveItemAccounts = {
      itemMint: itemMintPNftOutput.mintAddress,
      itemClass: itemClass,
      builder: itemProgram.client.provider.publicKey,
    };

    const receiveItemResult = await itemProgram.receiveItem(
      receiveItemAccounts
    );
    console.log("receiveItemTxSig: %s", receiveItemResult.txid);

    // assert builder received their item
    const builderItemAta = splToken.getAssociatedTokenAddressSync(
      itemMintPNftOutput.mintAddress,
      payer.publicKey
    );
    const tokenBalanceResponse =
      await itemProgram.client.provider.connection.getTokenAccountBalance(
        builderItemAta
      );
    assert.isTrue(
      new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1))
    );

    // get all build material mints/item classes
    const [build, _buildBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build"),
        itemClass.toBuffer(),
        itemProgram.client.provider.publicKey!.toBuffer(),
      ],
      itemProgram.id
    );
    const buildData = await itemProgram.client.account.build.fetch(build);
    // [item_class, mint pubkeys]
    const buildMaterialMints: [
      anchor.web3.PublicKey,
      anchor.web3.PublicKey[]
    ][] = [];
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
            builder: itemProgram.client.provider.publicKey,
            payer: itemProgram.client.provider.publicKey,
            itemClass: itemClass,
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
              itemClass: itemClass,
              builder: itemProgram.client.provider.publicKey,
              payer: itemProgram.client.provider.publicKey,
            };

          const consumeBuildMaterialResult =
            await itemProgram.consumeBuildMaterial(
              consumeBuildMaterialAccounts
            );
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
              builder: payer.publicKey,
              payer: payer.publicKey,
              itemClass: itemClass,
            };

          const returnBuildMaterialResult =
            await itemProgram.returnBuildMaterial(returnBuildMaterialAccounts);
          console.log(
            "returnBuildMaterialTxSig: %s",
            returnBuildMaterialResult.txid
          );
          // assert builder received their item back
          const builderItemAta = splToken.getAssociatedTokenAddressSync(
            mint,
            payer.publicKey
          );
          const tokenBalanceResponse =
            await itemProgram.client.provider.connection.getTokenAccountBalance(
              builderItemAta
            );
          assert.isTrue(
            new anchor.BN(tokenBalanceResponse.value.amount).eq(
              new anchor.BN(1)
            )
          );
        }
      }
    }
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
