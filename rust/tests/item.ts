import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as metaplex from "@metaplex-foundation/js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import { Instructions, Idls, ItemProgram } from "@raindrops-protocol/raindrops";
import * as splToken from "@solana/spl-token";
import * as cmp from "@solana/spl-account-compression";
import { assert } from "chai";

describe.only("item", () => {
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
          autoActivate: true,
          materials: [],
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
        autoActivate: true,
        materials: [
          {
            itemMint: null,
            itemClass: materials[0][0],
            amount: new BN(1),
          },
          {
            itemMint: null,
            itemClass: materials[1][0],
            amount: new BN(1),
          },
          {
            itemMint: null,
            itemClass: materials[2][0],
            amount: new BN(1),
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
    };

    const startBuildResult = await itemProgram.startBuild(startBuildAccounts);
    console.log("startBuildTxSig: %s", startBuildResult.txid);

    // escrow the materials with the build pda
    for (let material of materials) {
      // create pNFTs which represent the material item classes
      const client = new metaplex.Metaplex(connection, {}).use(
        metaplex.keypairIdentity(payer)
      );

      const materialMintPNftOutput = await client.nfts().create({
        tokenStandard: mpl.TokenStandard.ProgrammableNonFungible,
        uri: "https://foo.com/bar.json",
        name: "pNFT1",
        sellerFeeBasisPoints: 500,
        symbol: "PN",
      });
      console.log(
        "createPNftTxSig: %s",
        materialMintPNftOutput.response.signature
      );

      // add mint to the items tree on chain
      const addItemsToItemClassAccounts: Instructions.Item.AddItemsToItemClass =
        {
          itemClass: material[0],
          itemMints: [materialMintPNftOutput.mintAddress],
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
      material[1].updateLeaf(0, materialMintPNftOutput.mintAddress.toBuffer());

      const materialProof = material[1].getProof(0);

      // verify build material
      const verifyBuildMaterialAccounts: Instructions.Item.VerifyBuildMaterialAccounts =
        {
          materialMint: materialMintPNftOutput.mintAddress,
          materialItemClass: material[0],
          itemClass: itemClass,
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
          materialMint: materialMintPNftOutput.mintAddress,
        };

      const addBuildMaterialResult = await itemProgram.addBuildMaterial(
        addBuildMaterialAccounts
      );
      console.log("addBuildMaterialTxSig: %s", addBuildMaterialResult.txid);
    }

    // complete the build process
    const completeBuildAccounts: Instructions.Item.CompleteBuildAccounts = {
      itemClass: itemClass,
    };
    const completeBuildResult = await itemProgram.completeBuild(
      completeBuildAccounts
    );
    console.log("completeBuildTxSig: %s", completeBuildResult.txid);

    // create item pNFT, transferred to the builder when the build is complete
    const client = new metaplex.Metaplex(connection, {}).use(
      metaplex.keypairIdentity(payer)
    );

    const itemMintPNftOutput = await client.nfts().create({
      tokenStandard: mpl.TokenStandard.ProgrammableNonFungible,
      uri: "https://foo.com/bar.json",
      name: "pNFT1",
      sellerFeeBasisPoints: 500,
      symbol: "PN",
    });
    console.log("createPNftTxSig: %s", itemMintPNftOutput.response.signature);

    const pNft = await client.nfts().findByMint({
      mintAddress: itemMintPNftOutput.mintAddress,
    });

    // escrow the pNFT with the item class

    const itemTransferOutput = await client.nfts().transfer({
      nftOrSft: pNft,
      authority: payer,
      fromOwner: payer.publicKey,
      toOwner: itemClass,
    });
    console.log("transferPNftTxSig: %s", itemTransferOutput.response.signature);

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

    // set the pNft as the output of the build
    const setBuildOutputAccounts: Instructions.Item.SetBuildOutputAccounts = {
      itemMint: itemMintPNftOutput.mintAddress,
      itemClass: itemClass,
    };

    const setBuildOutputArgs: Instructions.Item.SetBuildOutputArgs = {
      root: itemProof.root,
      leafIndex: itemProof.leafIndex,
      proof: itemProof.proof,
    };

    const setBuildOutputResult = await itemProgram.setBuildOutput(
      setBuildOutputAccounts,
      setBuildOutputArgs
    );
    console.log("setBuildOutputTxSig: %s", setBuildOutputResult.txid);

    const receiveItemAccounts: Instructions.Item.ReceiveItemAccounts = {
      itemMint: itemMintPNftOutput.mintAddress,
      itemClass: itemClass,
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
