import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as metaplex from "@metaplex-foundation/js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Instructions,
  Idls,
  ItemProgram,
} from "@raindrops-protocol/raindrops";
import * as splToken from "@solana/spl-token";
import { assert } from "chai";

describe.only("item", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it("build pNFT item class", async () => {
    const payer = await newPayer(connection);

    const itemProgram = await ItemProgram.getProgramWithConfig(
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

    // build all the material item classes
    const materialItemClasses: anchor.web3.PublicKey[] = [];
    for (let i = 0; i < 3; i++) {
      let createItemClassArgs: Instructions.Item.CreateItemClassV1Args = {
        schemaArgs: {
          buildEnabled: false,
          autoActivate: true,
          materials: [],
        },
      };
  
      let [itemClass, createItemClassResult] = await itemProgram.createItemClassV1(createItemClassArgs);
      console.log("createItemClassTxSig: %s", createItemClassResult.txid);

      materialItemClasses.push(itemClass)
    }

    // create the item class which will be built using the materials
    const createItemClassArgs: Instructions.Item.CreateItemClassV1Args = {
      schemaArgs: {
        buildEnabled: true,
        autoActivate: true,
        materials: [
          {
            itemClass: materialItemClasses[0],
            amount: new BN(1),
          },
          {
            itemClass: materialItemClasses[1],
            amount: new BN(1),
          },
          {
            itemClass: materialItemClasses[2],
            amount: new BN(1),
          }
        ]
      },
    };

    const [itemClass, createItemClassResult] = await itemProgram.createItemClassV1(createItemClassArgs);
    console.log("createItemClassTxSig: %s", createItemClassResult.txid);

    // start the build process
    const startBuildAccounts: Instructions.Item.StartBuildAccounts = {
      itemClass: itemClass,
    }

    const startBuildResult = await itemProgram.startBuild(startBuildAccounts)
    console.log("startBuildTxSig: %s", startBuildResult.txid);

    // escrow the materials with the build pda
    for (let materialItemClass of materialItemClasses) {

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
      console.log("createPNftTxSig: %s", materialMintPNftOutput.response.signature)

      const addBuildMaterialAccounts: Instructions.Item.AddBuildMaterialAccounts = {
        itemClass: itemClass,
        materialMint: materialMintPNftOutput.mintAddress,
        materialItemClass: materialItemClass,
      }
  
      const addBuildMaterialResult = await itemProgram.addBuildMaterial(addBuildMaterialAccounts);
      console.log("addBuildMaterialTxSig: %s", addBuildMaterialResult.txid);
    }

    // complete the build process
    const completeBuildAccounts: Instructions.Item.CompleteBuildAccounts = {
      itemClass: itemClass,
    }
    const completeBuildResult = await itemProgram.completeBuild(completeBuildAccounts)
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
    console.log("createPNftTxSig: %s", itemMintPNftOutput.response.signature)

    const nftOrSft = await client.nfts().findByMint({
      mintAddress: itemMintPNftOutput.mintAddress,
    });

    const itemTransferOutput = await client.nfts().transfer({
      nftOrSft: nftOrSft,
      authority: payer,
      fromOwner: payer.publicKey,
      toOwner: itemClass,
    });
    console.log("transferPNftTxSig: %s", itemTransferOutput.response.signature);

    const receiveItemAccounts: Instructions.Item.ReceiveItemAccounts = {
      itemMint: itemMintPNftOutput.mintAddress,
      itemClass: itemClass,
    }

    const receiveItemResult = await itemProgram.receiveItem(receiveItemAccounts);
    console.log("receiveItemTxSig: %s", receiveItemResult.txid);

    // assert builder received their item
    const builderItemAta = splToken.getAssociatedTokenAddressSync(itemMintPNftOutput.mintAddress, payer.publicKey);
    const tokenBalanceResponse = await itemProgram.client.provider.connection.getTokenAccountBalance(builderItemAta);
    assert.isTrue(new anchor.BN(tokenBalanceResponse.value.amount).eq(new anchor.BN(1)));
  });
});

async function newPayer(
  connection: anchor.web3.Connection
): Promise<anchor.web3.Keypair> {
  const payer = anchor.web3.Keypair.generate();

  const txSig = await connection.requestAirdrop(
    payer.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(txSig);

  return payer;
}
