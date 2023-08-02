import * as anchor from "@project-serum/anchor";
import * as splToken from "@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Constants,
  Idls,
  AvatarRpc,
  AvatarHttp,
} from "@raindrops-protocol/raindrops";
import express from "express";
import * as fs from "fs";
import { assert } from "chai";
import { describe } from "mocha";
import * as cmp from "@solana/spl-account-compression";
import * as metaplex from "@metaplex-foundation/js";
import * as mplAuth from "@metaplex-foundation/mpl-token-auth-rules";

describe("avatar", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = new anchor.Program<Idls.Avatar>(
    Idls.AvatarIDL,
    Constants.ProgramIds.AVATAR_ID,
    anchor.getProvider()
  );
  const provider = program.provider as anchor.AnchorProvider;
  const connection = provider.connection;

  const rainTokenMint = Constants.Common.RAIN_TOKEN_MINT;

  // Mint Authority for our mock $RAIN
  const mintAuthoritySecretKey = new Uint8Array([
    100, 162, 5, 160, 251, 9, 105, 243, 77, 211, 169, 101, 169, 237, 4, 234, 35,
    250, 235, 162, 55, 77, 144, 249, 220, 185, 242, 225, 8, 160, 200, 130, 1,
    237, 169, 176, 82, 206, 183, 81, 233, 30, 153, 237, 13, 46, 130, 71, 22,
    179, 133, 3, 170, 140, 225, 16, 11, 210, 69, 163, 102, 144, 242, 169,
  ]);

  // address: 8XbgRBz8pHzCBy4mwgr4ViDhJWFc35cd7E5oo3t5FvY
  const rainTokenMintAuthority = anchor.web3.Keypair.fromSecretKey(
    mintAuthoritySecretKey
  );

  before("create rain token vault", async () => {
    const [_rpc, _http, tokenVaultPayer] = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      tokenVaultPayer,
      rainTokenMint,
      new anchor.web3.PublicKey("BuwHRcmPwbVhnY6HBm5tTSdj9z8b59atBaaihRbntWR9")
    );
  });

  // expose files at http://localhost:3000/{file}.json
  const fsServer = fileServer("./tests/files/lily");

  // shutdown express server after testing
  after(() => fsServer.close());

  it("lily avatar smoke test", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
      { id: 1, name: "aura", status: { mutable: true } },
      { id: 2, name: "background", status: { mutable: true } },
      { id: 3, name: "clothing", status: { mutable: true } },
      { id: 4, name: "eyes", status: { mutable: true } },
      { id: 5, name: "eyewear", status: { mutable: true } },
      { id: 6, name: "hair", status: { mutable: true } },
      { id: 7, name: "hands", status: { mutable: true } },
      { id: 8, name: "headgear", status: { mutable: true } },
      { id: 9, name: "legendary", status: { mutable: true } },
      { id: 10, name: "mouth", status: { mutable: true } },
      { id: 11, name: "origin", status: { mutable: true } },
    ];

    const variantMetadata = [
      {
        id: "gender12",
        name: "gender",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "gender12",
            optionId: "gendero0",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "gender12",
            optionId: "gendero1",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
      {
        id: "haircolo",
        name: "hair color",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "haircolo",
            optionId: "haircol1",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "haircolo",
            optionId: "haircol2",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "haircolo",
            optionId: "haircol3",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
      {
        id: "skintone",
        name: "skin tone",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "skintone",
            optionId: "skinton1",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "skintone",
            optionId: "skinton2",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "skintone",
            optionId: "skinton3",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "skintone",
            optionId: "skinton4",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const avatarClassData = await avatarClassAuthorityClient.getAvatarClass(
      avatarClass
    );
    assert.equal(avatarClassData.variantMetadata.length, 3);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
      avatarMint: nftMint,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [
        {
          variantId: "gender12",
          optionId: "gendero0",
        },
        {
          variantId: "haircolo",
          optionId: "haircol1",
        },
        {
          variantId: "skintone",
          optionId: "skinton1",
        },
      ],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // check avatar data is what we expect
    const newAvatarData = await avatarClassAuthorityClient.getAvatar(avatar);
    assert(newAvatarData.avatarClass.equals(avatarClass));
    assert(newAvatarData.mint.equals(nftMint));
    assert(newAvatarData.traits.length === 0);
    assert(newAvatarData.variants[0].optionId === "gendero0");

    // create an trait to equip
    const [_traitAuthorityClient, _traitAuthorityHttpClient, traitAuthority] =
      await newPayer(connection);

    const traitArgs: any[] = [
      { name: "andro", attributes: [0] },
      { name: "angry", attributes: [1] },
      { name: "axe", attributes: [2] },
      { name: "backwards-hat", attributes: [3] },
      { name: "bed-head", attributes: [4] },
      { name: "cloak", attributes: [5] },
      { name: "gold", attributes: [6] },
      { name: "hollow", attributes: [7] },
      { name: "pipe", attributes: [8] },
    ];

    const traitMints: anchor.web3.PublicKey[] = [];
    for (let arg of traitArgs) {
      const traitMint = await createTraitSft(
        connection,
        arg.name,
        traitAuthority,
        [nftHolder.publicKey]
      );

      await createTrait(
        arg.name,
        traitMint,
        arg.attributes,
        { enabled: true },
        avatarClass,
        avatarClassAuthorityClient
      );

      traitMints.push(traitMint);
    }

    // equip all the traits to the avatar
    for (let traitMint of traitMints) {
      const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
        avatar: avatar,
        payer: nftHolderClient.provider.publicKey,
        traitMint: traitMint,
      };

      const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
      const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
        equipTraitTx
      );
      console.log("equipTraitTxSig: %s", equipTraitTxSig);
    }

    // generate render config
    const avatarRenderConfig =
      await avatarClassAuthorityClient.getAvatarRenderConfig(avatar);

    // write it to file for inspection
    const output = JSON.stringify(avatarRenderConfig, undefined, 2);
    fs.writeFileSync("render-config.json", output, "utf8");

    // generate a preview render config with an updated variant
    const previewRenderConfig =
      await avatarClassAuthorityClient.getAvatarRenderConfig(
        avatar,
        [],
        [],
        [{ variantId: "haircolo", optionId: "haircol2" }]
      );
    const variantPreview = previewRenderConfig.variants.primaryVariants.find(
      (variant) => variant.variantId === "haircolo"
    );
    assert.equal(variantPreview.variantId, "haircolo");
    assert.equal(variantPreview.optionId, "haircol2");

    // remove a trait
    const removeTraitAccounts: AvatarRpc.RemoveTraitAccounts = {
      avatar: avatar,
      payer: nftHolder.publicKey,
      traitMint: traitMints[0],
    };

    const tx = await nftHolderClient.removeTrait(removeTraitAccounts);
    const removeTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      tx,
      undefined,
      { skipPreflight: false }
    );
    console.log("removeTraitTxSig: %s", removeTraitTxSig);

    const preUpdateVariantsAvatarData = await nftHolderClient.getAvatar(avatar);
    assert(preUpdateVariantsAvatarData.variants[0].optionId === "gendero0");

    // begin update variant process
    const beginVariantUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTarget = new AvatarRpc.UpdateTargetClassVariant(
      "gender12",
      "gendero1"
    );

    const beginVariantUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTarget,
    };

    const beginVariantUpdateTx = await nftHolderClient.beginUpdate(
      beginVariantUpdateAccounts,
      beginVariantUpdateArgs
    );
    const beginVariantUpdateTxSig =
      await nftHolderClient.provider.sendAndConfirm(beginVariantUpdateTx);
    console.log("beginVariantUpdateTxSig: %s", beginVariantUpdateTxSig);

    // update avatar variant
    const updateClassVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
    };

    const updateClassVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTarget,
    };

    const updateClassVariantTx = await nftHolderClient.updateVariant(
      updateClassVariantAccounts,
      updateClassVariantArgs
    );
    const updateClassVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(updateClassVariantTx);
    console.log("updateClassVariantTxSig: %s", updateClassVariantTxSig);

    // check variant value persisted
    const postUpdateVariantsAvatarData = await nftHolderClient.getAvatar(
      avatar
    );
    for (let variant of postUpdateVariantsAvatarData.variants) {
      if (variant.variantId === "gender12") {
        assert(variant.optionId === "gendero1");
      }
    }
  });
  it("update trait and class variant concurrently, no pay or gate", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const variantMetadata = [
      {
        id: "gender12",
        name: "gender",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "gender12",
            optionId: "gendero0",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "gender12",
            optionId: "gendero1",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [
        {
          variantId: "gender12",
          optionId: "gendero0",
        },
      ],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [
        {
          name: "testVariant",
          id: "vfoo1234",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "vfoo1234",
              optionId: "gfjlk123",
              paymentDetails: null,
              traitGate: null,
            },
            {
              variantId: "vfoo1234",
              optionId: "lol123gf",
              paymentDetails: null,
              traitGate: null,
            },
          ],
        },
      ]
    );

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolder.publicKey,
      traitMint: traitMint,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    const avatarDataPre = await nftHolderClient.getAvatar(avatar);
    assert(avatarDataPre.traits[0].variantSelection[0].variantId == "vfoo1234");
    assert(avatarDataPre.traits[0].variantSelection[0].optionId == "gfjlk123");

    // begin updating the trait variant variant
    const beginUpdateTraitVariantAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTargetTraitVariant = new AvatarRpc.UpdateTargetTraitVariant(
      "vfoo1234",
      "lol123gf",
      AvatarRpc.traitPDA(avatarClass, traitMint)
    );

    const beginUpdateTraitVariantArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTargetTraitVariant,
    };

    const beginUpdateTraitVariantTx = await nftHolderClient.beginUpdate(
      beginUpdateTraitVariantAccounts,
      beginUpdateTraitVariantArgs
    );
    const beginUpdateTraitVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(
        beginUpdateTraitVariantTx,
        [],
        { commitment: "confirmed", skipPreflight: false }
      );
    console.log(
      "beginUpdateTraitVariantTxSig: %s",
      beginUpdateTraitVariantTxSig
    );

    // begin updating the class variant
    // intentionally we are starting 2 updates concurrently
    const beginUpdateClassVariantAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTargetClassVariant = new AvatarRpc.UpdateTargetClassVariant(
      "gender12",
      "gendero1"
    );

    const beginUpdateClassVariantArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTargetClassVariant,
    };

    const beginUpdateClassVariantTx = await nftHolderClient.beginUpdate(
      beginUpdateClassVariantAccounts,
      beginUpdateClassVariantArgs
    );
    const beginUpdateClassVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(
        beginUpdateClassVariantTx,
        [],
        { commitment: "confirmed", skipPreflight: false }
      );
    console.log(
      "beginUpdateClassVariantTxSig: %s",
      beginUpdateClassVariantTxSig
    );

    // do the trait update, no payment required this time

    const updateTraitVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
    };
    const updateTraitVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTargetTraitVariant,
    };

    const updateTraitVariantTx = await nftHolderClient.updateVariant(
      updateTraitVariantAccounts,
      updateTraitVariantArgs
    );
    const updateTraitVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(updateTraitVariantTx);
    console.log("updateTraitVariantTxSig: %s", updateTraitVariantTxSig);

    // do the class variant update, no payment required this time

    const updateClassVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
    };
    const updateClassVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTargetClassVariant,
    };

    const updateClassVariantTx = await nftHolderClient.updateVariant(
      updateClassVariantAccounts,
      updateClassVariantArgs
    );
    const updateClassVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(updateClassVariantTx);
    console.log("updateClassVariantTxSig: %s", updateClassVariantTxSig);

    // check avatar data
    const avatarDataPost = await nftHolderClient.getAvatar(avatar);

    // trait variant
    assert(
      avatarDataPost.traits[0].variantSelection[0].variantId == "vfoo1234"
    );
    assert(avatarDataPost.traits[0].variantSelection[0].optionId == "lol123gf");

    // class variant
    assert(avatarDataPost.variants[0].variantId === "gender12");
    assert(avatarDataPost.variants[0].optionId === "gendero1");
  });
  it("update trait variant with invalid option", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const variantMetadata = [
      {
        id: "gender12",
        name: "gender",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "gender12",
            optionId: "gendero0",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "gender12",
            optionId: "gendero1",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
      avatarMint: nftMint,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [
        {
          variantId: "gender12",
          optionId: "gendero0",
        },
      ],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [
        {
          name: "testVariant",
          id: "ertylol9",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "ertylol9",
              optionId: "1234lol1",
              paymentDetails: null,
              traitGate: null,
            },
            {
              variantId: "ertylol9",
              optionId: "gqwolr78",
              paymentDetails: null,
              traitGate: null,
            },
          ],
        },
      ]
    );

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolder.publicKey,
      traitMint: traitMint,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    const avatarDataPre = await nftHolderClient.getAvatar(avatar);
    assert(avatarDataPre.traits[0].variantSelection[0].variantId == "ertylol9");
    assert(avatarDataPre.traits[0].variantSelection[0].optionId == "1234lol1");

    const beginUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };
    const beginUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: new AvatarRpc.UpdateTargetTraitVariant(
        "ertylol9",
        "gqjsolr22",
        AvatarRpc.traitPDA(avatarClass, traitMint)
      ),
    };

    // client side failure here, does fail on contract too
    await assertRejects(
      nftHolderClient.beginUpdate(beginUpdateAccounts, beginUpdateArgs)
    );
  });
  it("update trait variant with spl payment transfer", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const variantMetadata = [
      {
        id: "gender12",
        name: "gender",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "gender12",
            optionId: "gendero0",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "gender12",
            optionId: "gendero1",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [
        {
          variantId: "gender12",
          optionId: "gendero0",
        },
      ],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // create payment mint

    const paymentMint = await createPaymentMint(nftHolderClient, [
      nftHolder.publicKey,
    ]);

    const treasury = anchor.web3.Keypair.generate().publicKey;
    const treasuryAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      avatarClassAuthority,
      paymentMint,
      treasury
    );

    // create payment method pda

    const createPaymentMethodAccounts: AvatarRpc.CreatePaymentMethodAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
    };
    const createPaymentMethodArgs: AvatarRpc.CreatePaymentMethodArgs = {
      assetClass: new AvatarRpc.FungiblePaymentAssetClass(paymentMint),
      action: new AvatarRpc.TransferPaymentAction(treasury),
    };

    const [createPaymentMethodTx, paymentMethodAddr] =
      await avatarClassAuthorityClient.createPaymentMethod(
        createPaymentMethodAccounts,
        createPaymentMethodArgs
      );
    const createPaymentMethodTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createPaymentMethodTx
      );
    console.log("createPaymentMethodTxSig: %s", createPaymentMethodTxSig);

    // create trait using payment method

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [
        {
          name: "testVariant",
          id: "acc34jko",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "acc34jko",
              optionId: "blahblah",
              paymentDetails: null,
              traitGate: null,
            },
            {
              variantId: "acc34jko",
              optionId: "89hgjklo",
              paymentDetails: {
                paymentMethod: paymentMethodAddr,
                amount: new anchor.BN(100000),
              },
              traitGate: null,
            },
          ],
        },
      ]
    );

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolder.publicKey,
      traitMint: traitMint,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    // start the update variant process

    const beginUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTarget = new AvatarRpc.UpdateTargetTraitVariant(
      "acc34jko",
      "89hgjklo",
      AvatarRpc.traitPDA(avatarClass, traitMint)
    );

    const beginUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTarget,
    };

    const beginUpdateTx = await nftHolderClient.beginUpdate(
      beginUpdateAccounts,
      beginUpdateArgs
    );
    const beginUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      beginUpdateTx,
      [],
      { commitment: "confirmed" }
    );
    console.log("beginUpdateTxSig: %s", beginUpdateTxSig);

    const payForUpdateAccounts: AvatarRpc.PayForUpdateAccounts = {
      avatar: avatar,
      authority: nftHolderClient.provider.publicKey,
    };
    const payForUpdateArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(100000),
      updateTarget: updateTarget,
    };

    const txns = await nftHolderClient.payForUpdate(
      payForUpdateAccounts,
      payForUpdateArgs
    );
    assert.isTrue(txns.length === 1);

    const payForUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      txns[0],
      [],
      { commitment: "confirmed", skipPreflight: true }
    );
    console.log("payForUpdateTxSig: %s", payForUpdateTxSig);

    const updateTraitVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
    };

    const updateTraitVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTarget,
    };

    const updateTraitVariantTx = await nftHolderClient.updateVariant(
      updateTraitVariantAccounts,
      updateTraitVariantArgs
    );
    const updateTraitVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(updateTraitVariantTx);
    console.log("updateTraitVariantTxSig: %s", updateTraitVariantTxSig);

    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.equal(
      avatarData.traits[0].variantSelection[0].variantId,
      "acc34jko"
    );
    assert.equal(avatarData.traits[0].variantSelection[0].optionId, "89hgjklo");

    // check treasury received their tokens
    const treasuryBalanceResult = await connection.getTokenAccountBalance(
      treasuryAta.address
    );
    assert.isTrue(
      new anchor.BN(treasuryBalanceResult.value.amount).eq(
        new anchor.BN(100000)
      )
    );
  });
  it("update trait variant with nft payment transfer", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const variantMetadata = [
      {
        id: "gender12",
        name: "gender",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "gender12",
            optionId: "gendero0",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "gender12",
            optionId: "gendero1",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [
        {
          variantId: "gender12",
          optionId: "gendero0",
        },
      ],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const treasury = anchor.web3.Keypair.generate().publicKey;

    const [paymentNfts, paymentMethod, merkleTree] =
      await createNonFungiblePaymentMethod(
        connection,
        nftHolder,
        avatarClassAuthorityClient,
        avatarClass,
        1,
        treasury
      );

    const treasuryAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      avatarClassAuthority,
      paymentNfts[0],
      treasury
    );

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [
        {
          name: "testVariant",
          id: "acc34jko",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "acc34jko",
              optionId: "blahblah",
              paymentDetails: null,
              traitGate: null,
            },
            {
              variantId: "acc34jko",
              optionId: "89hgjklo",
              paymentDetails: {
                paymentMethod: paymentMethod,
                amount: new anchor.BN(1),
              },
              traitGate: null,
            },
          ],
        },
      ]
    );

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolder.publicKey,
      traitMint: traitMint,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    // begin the update

    const beginUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTarget = new AvatarRpc.UpdateTargetTraitVariant(
      "acc34jko",
      "89hgjklo",
      AvatarRpc.traitPDA(avatarClass, traitMint)
    );
    const beginUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTarget,
    };

    const beginUpdateTx = await nftHolderClient.beginUpdate(
      beginUpdateAccounts,
      beginUpdateArgs
    );
    const beginUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      beginUpdateTx
    );
    console.log("beginUpdateTxSig: %s", beginUpdateTxSig);

    const proof = await merkleTree.getProof(0);

    const payForUpdateAccounts: AvatarRpc.PayForUpdateAccounts = {
      avatar: avatar,
      authority: nftHolderClient.provider.publicKey,
      paymentMint: paymentNfts[0],
    };

    const payForUpdateArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(1),
      verifyPaymentMintArgs: {
        proof: proof.proof,
        leafIndex: proof.leafIndex,
        root: proof.root,
      },
      updateTarget: updateTarget,
    };

    const payForUpdateTxns = await nftHolderClient.payForUpdate(
      payForUpdateAccounts,
      payForUpdateArgs
    );
    assert.isTrue(payForUpdateTxns.length === 2);
    for (let tx of payForUpdateTxns) {
      const payForUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
        tx
      );
      console.log("payForUpdateTxSig: %s", payForUpdateTxSig);
    }

    // update the trait variant
    const updateTraitVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: avatarClassAuthorityClient.provider.publicKey,
    };

    const updateTraitVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTarget,
    };

    const updateTraitVariantTx = await avatarClassAuthorityClient.updateVariant(
      updateTraitVariantAccounts,
      updateTraitVariantArgs
    );
    const updateTraitVariantTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        updateTraitVariantTx
      );
    console.log("updateTraitVariantTxSig: %s", updateTraitVariantTxSig);

    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.equal(
      avatarData.traits[0].variantSelection[0].variantId,
      "acc34jko"
    );
    assert.equal(avatarData.traits[0].variantSelection[0].optionId, "89hgjklo");

    // check treasury received their tokens
    const treasuryBalanceResult = await connection.getTokenAccountBalance(
      treasuryAta.address
    );
    assert.isTrue(
      new anchor.BN(treasuryBalanceResult.value.amount).eq(new anchor.BN(1))
    );
  });
  it("update trait variant with nft payment burn", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const variantMetadata = [
      {
        id: "gender12",
        name: "gender",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "gender12",
            optionId: "gendero0",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "gender12",
            optionId: "gendero1",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [
        {
          variantId: "gender12",
          optionId: "gendero0",
        },
      ],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const [paymentNft, paymentMethod, merkleTree] =
      await createNonFungiblePaymentMethod(
        connection,
        nftHolder,
        avatarClassAuthorityClient,
        avatarClass,
        1
      );

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [
        {
          name: "testVariant",
          id: "acc34jko",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "acc34jko",
              optionId: "blahblah",
              paymentDetails: null,
              traitGate: null,
            },
            {
              variantId: "acc34jko",
              optionId: "89hgjklo",
              paymentDetails: {
                paymentMethod: paymentMethod,
                amount: new anchor.BN(1),
              },
              traitGate: null,
            },
          ],
        },
      ]
    );

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolder.publicKey,
      traitMint: traitMint,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    // begin the update

    const beginUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTarget = new AvatarRpc.UpdateTargetTraitVariant(
      "acc34jko",
      "89hgjklo",
      AvatarRpc.traitPDA(avatarClass, traitMint)
    );

    const beginUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTarget,
    };

    const beginUpdateTx = await nftHolderClient.beginUpdate(
      beginUpdateAccounts,
      beginUpdateArgs
    );
    const beginUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      beginUpdateTx
    );
    console.log("beginUpdateTxSig: %s", beginUpdateTxSig);

    const proof = await merkleTree.getProof(0);

    const payForUpdateAccounts: AvatarRpc.PayForUpdateAccounts = {
      avatar: avatar,
      authority: nftHolderClient.provider.publicKey,
      paymentMint: paymentNft[0],
    };

    const payForUpdateArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(1),
      updateTarget: updateTarget,
      verifyPaymentMintArgs: {
        proof: proof.proof,
        leafIndex: proof.leafIndex,
        root: proof.root,
      },
    };

    const payForUpdateTxns = await nftHolderClient.payForUpdate(
      payForUpdateAccounts,
      payForUpdateArgs
    );
    assert.isTrue(payForUpdateTxns.length === 2);
    for (let tx of payForUpdateTxns) {
      const payForUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
        tx
      );
      console.log("payForUpdateTxSig: %s", payForUpdateTxSig);
    }

    // update the trait variant
    const updateTraitVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: avatarClassAuthorityClient.provider.publicKey,
    };

    const updateTraitVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTarget,
    };

    const updateTraitVariantTx = await avatarClassAuthorityClient.updateVariant(
      updateTraitVariantAccounts,
      updateTraitVariantArgs
    );
    const updateTraitVariantTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        updateTraitVariantTx
      );
    console.log("updateTraitVariantTxSig: %s", updateTraitVariantTxSig);

    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.equal(
      avatarData.traits[0].variantSelection[0].variantId,
      "acc34jko"
    );
    assert.equal(avatarData.traits[0].variantSelection[0].optionId, "89hgjklo");
  });
  it("update trait variant with spl payment burn", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const variantMetadata = [
      {
        id: "gender12",
        name: "gender",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "gender12",
            optionId: "gendero0",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "gender12",
            optionId: "gendero1",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [
        {
          variantId: "gender12",
          optionId: "gendero0",
        },
      ],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const paymentMint = await createPaymentMint(nftHolderClient, [
      nftHolder.publicKey,
    ]);

    const createPaymentMethodAccounts: AvatarRpc.CreatePaymentMethodAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
    };
    const createPaymentMethodArgs: AvatarRpc.CreatePaymentMethodArgs = {
      assetClass: new AvatarRpc.FungiblePaymentAssetClass(paymentMint),
      action: new AvatarRpc.BurnPaymentAction(),
    };

    const [createPaymentMethodTx, paymentMethodAddr] =
      await avatarClassAuthorityClient.createPaymentMethod(
        createPaymentMethodAccounts,
        createPaymentMethodArgs
      );
    const createPaymentMethodTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createPaymentMethodTx
      );
    console.log("createPaymentMethodTxSig: %s", createPaymentMethodTxSig);

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [
        {
          name: "testVariant",
          id: "acc34jko",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "acc34jko",
              optionId: "blahblah",
              paymentDetails: null,
              traitGate: null,
            },
            {
              variantId: "acc34jko",
              optionId: "89hgjklo",
              paymentDetails: {
                paymentMethod: paymentMethodAddr,
                amount: new anchor.BN(100000),
              },
              traitGate: null,
            },
          ],
        },
      ]
    );

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolder.publicKey,
      traitMint: traitMint,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    const beginUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTarget = new AvatarRpc.UpdateTargetTraitVariant(
      "acc34jko",
      "89hgjklo",
      AvatarRpc.traitPDA(avatarClass, traitMint)
    );
    const beginUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTarget,
    };

    const beginUpdateTx = await nftHolderClient.beginUpdate(
      beginUpdateAccounts,
      beginUpdateArgs
    );
    const beginUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      beginUpdateTx,
      [],
      { commitment: "confirmed" }
    );
    console.log("beginUpdateTxSig: %s", beginUpdateTxSig);

    const payForUpdateAccounts: AvatarRpc.PayForUpdateAccounts = {
      authority: nftHolderClient.provider.publicKey,
      avatar: avatar,
    };
    const payForUpdateArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(100000),
      updateTarget: updateTarget,
    };

    const txns = await nftHolderClient.payForUpdate(
      payForUpdateAccounts,
      payForUpdateArgs
    );
    assert.isTrue(txns.length === 1);

    const payForUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      txns[0],
      [],
      { commitment: "confirmed", skipPreflight: true }
    );
    console.log("payForUpdateTxSig: %s", payForUpdateTxSig);

    const updateTraitVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
    };

    const updateTraitVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTarget,
    };

    const updateTraitVariantTx = await nftHolderClient.updateVariant(
      updateTraitVariantAccounts,
      updateTraitVariantArgs
    );
    const updateTraitVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(updateTraitVariantTx);
    console.log("updateTraitVariantTxSig: %s", updateTraitVariantTxSig);

    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.equal(
      avatarData.traits[0].variantSelection[0].variantId,
      "acc34jko"
    );
    assert.equal(avatarData.traits[0].variantSelection[0].optionId, "89hgjklo");
  });
  it("update trait variant, with gate requirement", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
      { id: 1, name: "head", status: { mutable: true } },
    ];
    const variantMetadata = [];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx,
        [],
        { skipPreflight: false }
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const hatTraitMint = await createTraitSft(connection, "head", nftHolder, [
      nftHolder.publicKey,
    ]);

    const hatTrait = await createTrait(
      "hat",
      hatTraitMint,
      [1],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient
    );

    const accessoryTraitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      accessoryTraitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [
        {
          name: "testVariant",
          id: "foo1234g",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "foo1234g",
              optionId: "kjloiu23",
              paymentDetails: null,
              traitGate: null,
            },
            {
              variantId: "foo1234g",
              optionId: "kjlo23qw",
              paymentDetails: null,
              traitGate: {
                operator: { and: {} },
                traits: [hatTrait],
              },
            },
          ],
        },
      ]
    );

    const traitMints: anchor.web3.PublicKey[] = [
      hatTraitMint,
      accessoryTraitMint,
    ];
    for (let traitMint of traitMints) {
      const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
        avatar: avatar,
        payer: nftHolder.publicKey,
        traitMint: traitMint,
      };

      const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
      const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
        equipTraitTx
      );
      console.log("equipTraitTxSig: %s", equipTraitTxSig);
    }

    const beginUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTarget = new AvatarRpc.UpdateTargetTraitVariant(
      "foo1234g",
      "kjlo23qw",
      AvatarRpc.traitPDA(avatarClass, accessoryTraitMint)
    );
    const beginUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTarget,
    };

    const beginUpdateTx = await nftHolderClient.beginUpdate(
      beginUpdateAccounts,
      beginUpdateArgs
    );
    const beginUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      beginUpdateTx
    );
    console.log("beginUpdateTxSig: %s", beginUpdateTxSig);

    const updateTraitVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
    };

    const updateTraitVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTarget,
    };

    const updateTraitVariantTx = await nftHolderClient.updateVariant(
      updateTraitVariantAccounts,
      updateTraitVariantArgs
    );
    const updateTraitVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(updateTraitVariantTx);
    console.log("updateTraitVariantTxSig: %s", updateTraitVariantTxSig);

    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.equal(
      avatarData.traits[1].variantSelection[0].variantId,
      "foo1234g"
    );
    assert.equal(avatarData.traits[1].variantSelection[0].optionId, "kjlo23qw");
  });
  it("update avatar variant, no pay or gate", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const variantMetadata = [
      {
        id: "gender12",
        name: "gender",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "gender12",
            optionId: "gendero0",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "gender12",
            optionId: "gendero1",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [
        {
          variantId: "gender12",
          optionId: "gendero0",
        },
      ],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const beginUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTarget = new AvatarRpc.UpdateTargetClassVariant(
      "gender12",
      "gendero1"
    );
    const beginUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTarget,
    };

    const beginUpdateTx = await nftHolderClient.beginUpdate(
      beginUpdateAccounts,
      beginUpdateArgs
    );
    const beginUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      beginUpdateTx
    );
    console.log("beginUpdateTxSig: %s", beginUpdateTxSig);

    const updateClassVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
    };

    const updateClassVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTarget,
    };

    const updateClassVariantTx = await nftHolderClient.updateVariant(
      updateClassVariantAccounts,
      updateClassVariantArgs
    );
    const updateClassVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(updateClassVariantTx);
    console.log("updateClassVariantTxSig: %s", updateClassVariantTxSig);

    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.equal(avatarData.variants[0].variantId, "gender12");
    assert.equal(avatarData.variants[0].optionId, "gendero1");
  });
  it("update avatar variant with spl payment", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const paymentMint = await createPaymentMint(avatarClassAuthorityClient, [
      nftHolder.publicKey,
    ]);

    const treasury = anchor.web3.Keypair.generate().publicKey;

    const variantMetadata = [
      {
        id: "gender12",
        name: "gender",
        status: {
          enabled: true,
        },
        options: [
          {
            variantId: "gender12",
            optionId: "gendero0",
            paymentDetails: null,
            traitGate: null,
          },
          {
            variantId: "gender12",
            optionId: "gendero1",
            paymentDetails: null,
            traitGate: null,
          },
        ],
      },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    // create payment method
    const createPaymentMethodAccounts: AvatarRpc.CreatePaymentMethodAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
    };

    const createPaymentMethodArgs: AvatarRpc.CreatePaymentMethodArgs = {
      assetClass: new AvatarRpc.FungiblePaymentAssetClass(paymentMint),
      action: new AvatarRpc.TransferPaymentAction(treasury),
    };

    const [createPaymentMethodTx, paymentMethod] =
      await avatarClassAuthorityClient.createPaymentMethod(
        createPaymentMethodAccounts,
        createPaymentMethodArgs
      );
    const createPaymentMethodTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createPaymentMethodTx
      );
    console.log("createPaymentMethodTxSig: %s", createPaymentMethodTxSig);

    // update avatar class variant with new payment method
    const updateClassVariantMetadataAccounts: AvatarRpc.UpdateClassVariantMetadataAccounts =
      {
        avatarClass: avatarClass,
        authority: avatarClassAuthority.publicKey,
      };
    const updateClassVariantMetadataArgs: AvatarRpc.UpdateClassVariantMetadataArgs =
      {
        variantMetadata: {
          id: "gender12",
          name: "gender",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "gender12",
              optionId: "gendero0",
              paymentDetails: null,
              traitGate: null,
            },
            {
              variantId: "gender12",
              optionId: "gendero1",
              paymentDetails: {
                paymentMethod: paymentMethod,
                amount: new anchor.BN(100000),
              },
              traitGate: null,
            },
          ],
        },
      };

    const updateClassVariantMetadataTx =
      await avatarClassAuthorityClient.updateClassVariantMetadata(
        updateClassVariantMetadataAccounts,
        updateClassVariantMetadataArgs
      );
    const updateClassVariantMetadataTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        updateClassVariantMetadataTx
      );
    console.log(
      "updateClassVariantMetadataTxSig: %s",
      updateClassVariantMetadataTxSig
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [
        {
          variantId: "gender12",
          optionId: "gendero0",
        },
      ],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const beginUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTarget = new AvatarRpc.UpdateTargetClassVariant(
      "gender12",
      "gendero1"
    );
    const beginUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTarget,
    };

    const beginUpdateTx = await nftHolderClient.beginUpdate(
      beginUpdateAccounts,
      beginUpdateArgs
    );
    const beginUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      beginUpdateTx,
      [],
      { commitment: "confirmed" }
    );
    console.log("beginUpdateTxSig: %s", beginUpdateTxSig);

    const payForUpdateAccounts: AvatarRpc.PayForUpdateAccounts = {
      authority: nftHolderClient.provider.publicKey,
      avatar: avatar,
    };
    const payForUpdateArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(100000),
      updateTarget: updateTarget,
    };

    const txns = await nftHolderClient.payForUpdate(
      payForUpdateAccounts,
      payForUpdateArgs
    );
    assert.isTrue(txns.length === 1);

    const payForUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      txns[0],
      [],
      { commitment: "confirmed", skipPreflight: true }
    );
    console.log("payForUpdateTxSig: %s", payForUpdateTxSig);

    const updateClassVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
    };

    const updateClassVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTarget,
    };

    const updateClassVariantTx = await nftHolderClient.updateVariant(
      updateClassVariantAccounts,
      updateClassVariantArgs
    );
    const updateClassVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(updateClassVariantTx);
    console.log("updateClassVariantTxSig: %s", updateClassVariantTxSig);

    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.equal(avatarData.variants[0].variantId, "gender12");
    assert.equal(avatarData.variants[0].optionId, "gendero1");

    // check treasury received their tokens
    const treasuryBalanceResult = await connection.getTokenAccountBalance(
      splToken.getAssociatedTokenAddressSync(paymentMint, treasury)
    );
    assert.isTrue(
      new anchor.BN(treasuryBalanceResult.value.amount).eq(
        new anchor.BN(100000)
      )
    );
  });
  it("equip a trait that requires a fungible payment", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: [],
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // create payment mint

    const paymentMint = await createPaymentMint(nftHolderClient, [
      nftHolder.publicKey,
    ]);

    // create treasury, this is where the payments will be sent
    const treasury = anchor.web3.Keypair.generate().publicKey;
    await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      avatarClassAuthority,
      paymentMint,
      treasury
    );

    // create payment method pda

    const createPaymentMethodAccounts: AvatarRpc.CreatePaymentMethodAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
    };
    const createPaymentMethodArgs: AvatarRpc.CreatePaymentMethodArgs = {
      assetClass: new AvatarRpc.FungiblePaymentAssetClass(paymentMint),
      action: new AvatarRpc.TransferPaymentAction(treasury),
    };

    const [createPaymentMethodTx, paymentMethodAddr] =
      await avatarClassAuthorityClient.createPaymentMethod(
        createPaymentMethodAccounts,
        createPaymentMethodArgs
      );
    const createPaymentMethodTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createPaymentMethodTx
      );
    console.log("createPaymentMethodTxSig: %s", createPaymentMethodTxSig);

    // create trait using payment method

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    const traitAccount = await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      { paymentMethod: paymentMethodAddr, amount: new anchor.BN(100000) },
      null
    );

    // begin trait update

    const beginUpdateEquipTraitAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const beginUpdateEquipTraitArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: new AvatarRpc.UpdateTargetEquipTrait(traitAccount),
    };

    const beginUpdateEquipTraitTx = await nftHolderClient.beginUpdate(
      beginUpdateEquipTraitAccounts,
      beginUpdateEquipTraitArgs
    );
    const beginUpdateEquipTraitTxSig =
      await nftHolderClient.provider.sendAndConfirm(beginUpdateEquipTraitTx);
    console.log("beginUpdateEquipTraitTxSig: %s", beginUpdateEquipTraitTxSig);

    // pay for the update

    const payForEquipTraitAccounts: AvatarRpc.PayForUpdateAccounts = {
      avatar: avatar,
      authority: nftHolderClient.provider.publicKey,
    };
    const payForEquipTraitArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(100000),
      updateTarget: new AvatarRpc.UpdateTargetEquipTrait(traitAccount),
    };

    const payForEquipTraitTxns = await nftHolderClient.payForUpdate(
      payForEquipTraitAccounts,
      payForEquipTraitArgs
    );
    for (let tx of payForEquipTraitTxns) {
      const payForEquipTraitTxSig =
        await nftHolderClient.provider.sendAndConfirm(tx);
      console.log("payForEquipTraitTxSig: %s", payForEquipTraitTxSig);
    }

    // equip the trait
    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
      traitMint: traitMint,
    };
    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    // check trait was equipped
    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.isTrue(avatarData.traits.length === 1);
    assert.isTrue(avatarData.traits[0].traitAddress.equals(traitAccount));
  });
  it("equip a trait that requires an nft payment", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: [],
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // create nft payment method that gets burned
    const [paymentNftMint, paymentMethodAddr, merkleTree] =
      await createNonFungiblePaymentMethod(
        connection,
        nftHolder,
        avatarClassAuthorityClient,
        avatarClass,
        1
      );

    // create trait using payment method

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    const traitAccount = await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      { paymentMethod: paymentMethodAddr, amount: new anchor.BN(1) },
      null
    );

    // begin trait update

    const beginUpdateEquipTraitAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const beginUpdateEquipTraitArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: new AvatarRpc.UpdateTargetEquipTrait(traitAccount),
    };

    const beginUpdateEquipTraitTx = await nftHolderClient.beginUpdate(
      beginUpdateEquipTraitAccounts,
      beginUpdateEquipTraitArgs
    );
    const beginUpdateEquipTraitTxSig =
      await nftHolderClient.provider.sendAndConfirm(beginUpdateEquipTraitTx);
    console.log("beginUpdateEquipTraitTxSig: %s", beginUpdateEquipTraitTxSig);

    // pay for the update

    const proof = await merkleTree.getProof(0);

    const payForEquipTraitAccounts: AvatarRpc.PayForUpdateAccounts = {
      avatar: avatar,
      authority: nftHolderClient.provider.publicKey,
      paymentMint: paymentNftMint[0],
    };
    const payForEquipTraitArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(1),
      updateTarget: new AvatarRpc.UpdateTargetEquipTrait(traitAccount),
      verifyPaymentMintArgs: {
        root: proof.root,
        proof: proof.proof,
        leafIndex: proof.leafIndex,
      },
    };

    const payForEquipTraitTxns = await nftHolderClient.payForUpdate(
      payForEquipTraitAccounts,
      payForEquipTraitArgs
    );
    for (let tx of payForEquipTraitTxns) {
      const payForEquipTraitTxSig =
        await nftHolderClient.provider.sendAndConfirm(tx);
      console.log("payForEquipTraitTxSig: %s", payForEquipTraitTxSig);
    }

    // equip the trait
    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
      traitMint: traitMint,
    };
    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    // check trait was equipped
    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.isTrue(avatarData.traits.length === 1);
    assert.isTrue(avatarData.traits[0].traitAddress.equals(traitAccount));
  });
  it("equip and remove trait that requires a fungible payment", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: [],
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // create payment mint

    const paymentMint = await createPaymentMint(nftHolderClient, [
      nftHolder.publicKey,
    ]);

    // create treasury, this is where the payments will be sent
    const treasury = anchor.web3.Keypair.generate().publicKey;
    await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      avatarClassAuthority,
      paymentMint,
      treasury
    );

    // create payment method pda

    const createPaymentMethodAccounts: AvatarRpc.CreatePaymentMethodAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
    };
    const createPaymentMethodArgs: AvatarRpc.CreatePaymentMethodArgs = {
      assetClass: new AvatarRpc.FungiblePaymentAssetClass(paymentMint),
      action: new AvatarRpc.TransferPaymentAction(treasury),
    };

    const [createPaymentMethodTx, paymentMethodAddr] =
      await avatarClassAuthorityClient.createPaymentMethod(
        createPaymentMethodAccounts,
        createPaymentMethodArgs
      );
    const createPaymentMethodTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createPaymentMethodTx
      );
    console.log("createPaymentMethodTxSig: %s", createPaymentMethodTxSig);

    // create trait using payment method

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    const traitAccount = await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      { paymentMethod: paymentMethodAddr, amount: new anchor.BN(100000) },
      { paymentMethod: paymentMethodAddr, amount: new anchor.BN(100000) }
    );

    // begin trait update

    const beginUpdateEquipTraitAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const beginUpdateEquipTraitArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: new AvatarRpc.UpdateTargetEquipTrait(traitAccount),
    };

    const beginUpdateEquipTraitTx = await nftHolderClient.beginUpdate(
      beginUpdateEquipTraitAccounts,
      beginUpdateEquipTraitArgs
    );
    const beginUpdateEquipTraitTxSig =
      await nftHolderClient.provider.sendAndConfirm(beginUpdateEquipTraitTx);
    console.log("beginUpdateEquipTraitTxSig: %s", beginUpdateEquipTraitTxSig);

    // pay for the update

    const payForEquipTraitAccounts: AvatarRpc.PayForUpdateAccounts = {
      avatar: avatar,
      authority: nftHolderClient.provider.publicKey,
    };
    const payForEquipTraitArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(100000),
      updateTarget: new AvatarRpc.UpdateTargetEquipTrait(traitAccount),
    };

    const payForEquipTraitTxns = await nftHolderClient.payForUpdate(
      payForEquipTraitAccounts,
      payForEquipTraitArgs
    );
    for (let tx of payForEquipTraitTxns) {
      const payForEquipTraitTxSig =
        await nftHolderClient.provider.sendAndConfirm(tx);
      console.log("payForEquipTraitTxSig: %s", payForEquipTraitTxSig);
    }

    // equip the trait
    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
      traitMint: traitMint,
    };
    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    // check trait was equipped
    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.isTrue(avatarData.traits.length === 1);
    assert.isTrue(avatarData.traits[0].traitAddress.equals(traitAccount));

    // begin trait update

    const beginUpdateRemoveTraitAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const beginUpdateRemoveTraitArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: new AvatarRpc.UpdateTargetRemoveTrait(
        traitAccount,
        nftHolder.publicKey
      ),
    };

    const beginUpdateRemoveTraitTx = await nftHolderClient.beginUpdate(
      beginUpdateRemoveTraitAccounts,
      beginUpdateRemoveTraitArgs
    );
    const beginUpdateRemoveTraitTxSig =
      await nftHolderClient.provider.sendAndConfirm(beginUpdateRemoveTraitTx);
    console.log("beginUpdateRemoveTraitTxSig: %s", beginUpdateRemoveTraitTxSig);

    // pay for the update

    const payForRemoveTraitAccounts: AvatarRpc.PayForUpdateAccounts = {
      avatar: avatar,
      authority: nftHolderClient.provider.publicKey,
    };
    const payForRemoveTraitArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(100000),
      updateTarget: new AvatarRpc.UpdateTargetRemoveTrait(
        traitAccount,
        nftHolder.publicKey
      ),
    };

    const payForRemoveTraitTxns = await nftHolderClient.payForUpdate(
      payForRemoveTraitAccounts,
      payForRemoveTraitArgs
    );
    for (let tx of payForRemoveTraitTxns) {
      const payForRemoveTraitTxSig =
        await nftHolderClient.provider.sendAndConfirm(tx);
      console.log("payForRemoveTraitTxSig: %s", payForRemoveTraitTxSig);
    }

    // remove the trait
    const removeTraitAccounts: AvatarRpc.RemoveTraitAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
      traitMint: traitMint,
    };
    const removeTraitTx = await nftHolderClient.removeTrait(
      removeTraitAccounts
    );
    const removeTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      removeTraitTx
    );
    console.log("removeTraitTxSig: %s", removeTraitTxSig);

    const avatarDataAfterRemove = await nftHolderClient.getAvatar(avatar);
    assert.isTrue(avatarDataAfterRemove.traits.length === 0);
  });
  it("equip and remove trait that requires an nft payment", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: [],
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // create nft payment method that gets burned
    const [paymentNftMints, paymentMethodAddr, merkleTree] =
      await createNonFungiblePaymentMethod(
        connection,
        nftHolder,
        avatarClassAuthorityClient,
        avatarClass,
        2
      );

    // create trait using payment method

    const traitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    const traitAccount = await createTrait(
      "accessory1",
      traitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      { paymentMethod: paymentMethodAddr, amount: new anchor.BN(1) },
      { paymentMethod: paymentMethodAddr, amount: new anchor.BN(1) }
    );

    // begin trait update

    const beginUpdateEquipTraitAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const beginUpdateEquipTraitArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: new AvatarRpc.UpdateTargetEquipTrait(traitAccount),
    };

    const beginUpdateEquipTraitTx = await nftHolderClient.beginUpdate(
      beginUpdateEquipTraitAccounts,
      beginUpdateEquipTraitArgs
    );
    const beginUpdateEquipTraitTxSig =
      await nftHolderClient.provider.sendAndConfirm(beginUpdateEquipTraitTx);
    console.log("beginUpdateEquipTraitTxSig: %s", beginUpdateEquipTraitTxSig);

    // pay for the update

    const proof1 = await merkleTree.getProof(0);

    const payForEquipTraitAccounts: AvatarRpc.PayForUpdateAccounts = {
      avatar: avatar,
      authority: nftHolderClient.provider.publicKey,
      paymentMint: paymentNftMints[0],
    };
    const payForEquipTraitArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(1),
      updateTarget: new AvatarRpc.UpdateTargetEquipTrait(traitAccount),
      verifyPaymentMintArgs: {
        root: proof1.root,
        proof: proof1.proof,
        leafIndex: proof1.leafIndex,
      },
    };

    const payForEquipTraitTxns = await nftHolderClient.payForUpdate(
      payForEquipTraitAccounts,
      payForEquipTraitArgs
    );
    for (let tx of payForEquipTraitTxns) {
      const payForEquipTraitTxSig =
        await nftHolderClient.provider.sendAndConfirm(tx);
      console.log("payForEquipTraitTxSig: %s", payForEquipTraitTxSig);
    }

    // equip the trait
    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
      traitMint: traitMint,
    };
    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    // check trait was equipped
    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.isTrue(avatarData.traits.length === 1);
    assert.isTrue(avatarData.traits[0].traitAddress.equals(traitAccount));

    // begin trait update

    const beginUpdateRemoveTraitAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const beginUpdateRemoveTraitArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: new AvatarRpc.UpdateTargetRemoveTrait(
        traitAccount,
        nftHolder.publicKey
      ),
    };

    const beginUpdateRemoveTraitTx = await nftHolderClient.beginUpdate(
      beginUpdateRemoveTraitAccounts,
      beginUpdateRemoveTraitArgs
    );
    const beginUpdateRemoveTraitTxSig =
      await nftHolderClient.provider.sendAndConfirm(beginUpdateRemoveTraitTx);
    console.log("beginUpdateRemoveTraitTxSig: %s", beginUpdateRemoveTraitTxSig);

    // pay for the update

    const proof2 = await merkleTree.getProof(1);

    const payForRemoveTraitAccounts: AvatarRpc.PayForUpdateAccounts = {
      avatar: avatar,
      authority: nftHolderClient.provider.publicKey,
      paymentMint: paymentNftMints[1],
    };
    const payForRemoveTraitArgs: AvatarRpc.PayForUpdateArgs = {
      amount: new anchor.BN(1),
      updateTarget: new AvatarRpc.UpdateTargetRemoveTrait(
        traitAccount,
        nftHolder.publicKey
      ),
      verifyPaymentMintArgs: {
        proof: proof2.proof,
        root: proof2.root,
        leafIndex: proof2.leafIndex,
      },
    };

    const payForRemoveTraitTxns = await nftHolderClient.payForUpdate(
      payForRemoveTraitAccounts,
      payForRemoveTraitArgs
    );
    for (let tx of payForRemoveTraitTxns) {
      const payForRemoveTraitTxSig =
        await nftHolderClient.provider.sendAndConfirm(tx);
      console.log("payForRemoveTraitTxSig: %s", payForRemoveTraitTxSig);
    }

    // remove the trait
    const removeTraitAccounts: AvatarRpc.RemoveTraitAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
      traitMint: traitMint,
    };
    const removeTraitTx = await nftHolderClient.removeTrait(
      removeTraitAccounts
    );
    const removeTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      removeTraitTx
    );
    console.log("removeTraitTxSig: %s", removeTraitTxSig);

    const avatarDataAfterRemove = await nftHolderClient.getAvatar(avatar);
    assert.isTrue(avatarDataAfterRemove.traits.length === 0);
  });
  it("try to remove trait that is a requirement in a trait variant trait gate", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
      { id: 1, name: "head", status: { mutable: true } },
    ];
    const variantMetadata = [];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const hatTraitMint = await createTraitSft(connection, "head", nftHolder, [
      nftHolder.publicKey,
    ]);

    const hatTrait = await createTrait(
      "hat",
      hatTraitMint,
      [1],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient
    );

    const accessoryTraitMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      accessoryTraitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [
        {
          name: "testVariant",
          id: "ikolyhgt",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "ikolyhgt",
              optionId: "rfedtghy",
              paymentDetails: null,
              traitGate: null,
            },
            {
              variantId: "ikolyhgt",
              optionId: "rfedtg12",
              paymentDetails: null,
              traitGate: {
                operator: { and: {} },
                traits: [hatTrait],
              },
            },
          ],
        },
      ]
    );

    const traitMints: anchor.web3.PublicKey[] = [
      hatTraitMint,
      accessoryTraitMint,
    ];

    for (let traitMint of traitMints) {
      const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
        avatar: avatar,
        payer: nftHolder.publicKey,
        traitMint: traitMint,
      };

      const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
      const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
        equipTraitTx
      );
      console.log("equipTraitTxSig: %s", equipTraitTxSig);
    }

    // begin updating the variant
    const beginUpdateAccounts: AvatarRpc.BeginUpdateAccounts = {
      avatar: avatar,
    };

    const updateTarget = new AvatarRpc.UpdateTargetTraitVariant(
      "ikolyhgt",
      "rfedtg12",
      AvatarRpc.traitPDA(avatarClass, accessoryTraitMint)
    );
    const beginUpdateArgs: AvatarRpc.BeginUpdateArgs = {
      updateTarget: updateTarget,
    };

    const beginUpdateTx = await nftHolderClient.beginUpdate(
      beginUpdateAccounts,
      beginUpdateArgs
    );
    const beginUpdateTxSig = await nftHolderClient.provider.sendAndConfirm(
      beginUpdateTx
    );
    console.log("beginUpdateTxSig: %s", beginUpdateTxSig);

    // update to variant that requires the hat
    const updateTraitVariantAccounts: AvatarRpc.UpdateVariantAccounts = {
      avatar: avatar,
      payer: nftHolderClient.provider.publicKey,
    };

    const updateTraitVariantArgs: AvatarRpc.UpdateVariantArgs = {
      updateTarget: updateTarget,
    };

    const updateTraitVariantTx = await nftHolderClient.updateVariant(
      updateTraitVariantAccounts,
      updateTraitVariantArgs
    );
    const updateTraitVariantTxSig =
      await nftHolderClient.provider.sendAndConfirm(updateTraitVariantTx);
    console.log("updateTraitVariantTxSig: %s", updateTraitVariantTxSig);

    const removeTraitAccounts: AvatarRpc.RemoveTraitAccounts = {
      avatar: avatar,
      payer: nftHolder.publicKey,
      traitMint: hatTraitMint,
    };

    // try to remove hat trait
    // will error because trait is in use
    const removeTraitTx = await nftHolderClient.removeTrait(
      removeTraitAccounts
    );
    await assertRejects(nftHolderClient.provider.sendAndConfirm(removeTraitTx));
  });
  it("try to remove a trait from an attribute that is immutable", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "head", status: { mutable: false } },
    ];
    const variantMetadata = [];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const hatTraitMint = await createTraitSft(connection, "head", nftHolder, [
      nftHolder.publicKey,
      avatarClassAuthority.publicKey,
    ]);

    await createTrait(
      "hat",
      hatTraitMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient
    );

    // use authority to equip a trait to an immutable slot
    const equipTraitAccounts: AvatarRpc.EquipTraitsAuthorityAccounts = {
      avatar: avatar,
      authority: avatarClassAuthority.publicKey,
      traitMints: [hatTraitMint],
    };

    const equipTraitTx = await avatarClassAuthorityClient.equipTraitsAuthority(
      equipTraitAccounts
    );
    const equipTraitTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(equipTraitTx);
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    const removeTraitAccounts: AvatarRpc.RemoveTraitsAuthorityAccounts = {
      avatar: avatar,
      authority: avatarClassAuthority.publicKey,
      traitMints: [hatTraitMint],
    };

    // try to remove hat trait
    // will error because trait is in use
    const removeTraitTx = await nftHolderClient.removeTraitsAuthority(
      removeTraitAccounts
    );
    assertRejects(nftHolderClient.provider.sendAndConfirm(removeTraitTx));
  });
  it("equip and remove traits that take multiple attribute ids", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
      { id: 1, name: "aura", status: { mutable: true } },
      { id: 2, name: "background", status: { mutable: true } },
      { id: 3, name: "clothing", status: { mutable: true } },
      { id: 4, name: "eyes", status: { mutable: true } },
      { id: 5, name: "eyewear", status: { mutable: true } },
      { id: 6, name: "hair", status: { mutable: true } },
      { id: 7, name: "hands", status: { mutable: true } },
      { id: 8, name: "headgear", status: { mutable: true } },
      { id: 9, name: "legendary", status: { mutable: true } },
      { id: 10, name: "mouth", status: { mutable: true } },
      { id: 11, name: "origin", status: { mutable: true } },
    ];

    const variantMetadata = [];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // check avatar data is what we expect
    const newAvatarData = await avatarClassAuthorityClient.getAvatar(avatar);
    assert(newAvatarData.avatarClass.equals(avatarClass));
    assert(newAvatarData.mint.equals(nftMint));

    assert(newAvatarData.traits.length === 0);

    // create an trait to equip
    const [_traitAuthorityClient, _traitAuthorityHttpClient, traitAuthority] =
      await newPayer(connection);

    const traitArgs: any[] = [
      { name: "andro", attributes: [0, 1] },
      { name: "axe", attributes: [2, 3, 4] },
      { name: "cloak", attributes: [5] },
      { name: "gold", attributes: [6] },
      { name: "hollow", attributes: [7] },
      { name: "pipe", attributes: [8] },
    ];

    const traitMints: anchor.web3.PublicKey[] = [];
    for (let arg of traitArgs) {
      const traitMint = await createTraitSft(
        connection,
        arg.name,
        traitAuthority,
        [nftHolder.publicKey]
      );

      await createTrait(
        arg.name,
        traitMint,
        arg.attributes,
        { enabled: true },
        avatarClass,
        avatarClassAuthorityClient
      );

      traitMints.push(traitMint);
    }

    // equip all the traits to the avatar
    for (let i = 0; i < traitMints.length; i++) {
      const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
        avatar: avatar,
        payer: nftHolder.publicKey,
        traitMint: traitMints[i],
      };

      const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
      const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
        equipTraitTx
      );
      console.log("equipTraitTxSig: %s", equipTraitTxSig);

      const avatarData = await nftHolderClient.getAvatar(avatar);
      assert.equal(avatarData.traits.length, i + 1);
    }

    // unequip all traits
    for (let i = 0; i < traitMints.length; i++) {
      const removeTraitAccounts: AvatarRpc.RemoveTraitAccounts = {
        avatar: avatar,
        payer: nftHolder.publicKey,
        traitMint: traitMints[i],
      };

      const removeTraitTx = await nftHolderClient.removeTrait(
        removeTraitAccounts
      );
      const removeTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
        removeTraitTx
      );
      console.log("removeTraitTxSig: %s", removeTraitTxSig);

      const avatarData = await nftHolderClient.getAvatar(avatar);
      assert.equal(avatarData.traits.length, traitMints.length - 1 - i);
    }

    const avatarData = await nftHolderClient.getAvatar(avatar);
    assert.equal(avatarData.traits.length, 0);
  });
  it("update trait variant metadata", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
      { id: 1, name: "aura", status: { mutable: true } },
      { id: 2, name: "background", status: { mutable: true } },
      { id: 3, name: "clothing", status: { mutable: true } },
      { id: 4, name: "eyes", status: { mutable: true } },
      { id: 5, name: "eyewear", status: { mutable: true } },
      { id: 6, name: "hair", status: { mutable: true } },
      { id: 7, name: "hands", status: { mutable: true } },
      { id: 8, name: "headgear", status: { mutable: true } },
      { id: 9, name: "legendary", status: { mutable: true } },
      { id: 10, name: "mouth", status: { mutable: true } },
      { id: 11, name: "origin", status: { mutable: true } },
    ];

    const variantMetadata = [];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [_nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, _avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const hatTraitMint = await createTraitSft(connection, "head", nftHolder, [
      nftHolder.publicKey,
    ]);

    await createTrait(
      "hat",
      hatTraitMint,
      [1],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient
    );

    const updateTraitVariantMetadataAccounts: AvatarRpc.UpdateTraitVariantMetadataAccounts =
      {
        avatarClass: avatarClass,
        authority: avatarClassAuthority.publicKey,
        traitMint: hatTraitMint,
      };
    const updateTraitVariantMetadataArgs: AvatarRpc.UpdateTraitVariantMetadataArgs =
      {
        variantMetadata: {
          name: "bluesomething",
          id: "newVariantId",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "newVariantId",
              optionId: "option1",
              paymentDetails: null,
              traitGate: null,
            },
          ],
        },
      };

    const updateTraitVariantMetadataTx =
      await avatarClassAuthorityClient.updateTraitVariantMetadata(
        updateTraitVariantMetadataAccounts,
        updateTraitVariantMetadataArgs
      );
    const updateTraitVariantMetadataTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        updateTraitVariantMetadataTx
      );
    console.log(
      "updateTraitVariantMetadataTxSig: %s",
      updateTraitVariantMetadataTxSig
    );
  });
  it("update class variant metadata", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
      { id: 1, name: "aura", status: { mutable: true } },
      { id: 2, name: "background", status: { mutable: true } },
      { id: 3, name: "clothing", status: { mutable: true } },
      { id: 4, name: "eyes", status: { mutable: true } },
      { id: 5, name: "eyewear", status: { mutable: true } },
      { id: 6, name: "hair", status: { mutable: true } },
      { id: 7, name: "hands", status: { mutable: true } },
      { id: 8, name: "headgear", status: { mutable: true } },
      { id: 9, name: "legendary", status: { mutable: true } },
      { id: 10, name: "mouth", status: { mutable: true } },
      { id: 11, name: "origin", status: { mutable: true } },
    ];

    const variantMetadata = [];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: variantMetadata,
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [_nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, _avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    const hatTraitMint = await createTraitSft(connection, "head", nftHolder, [
      nftHolder.publicKey,
    ]);

    await createTrait(
      "hat",
      hatTraitMint,
      [1],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient
    );

    const updateClassVariantMetadataAccounts: AvatarRpc.UpdateClassVariantMetadataAccounts =
      {
        avatarClass: avatarClass,
        authority: avatarClassAuthority.publicKey,
      };
    const updateClassVariantMetadataArgs: AvatarRpc.UpdateClassVariantMetadataArgs =
      {
        variantMetadata: {
          name: "bluesomething",
          id: "newVariantId",
          status: {
            enabled: true,
          },
          options: [
            {
              variantId: "newVariantId",
              optionId: "option1",
              paymentDetails: null,
              traitGate: null,
            },
          ],
        },
      };

    const updateClassVariantMetadataTx =
      await avatarClassAuthorityClient.updateClassVariantMetadata(
        updateClassVariantMetadataAccounts,
        updateClassVariantMetadataArgs
      );
    const updateClassVariantMetadataTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        updateClassVariantMetadataTx
      );
    console.log(
      "updateClassVariantMetadataTxSig: %s",
      updateClassVariantMetadataTxSig
    );
  });
  it("add trait conflicts to a trait", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
      { id: 1, name: "body", status: { mutable: true } },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: [],
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // create trait A, define a conflict with trait B

    const traitAMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    const traitAAccount = await createTrait(
      "accessory1",
      traitAMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      null,
      null
    );

    // create trait B, define a conflict with trait A

    const traitBMint = await createTraitSft(connection, "body", nftHolder, [
      nftHolder.publicKey,
    ]);

    const traitBAccount = await createTrait(
      "body1",
      traitBMint,
      [1],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      null,
      null
    );

    const addTraitConflictsToAAccounts: AvatarRpc.AddTraitConflictsAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
      traitAccount: traitAAccount,
    };
    const addTraitConflictsToAArgs: AvatarRpc.AddTraitConflictsArgs = {
      traitIds: [1],
    };

    const addTraitConflictsToATx =
      await avatarClassAuthorityClient.addTraitConflicts(
        addTraitConflictsToAAccounts,
        addTraitConflictsToAArgs
      );
    const addTraitConflictsToATxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        addTraitConflictsToATx
      );
    console.log("addTraitConflictsToATxSig: %s", addTraitConflictsToATxSig);

    const addTraitConflictsToBAccounts: AvatarRpc.AddTraitConflictsAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
      traitAccount: traitBAccount,
    };
    const addTraitConflictsToBArgs: AvatarRpc.AddTraitConflictsArgs = {
      traitAccounts: [traitAAccount],
    };

    const addTraitConflictsToBTx =
      await avatarClassAuthorityClient.addTraitConflicts(
        addTraitConflictsToBAccounts,
        addTraitConflictsToBArgs
      );
    const addTraitConflictsToBTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        addTraitConflictsToBTx
      );
    console.log("addTraitConflictsToBTxSig: %s", addTraitConflictsToBTxSig);

    const traitAConflictsData =
      await avatarClassAuthorityClient.getTraitConflicts(
        AvatarRpc.traitConflictsPDA(avatarClass, traitAAccount)
      );
    assert.equal(traitAConflictsData.attributeConflicts.length, 0);
    assert.equal(traitAConflictsData.traitConflicts.length, 1);
    assert.equal(traitAConflictsData.traitConflicts[0], 1);

    const traitBConflictsData =
      await avatarClassAuthorityClient.getTraitConflicts(
        AvatarRpc.traitConflictsPDA(avatarClass, traitBAccount)
      );
    assert.equal(traitBConflictsData.attributeConflicts.length, 0);
    assert.equal(traitBConflictsData.traitConflicts.length, 1);
    assert.equal(traitBConflictsData.traitConflicts[0], 0);

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      traitMint: traitAMint,
      payer: nftHolderClient.provider.publicKey,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    const equipTraitWithConflictAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      traitMint: traitBMint,
      payer: nftHolderClient.provider.publicKey,
    };

    const equipTraitWithConflictTx = await nftHolderClient.equipTrait(
      equipTraitWithConflictAccounts
    );
    assertRejects(
      nftHolderClient.provider.sendAndConfirm(equipTraitWithConflictTx)
    );
  });
  it("add attribute conflicts to a trait", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
      { id: 1, name: "body", status: { mutable: true } },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: [],
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // create trait A, define a conflict with trait B

    const traitAMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    const traitAAccount = await createTrait(
      "accessory1",
      traitAMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      null,
      null
    );

    // create trait B, define a conflict with trait A

    const traitBMint = await createTraitSft(connection, "body", nftHolder, [
      nftHolder.publicKey,
    ]);

    await createTrait(
      "body1",
      traitBMint,
      [1],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      null,
      null
    );

    const addTraitConflictsToAAccounts: AvatarRpc.AddTraitConflictsAccounts = {
      avatarClass: avatarClass,
      authority: avatarClassAuthority.publicKey,
      traitAccount: traitAAccount,
    };
    const addTraitConflictsToAArgs: AvatarRpc.AddTraitConflictsArgs = {
      attributeIds: [1],
    };

    const addTraitConflictsToATx =
      await avatarClassAuthorityClient.addTraitConflicts(
        addTraitConflictsToAAccounts,
        addTraitConflictsToAArgs
      );
    const addTraitConflictsToATxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        addTraitConflictsToATx
      );
    console.log("addTraitConflictsToATxSig: %s", addTraitConflictsToATxSig);

    const traitAConflictsData =
      await avatarClassAuthorityClient.getTraitConflicts(
        AvatarRpc.traitConflictsPDA(avatarClass, traitAAccount)
      );
    assert.equal(traitAConflictsData.attributeConflicts.length, 1);
    assert.equal(traitAConflictsData.traitConflicts.length, 0);
    assert.equal(traitAConflictsData.attributeConflicts[0], 1);

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      traitMint: traitAMint,
      payer: nftHolderClient.provider.publicKey,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    const equipTraitTxSig = await nftHolderClient.provider.sendAndConfirm(
      equipTraitTx
    );
    console.log("equipTraitTxSig: %s", equipTraitTxSig);

    const equipTraitWithConflictAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      traitMint: traitBMint,
      payer: nftHolderClient.provider.publicKey,
    };

    const equipTraitWithConflictTx = await nftHolderClient.equipTrait(
      equipTraitWithConflictAccounts
    );
    assertRejects(
      nftHolderClient.provider.sendAndConfirm(equipTraitWithConflictTx)
    );
  });
  it("fail update if delegate is set on avatar nft", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: [],
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintNft(connection, nftHolder, avatarClassAuthority);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // add a delegate to the token account which holds the avatar nft
    const delegate = anchor.web3.Keypair.generate().publicKey;
    const approveTxSig = await splToken.approve(
      connection,
      nftHolder,
      splToken.getAssociatedTokenAddressSync(nftMint, nftHolder.publicKey),
      delegate,
      nftHolder.publicKey,
      1
    );
    console.log("approveTxSig: %s", approveTxSig);

    const traitAMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      traitAMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      null,
      null
    );

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      traitMint: traitAMint,
      payer: nftHolderClient.provider.publicKey,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    assertRejects(nftHolderClient.provider.sendAndConfirm(equipTraitTx));
  });
  it("fail update if delegate is set on avatar pNft", async () => {
    const [
      avatarClassAuthorityClient,
      _avatarClassAuthorityHttpClient,
      avatarClassAuthority,
    ] = await newPayer(connection, rainTokenMint, rainTokenMintAuthority);

    const avatarClassMint = await createSftAvatarClass(
      connection,
      avatarClassAuthority,
      [avatarClassAuthority.publicKey]
    );

    const attributeMetadata = [
      { id: 0, name: "accessories", status: { mutable: true } },
    ];

    const createAvatarClassArgs: AvatarRpc.CreateAvatarClassArgs = {
      attributeMetadata: attributeMetadata,
      variantMetadata: [],
      globalRenderingConfigUri:
        "http://localhost:3000/global-rendering-config.json",
    };

    const createAvatarClassAccounts: AvatarRpc.CreateAvatarClassAccounts = {
      avatarClassMint: avatarClassMint,
      authority: avatarClassAuthority.publicKey,
    };

    const [createAvatarClassTx, avatarClass] =
      await avatarClassAuthorityClient.createAvatarClass(
        createAvatarClassAccounts,
        createAvatarClassArgs
      );
    const createAvatarClassTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        createAvatarClassTx
      );
    console.log("createAvatarClassTxSig: %s", createAvatarClassTxSig);

    const [nftHolderClient, _nftHolderHttpClient, nftHolder] = await newPayer(
      connection
    );

    const nftMint = await mintPNft(connection, nftHolder);

    const createAvatarAccounts: AvatarRpc.CreateAvatarAccounts = {
      avatarClass: avatarClass,
      avatarMint: nftMint,
      authority: avatarClassAuthority.publicKey,
    };

    const createAvatarArgs: AvatarRpc.CreateAvatarArgs = {
      variants: [],
    };

    const [createAvatarTx, avatar] =
      await avatarClassAuthorityClient.createAvatar(
        createAvatarAccounts,
        createAvatarArgs
      );
    const createAvatarTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(createAvatarTx);
    console.log("createAvatarTxSig: %s", createAvatarTxSig);

    // add a delegate to the token account which holds the avatar nft
    const delegate = anchor.web3.Keypair.generate().publicKey;
    await approveTransferAuthorityPNft(
      connection,
      nftHolder,
      delegate,
      nftMint
    );

    const traitAMint = await createTraitSft(
      connection,
      "accessories",
      nftHolder,
      [nftHolder.publicKey]
    );

    await createTrait(
      "accessory1",
      traitAMint,
      [0],
      { enabled: true },
      avatarClass,
      avatarClassAuthorityClient,
      [],
      null,
      null
    );

    const equipTraitAccounts: AvatarRpc.EquipTraitAccounts = {
      avatar: avatar,
      traitMint: traitAMint,
      payer: nftHolderClient.provider.publicKey,
    };

    const equipTraitTx = await nftHolderClient.equipTrait(equipTraitAccounts);
    assertRejects(nftHolderClient.provider.sendAndConfirm(equipTraitTx));
  });
});

async function createSftAvatarClass(
  connection: anchor.web3.Connection,
  avatarClassAuthority: anchor.web3.Keypair,
  mintTos: anchor.web3.PublicKey[]
): Promise<anchor.web3.PublicKey> {
  const mint = anchor.web3.Keypair.generate();

  const createMintAccountIx = await anchor.web3.SystemProgram.createAccount({
    programId: splToken.TOKEN_PROGRAM_ID,
    space: splToken.MintLayout.span,
    fromPubkey: avatarClassAuthority.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(
      splToken.MintLayout.span
    ),
  });

  const mintIx = await splToken.createInitializeMintInstruction(
    mint.publicKey,
    0,
    avatarClassAuthority.publicKey,
    avatarClassAuthority.publicKey
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
    mintAuthority: avatarClassAuthority.publicKey,
    payer: avatarClassAuthority.publicKey,
    updateAuthority: avatarClassAuthority.publicKey,
  };
  const mdData: mpl.DataV2 = {
    name: "avatarClass",
    symbol: "avatarClass".toUpperCase().substring(0, 2),
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

  // create transaction
  const createSftTx = new anchor.web3.Transaction().add(
    createMintAccountIx,
    mintIx,
    metadataIx
  );

  for (let mintTo of mintTos) {
    // minttos
    const ata = splToken.getAssociatedTokenAddressSync(mint.publicKey, mintTo);
    const createAtaIx =
      await splToken.createAssociatedTokenAccountIdempotentInstruction(
        avatarClassAuthority.publicKey,
        ata,
        mintTo,
        mint.publicKey
      );
    const mintToIx = await splToken.createMintToInstruction(
      mint.publicKey,
      ata,
      avatarClassAuthority.publicKey,
      1
    );
    createSftTx.add(createAtaIx, mintToIx);
  }

  // create the sft
  const createSftTxSig = await connection.sendTransaction(createSftTx, [
    avatarClassAuthority,
    mint,
  ]);
  await connection.confirmTransaction(createSftTxSig, "confirmed");
  console.log("createAvatarClassAuthTokens: %s", createSftTxSig);

  return mint.publicKey;
}

async function mintNft(
  connection: anchor.web3.Connection,
  nftHolder: anchor.web3.Keypair,
  avatarClassAuthority: anchor.web3.Keypair
): Promise<anchor.web3.PublicKey> {
  const [nftMint, nftMetadata, _nftMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts(
      "Nft",
      connection,
      nftHolder,
      avatarClassAuthority
    );
  return nftMint;
}

async function mintPNft(
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair
): Promise<anchor.web3.PublicKey> {
  const client = new metaplex.Metaplex(connection, {}).use(
    metaplex.keypairIdentity(payer)
  );

  const result = await client.nfts().create({
    tokenStandard: mpl.TokenStandard.ProgrammableNonFungible as number,
    uri: "https://foo.com/bar.json",
    name: "pNFT1",
    sellerFeeBasisPoints: 500,
    symbol: "PN",
    ruleSet: new anchor.web3.PublicKey(
      "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"
    ),
    collection: null,
  });
  console.log("createPNftTxSig: %s", result.response.signature);

  return result.mintAddress;
}

async function approveTransferAuthorityPNft(
  connection: anchor.web3.Connection,
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

  const metadataData = await mpl.Metadata.fromAccountAddress(
    connection,
    metadata,
    "confirmed"
  );
  console.log("ruleSet: %s", metadataData.programmableConfig!.ruleSet!);

  const approveIx = mpl.createDelegateInstruction(
    {
      delegate: delegate,
      metadata: metadata,
      masterEdition: masterEdition,
      tokenRecord: tokenRecord,
      mint: mint,
      token: ata,
      authority: authority.publicKey,
      payer: authority.publicKey,
      authorizationRules: metadataData.programmableConfig!.ruleSet!,
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

  const approveTxSig = await connection.sendTransaction(
    new anchor.web3.Transaction().add(approveIx),
    [authority],
    {}
  );
  console.log("approveTxSig: %s", approveTxSig);

  return approveIx;
}

async function createTraitSft(
  connection: anchor.web3.Connection,
  name: string,
  traitAuthority: anchor.web3.Keypair,
  mintTos: anchor.web3.PublicKey[],
  collectionMint?: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> {
  const mint = anchor.web3.Keypair.generate();

  const createMintAccountIx = await anchor.web3.SystemProgram.createAccount({
    programId: splToken.TOKEN_PROGRAM_ID,
    space: splToken.MintLayout.span,
    fromPubkey: traitAuthority.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(
      splToken.MintLayout.span
    ),
  });

  const mintIx = await splToken.createInitializeMintInstruction(
    mint.publicKey,
    0,
    traitAuthority.publicKey,
    traitAuthority.publicKey
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
    mintAuthority: traitAuthority.publicKey,
    payer: traitAuthority.publicKey,
    updateAuthority: traitAuthority.publicKey,
  };
  const mdData: mpl.DataV2 = {
    name: name,
    symbol: name.toUpperCase().substring(0, 2),
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

  const createSftTx = new anchor.web3.Transaction().add(
    createMintAccountIx,
    mintIx,
    metadataIx
  );

  if (collectionMint) {
    const [collectionMetadata, _collectionMetadataBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          collectionMint.toBuffer(),
        ],
        mpl.PROGRAM_ID
      );

    const [collectionMasterEdition, _collectionMasterEditionBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          mpl.PROGRAM_ID.toBuffer(),
          collectionMint.toBuffer(),
          Buffer.from("edition"),
        ],
        mpl.PROGRAM_ID
      );

    const accounts: mpl.SetAndVerifyCollectionInstructionAccounts = {
      metadata: metadata,
      collectionAuthority: traitAuthority.publicKey,
      payer: traitAuthority.publicKey,
      updateAuthority: traitAuthority.publicKey,
      collection: collectionMetadata,
      collectionMint: collectionMint,
      collectionMasterEditionAccount: collectionMasterEdition,
    };

    const ix = mpl.createSetAndVerifyCollectionInstruction(accounts);
    createSftTx.add(ix);
  }

  // create the sft
  const createSftTxSig = await connection.sendTransaction(
    createSftTx,
    [traitAuthority, mint],
    { preflightCommitment: "confirmed" }
  );
  await connection.confirmTransaction(createSftTxSig, "confirmed");
  console.log("createSftTxSig: %s", createSftTxSig);

  // mint an trait to everyone in the list
  const mintToTx = new anchor.web3.Transaction();
  for (let mintTo of mintTos) {
    const mintToAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      traitAuthority,
      mint.publicKey,
      mintTo
    );

    const mintToIx = await splToken.createMintToInstruction(
      mint.publicKey,
      mintToAta.address,
      traitAuthority.publicKey,
      1
    );

    mintToTx.add(mintToIx);
  }

  const mintToTxSig = await connection.sendTransaction(mintToTx, [
    traitAuthority,
  ]);
  console.log("mintToTxSig: %s", mintToTxSig);

  return mint.publicKey;
}

async function createTrait(
  name: string,
  traitMint: anchor.web3.PublicKey,
  attributes: number[],
  traitStatus: AvatarRpc.TraitStatus,
  avatarClass: anchor.web3.PublicKey,
  avatarClassAuthorityClient: AvatarRpc.AvatarClient,
  variantMetadata: AvatarRpc.VariantMetadata[] = [],
  equipPaymentDetails: AvatarRpc.PaymentDetails | null = null,
  removePaymentDetails: AvatarRpc.PaymentDetails | null = null
): Promise<anchor.web3.PublicKey> {
  const createTraitArgs: AvatarRpc.CreateTraitArgs = {
    componentUri: `http://localhost:3000/${name}.json`,
    attributeIds: attributes, // define which attributes an trait uses here, all must be empty to equip
    variantMetadata: variantMetadata,
    traitStatus: traitStatus,
    equipPaymentDetails: equipPaymentDetails,
    removePaymentDetails: removePaymentDetails,
  };

  const createTraitAccounts: AvatarRpc.CreateTraitAccounts = {
    avatarClass: avatarClass,
    authority: avatarClassAuthorityClient.provider.wallet.publicKey,
    traitMint: traitMint,
  };

  const [createTraitTx, trait] = await avatarClassAuthorityClient.createTrait(
    createTraitAccounts,
    createTraitArgs
  );
  const createTraitTxSig =
    await avatarClassAuthorityClient.provider.sendAndConfirm(createTraitTx);
  console.log("createTraitTxSig: %s", createTraitTxSig);

  return trait;
}

async function createMintMetadataAndMasterEditionAccounts(
  name: string,
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair,
  updateAuthority: anchor.web3.Keypair
): Promise<
  [anchor.web3.PublicKey, anchor.web3.PublicKey, anchor.web3.PublicKey]
> {
  const mint = anchor.web3.Keypair.generate();

  const createMintAccountIx = await anchor.web3.SystemProgram.createAccount({
    programId: splToken.TOKEN_PROGRAM_ID,
    space: splToken.MintLayout.span,
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(
      splToken.MintLayout.span
    ),
  });

  const mintIx = await splToken.createInitializeMintInstruction(
    mint.publicKey,
    0,
    payer.publicKey,
    payer.publicKey
  );

  const payerAta = await splToken.getAssociatedTokenAddress(
    mint.publicKey,
    payer.publicKey
  );

  const payerAtaIx = await splToken.createAssociatedTokenAccountInstruction(
    payer.publicKey,
    payerAta,
    payer.publicKey,
    mint.publicKey
  );

  const mintToIx = await splToken.createMintToInstruction(
    mint.publicKey,
    payerAta,
    payer.publicKey,
    1
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
    updateAuthority: updateAuthority.publicKey,
  };
  const mdData: mpl.DataV2 = {
    name: name,
    symbol: name.toUpperCase().substring(0, 2),
    uri: "http://foo.com/bar.json",
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

  // master edition
  const [masterEdition, _masterEditionBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        mint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      mpl.PROGRAM_ID
    );

  const meAccounts: mpl.CreateMasterEditionV3InstructionAccounts = {
    metadata: metadata,
    edition: masterEdition,
    mint: mint.publicKey,
    updateAuthority: updateAuthority.publicKey,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
  };

  const meArgs: mpl.CreateMasterEditionArgs = {
    maxSupply: new anchor.BN(0),
  };

  const meIxArgs: mpl.CreateMasterEditionV3InstructionArgs = {
    createMasterEditionArgs: meArgs,
  };
  const masterEditionIx = mpl.createCreateMasterEditionV3Instruction(
    meAccounts,
    meIxArgs
  );

  const tx = new anchor.web3.Transaction().add(
    createMintAccountIx,
    mintIx,
    payerAtaIx,
    mintToIx,
    metadataIx,
    masterEditionIx
  );

  const createMdAndMeAccountsTxSig = await connection.sendTransaction(tx, [
    payer,
    mint,
    updateAuthority,
  ]);
  console.log("metaplexTxSig: %s", createMdAndMeAccountsTxSig);
  await connection.confirmTransaction(createMdAndMeAccountsTxSig, "confirmed");

  return [mint.publicKey, metadata, masterEdition];
}

async function newPayer(
  connection: anchor.web3.Connection,
  rainTokenMint?: anchor.web3.PublicKey,
  rainTokenMintAuthority?: anchor.web3.Keypair
): Promise<
  [AvatarRpc.AvatarClient, AvatarHttp.AvatarClient, anchor.web3.Keypair]
> {
  const payer = anchor.web3.Keypair.generate();

  const txSig = await connection.requestAirdrop(
    payer.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(txSig, "confirmed");

  if (rainTokenMint && rainTokenMintAuthority) {
    const payerRainTokenAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      rainTokenMint,
      payer.publicKey
    );
    await splToken.mintTo(
      connection,
      payer,
      rainTokenMint,
      payerRainTokenAta.address,
      rainTokenMintAuthority,
      100_000_000_000
    );
  }

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed" }
  );

  return [
    new AvatarRpc.AvatarClient(provider),
    new AvatarHttp.AvatarClient(provider, "localnet", "apikey1234"),
    payer,
  ];
}

async function createPaymentMint(
  payer: AvatarRpc.AvatarClient,
  mintTos: anchor.web3.PublicKey[] = []
): Promise<anchor.web3.PublicKey> {
  const mint = anchor.web3.Keypair.generate();

  const createMintAccountIx = await anchor.web3.SystemProgram.createAccount({
    programId: splToken.TOKEN_PROGRAM_ID,
    space: splToken.MintLayout.span,
    fromPubkey: payer.provider.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports: await payer.provider.connection.getMinimumBalanceForRentExemption(
      splToken.MintLayout.span
    ),
  });

  const mintIx = await splToken.createInitializeMintInstruction(
    mint.publicKey,
    5,
    payer.provider.publicKey,
    payer.provider.publicKey
  );

  const tx = new anchor.web3.Transaction().add(createMintAccountIx, mintIx);
  for (let mintTo of mintTos) {
    const ataAddress = splToken.getAssociatedTokenAddressSync(
      mint.publicKey,
      mintTo
    );

    const ataIx =
      await splToken.createAssociatedTokenAccountIdempotentInstruction(
        payer.provider.publicKey,
        ataAddress,
        mintTo,
        mint.publicKey
      );

    const mintToIx = await splToken.createMintToInstruction(
      mint.publicKey,
      ataAddress,
      payer.provider.publicKey,
      100000000
    );
    tx.add(ataIx, mintToIx);
  }

  const txSig = await payer.provider.sendAndConfirm(tx, [mint], {
    commitment: "confirmed",
  });
  console.log("createPaymentMintTxSig: %s", txSig);

  return mint.publicKey;
}

async function createNonFungiblePaymentMethod(
  connection: anchor.web3.Connection,
  nftHolder: anchor.web3.Keypair,
  avatarClassAuthorityClient: AvatarRpc.AvatarClient,
  avatarClass: anchor.web3.PublicKey,
  amount: number,
  treasury?: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey[], anchor.web3.PublicKey, cmp.MerkleTree]> {
  const mints = anchor.web3.Keypair.generate();

  const createPaymentMethodAccounts: AvatarRpc.CreatePaymentMethodAccounts = {
    avatarClass: avatarClass,
    authority: avatarClassAuthorityClient.provider.publicKey,
    mints: mints,
  };

  let action = new AvatarRpc.BurnPaymentAction();
  if (treasury) {
    action = new AvatarRpc.TransferPaymentAction(treasury);
  }

  const createPaymentMethodArgs: AvatarRpc.CreatePaymentMethodArgs = {
    assetClass: new AvatarRpc.NonFungiblePaymentAssetClass(mints.publicKey),
    action: action,
  };

  const [createPaymentMethodTx, paymentMethodAddr] =
    await avatarClassAuthorityClient.createPaymentMethod(
      createPaymentMethodAccounts,
      createPaymentMethodArgs
    );
  const createPaymentMethodTxSig =
    await avatarClassAuthorityClient.provider.sendAndConfirm(
      createPaymentMethodTx,
      [mints]
    );
  console.log("createPaymentMethodTxSig: %s", createPaymentMethodTxSig);

  const paymentMints: anchor.web3.PublicKey[] = [];
  for (let i = 0; i < amount; i++) {
    const [nftMint, _nftMetadata, _nftME] =
      await createMintMetadataAndMasterEditionAccounts(
        "nftPayment",
        connection,
        nftHolder,
        nftHolder
      );
    paymentMints.push(nftMint);

    const addPaymentMintToPaymentMethodAccounts: AvatarRpc.AddPaymentMintToPaymentMethodAccounts =
      {
        paymentMint: nftMint,
        paymentMethod: paymentMethodAddr,
        authority: avatarClassAuthorityClient.provider.publicKey,
      };

    const addPaymentMintToPaymentMethodTx =
      await avatarClassAuthorityClient.addPaymentMintToPaymentMethod(
        addPaymentMintToPaymentMethodAccounts
      );
    const addPaymentMintToPaymentMethodTxSig =
      await avatarClassAuthorityClient.provider.sendAndConfirm(
        addPaymentMintToPaymentMethodTx
      );
    console.log(
      "addPaymentMintToPaymentMethodTxSig: %s",
      addPaymentMintToPaymentMethodTxSig
    );
  }

  // create tree containing the payment mints
  const leaves: Buffer[] = [];
  for (let mint of paymentMints) {
    leaves.push(mint.toBuffer());
  }

  const tree = new cmp.MerkleTree(leaves);

  return [paymentMints, paymentMethodAddr, tree];
}

// serves json files from a directory, put all off chain things in dir
function fileServer(dir: string) {
  const app = express();
  app.use(express.json());

  fs.readdirSync(dir).forEach((file) => {
    app.get(`/${file}`, (_req, res) => {
      const jsonFile = fs.readFileSync(`${dir}/${file}`, "utf-8");
      let obj = JSON.parse(jsonFile);
      res.json(obj);
    });
  });

  const server = app.listen(3000);

  return server;
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
