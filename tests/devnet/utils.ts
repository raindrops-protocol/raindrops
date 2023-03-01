import * as anchor from "@project-serum/anchor";
import {
  PlayerProgram,
  Idls,
  Instructions,
  Utils,
  Constants,
  ItemProgram,
} from "@raindrops-protocol/raindrops";
import * as splToken from "@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";

export async function createPlayerClass(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
): Promise<[anchor.web3.PublicKey, anchor.web3.PublicKey]> {
  const playerProgram = await PlayerProgram.getProgramWithConfig(
    PlayerProgram,
    {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.PlayerIDL,
    }
  );

  const [playerMint, _playerMetadata, _playerMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts(
      "player",
      connection,
      payer
    );

  const createPlayerClassArgs: Instructions.Player.CreatePlayerClassArgs = {
    classIndex: new anchor.BN(0),
    parentOfParentClassIndex: null,
    parentClassIndex: null,
    space: new anchor.BN(300),
    desiredNamespaceArraySize: 2,
    updatePermissivenessToUse: null,
    storeMint: false,
    storeMetadataFields: false,
    playerClassData: {
      settings: {
        defaultCategory: null,
        childrenMustBeEditions: null,
        builderMustBeHolder: null,
        updatePermissiveness: null,
        instanceUpdatePermissiveness: null,
        buildPermissiveness: null,
        equipItemPermissiveness: null,
        useItemPermissiveness: null,
        unequipItemPermissiveness: null,
        removeItemPermissiveness: null,
        stakingWarmUpDuration: null,
        stakingCooldownDuration: null,
        stakingPermissiveness: null,
        unstakingPermissiveness: null,
        childUpdatePropagationPermissiveness: null,
      },
      config: {
        startingStatsUri: null,
        basicStats: null,
        //bodyParts: [],
        bodyParts: [
          {
            index: 0,
            bodyPart: "arm",
            totalItemSpots: 1,
            inherited: { notInherited: true },
          },
        ],
        equipValidation: null,
        addToPackValidation: null,
      },
    },
  };

  const createPlayerClassAccounts: Instructions.Player.CreatePlayerClassAccounts =
    {
      playerMint: playerMint,
      parent: null,
      parentMint: null,
      parentOfParentClassMint: null,
      metadataUpdateAuthority: null,
      parentUpdateAuthority: null,
    };

  const createPlayerClassResult = await (
    await playerProgram.createPlayerClass(
      createPlayerClassArgs,
      createPlayerClassAccounts
    )
  ).rpc();
  console.log("createPlayerClassTxSig: %s", createPlayerClassResult.txid);

  const [player, _playerBump] = await Utils.PDA.getPlayerPDA(
    playerMint,
    new anchor.BN(0)
  );

  return [player, playerMint];
}

export async function createPlayer(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  playerClassMint: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, anchor.web3.PublicKey]> {
  const playerProgram = await PlayerProgram.getProgramWithConfig(
    PlayerProgram,
    {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.PlayerIDL,
    }
  );

  const [playerMint, _playerMetadata, _playerMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts(
      "player",
      connection,
      payer
    );

  const playerAta = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    playerMint,
    payer.publicKey
  );

  const buildPlayerArgs: Instructions.Player.BuildPlayerArgs = {
    classIndex: new anchor.BN(0),
    parentClassIndex: null,
    newPlayerIndex: new anchor.BN(0),
    space: new anchor.BN(300),
    playerClassMint: playerClassMint,
    buildPermissivenessToUse: { tokenHolder: true },
    storeMint: false,
    storeMetadataFields: false,
  };

  const buildPlayerAccounts: Instructions.Player.BuildPlayerAccounts = {
    newPlayerMint: playerMint,
    newPlayerToken: playerAta.address,
    newPlayerTokenHolder: payer.publicKey,
    parentMint: playerClassMint,
    metadataUpdateAuthority: payer.publicKey,
  };

  const buildPlayerAdditionalArgs: Instructions.Player.BuildPlayerAdditionalArgs =
    {
      rainAmount: new anchor.BN(0),
    };

  const createPlayerResult = await (
    await playerProgram.buildPlayer(
      buildPlayerArgs,
      buildPlayerAccounts,
      buildPlayerAdditionalArgs
    )
  ).rpc();
  console.log("createPlayerTxSig: %s", createPlayerResult.txid);

  const [player, _playerBump] = await Utils.PDA.getPlayerPDA(
    playerMint,
    new anchor.BN(0)
  );

  return [player, playerMint];
}

export async function createMintMetadataAndMasterEditionAccounts(
  name: string,
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair
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
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        mpl.PROGRAM_ID.toBuffer(),
        mint.publicKey.toBuffer(),
      ],
      mpl.PROGRAM_ID
    );

  const mdAccounts: mpl.CreateMetadataAccountV2InstructionAccounts = {
    metadata: metadata,
    mint: mint.publicKey,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    updateAuthority: payer.publicKey,
  };
  const mdData: mpl.DataV2 = {
    name: name,
    symbol: name.toUpperCase(),
    uri: "http://foo.com/bar.json",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  };
  const mdArgs: mpl.CreateMetadataAccountArgsV2 = {
    data: mdData,
    isMutable: true,
  };
  const ixArgs: mpl.CreateMetadataAccountV2InstructionArgs = {
    createMetadataAccountArgsV2: mdArgs,
  };
  const metadataIx = mpl.createCreateMetadataAccountV2Instruction(
    mdAccounts,
    ixArgs
  );

  // master edition
  const [masterEdition, _masterEditionBump] =
    await anchor.web3.PublicKey.findProgramAddress(
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
    updateAuthority: payer.publicKey,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
  };

  const meArgs: mpl.CreateMasterEditionArgs = {
    maxSupply: new anchor.BN(1),
  };

  const meIxArgs: mpl.CreateMasterEditionV3InstructionArgs = {
    createMasterEditionArgs: meArgs,
  };
  const masterEditionIx = mpl.createCreateMasterEditionV3Instruction(
    meAccounts,
    meIxArgs
  );

  const createMdAndMeAccountsTxSig = await connection.sendTransaction(
    new anchor.web3.Transaction()
      .add(createMintAccountIx)
      .add(mintIx)
      .add(payerAtaIx)
      .add(mintToIx)
      .add(metadataIx)
      .add(masterEditionIx),
    [payer, mint]
  );
  await connection.confirmTransaction(createMdAndMeAccountsTxSig, "confirmed");

  return [mint.publicKey, metadata, masterEdition];
}

export async function createItemEscrowAndCompleteBuild(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection
): Promise<
  [anchor.web3.PublicKey, anchor.web3.PublicKey, anchor.web3.PublicKey]
> {
  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  // create item mints and metaplex accounts
  const [itemClassMint, _itemClassMetadata, _itemClassMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts("item", connection, payer);

  // create item mints and metaplex accounts
  const [craftItemMint, _craftItemMetadata, _craftItemMasterEdition] =
    await createMintMetadataAndMasterEditionAccounts(
      "craftItem",
      connection,
      payer
    );

  const itemClassArgs: Instructions.Item.CreateItemClassArgs = {
    classIndex: new anchor.BN(0),
    parentOfParentClassIndex: null,
    parentClassIndex: null,
    space: new anchor.BN(300),
    desiredNamespaceArraySize: 2,
    updatePermissivenessToUse: null,
    storeMint: false,
    storeMetadataFields: false,
    itemClassData: {
      settings: {
        freeBuild: null,
        childrenMustBeEditions: null,
        builderMustBeHolder: null,
        updatePermissiveness: [
          {
            permissivenessType: { tokenHolder: true },
            inherited: { notInherited: true },
          },
        ],
        buildPermissiveness: [
          {
            permissivenessType: { tokenHolder: true },
            inherited: { notInherited: true },
          },
        ],
        stakingWarmUpDuration: null,
        stakingCooldownDuration: null,
        stakingPermissiveness: null,
        unstakingPermissiveness: null,
        childUpdatePropagationPermissiveness: [
          {
            childUpdatePropagationPermissivenessType: { usages: true },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: { components: true },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              updatePermissiveness: true,
            },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              buildPermissiveness: true,
            },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              stakingPermissiveness: true,
            },
            inherited: { notInherited: true },
          },
          {
            childUpdatePropagationPermissivenessType: {
              freeBuildPermissiveness: true,
            },
            inherited: { notInherited: true },
          },
        ],
      },
      config: {
        usageRoot: null,
        usageStateRoot: null,
        componentRoot: null,
        usages: [
          {
            index: 0,
            basicItemEffects: null,
            usagePermissiveness: [{ tokenHolder: true }],
            inherited: { notInherited: true },
            itemClassType: {
              wearable: {
                bodyPart: ["arm"],
                limitPerPart: 1,
              },
              //consumable: {
              //  maxUses: new anchor.BN(10),
              //  maxPlayersPerUse: new anchor.BN(1),
              //  cooldownDuration: null,
              //  warmupDuration: null,
              //  itemUsageType: { infinite: true },
              //},
            },
            callback: null,
            validation: null,
            doNotPairWithSelf: false,
            dnp: null,
          },
        ],
        components: [
          {
            mint: craftItemMint,
            amount: new anchor.BN(1),
            classIndex: new anchor.BN(0),
            timeToBuild: null,
            componentScope: "none",
            useUsageIndex: 0,
            condition: { presence: true },
            inherited: { notInherited: true },
          },
        ],
      },
    },
  };

  const createItemClassAccounts: Instructions.Item.CreateItemClassAccounts = {
    itemMint: itemClassMint,
    parent: null,
    parentMint: null,
    parentOfParentClassMint: null,
    metadataUpdateAuthority: payer.publicKey,
    parentUpdateAuthority: null,
    parentOfParentClass: null,
  };

  const createItemClassAdditionalArgs: Instructions.Item.CreateItemClassAdditionalArgs =
    {};

  const createItemClassResult = await itemProgram.createItemClass(
    itemClassArgs,
    createItemClassAccounts,
    createItemClassAdditionalArgs
  );
  console.log("createItemClassTxSig: %s", createItemClassResult.txid);

  const createItemEscrowArgs: Instructions.Item.CreateItemEscrowArgs = {
    classIndex: new anchor.BN(0),
    craftEscrowIndex: new anchor.BN(0),
    parentClassIndex: null,
    componentScope: "test",
    amountToMake: new anchor.BN(1),
    namespaceIndex: new anchor.BN(0),
    buildPermissivenessToUse: { tokenHolder: true },
    itemClassMint: itemClassMint,
  };

  const createItemEscrowAdditionalArgs: Instructions.Item.CreateItemEscrowAdditionalArgs =
    {};

  const createItemEscrowAccounts: Instructions.Item.CreateItemEscrowAccounts = {
    newItemMint: craftItemMint,
    newItemToken: null,
    newItemTokenHolder: payer.publicKey,
    parentMint: null,
    itemClassMint: itemClassMint,
    metadataUpdateAuthority: payer.publicKey,
  };

  const result = await itemProgram.createItemEscrow(
    createItemEscrowArgs,
    createItemEscrowAccounts,
    createItemEscrowAdditionalArgs
  );
  console.log("createItemEscrowTxSig: %s", result.txid);

  const startItemEscrowBuildPhaseArgs: Instructions.Item.StartItemEscrowBuildPhaseArgs =
    {
      classIndex: new anchor.BN(0),
      parentClassIndex: null,
      craftEscrowIndex: new anchor.BN(0),
      componentScope: "test",
      amountToMake: new anchor.BN(1),
      itemClassMint: itemClassMint,
      originator: payer.publicKey,
      newItemMint: craftItemMint,
      buildPermissivenessToUse: { tokenHolder: true },
      endNodeProof: null,
      totalSteps: null,
    };
  const startItemEscrowBuildPhaseAccounts: Instructions.Item.StartItemEscrowBuildPhaseAccounts =
    {
      itemClassMint: itemClassMint,
      newItemToken: null,
      newItemTokenHolder: payer.publicKey,
      parentMint: null,
      metadataUpdateAuthority: payer.publicKey,
    };
  const startItemEscrowBuildPhaseAdditionalArgs: Instructions.Item.StartItemEscrowBuildPhaseAdditionalArgs =
    {};

  const startItemEscrowBuildPhaseResult =
    await itemProgram.startItemEscrowBuildPhase(
      startItemEscrowBuildPhaseArgs,
      startItemEscrowBuildPhaseAccounts,
      startItemEscrowBuildPhaseAdditionalArgs
    );

  console.log(
    "startItemEscrowBuildPhaseResult: %s",
    startItemEscrowBuildPhaseResult.txid
  );
  const completeItemEscrowBuildPhaseArgs: Instructions.Item.CompleteItemEscrowBuildPhaseArgs =
    {
      newItemIndex: new anchor.BN(0),
      space: new anchor.BN(300),
      storeMint: false,
      storeMetadataFields: false,
      classIndex: new anchor.BN(0),
      parentClassIndex: null,
      craftEscrowIndex: new anchor.BN(0),
      componentScope: "test",
      amountToMake: new anchor.BN(1),
      itemClassMint: itemClassMint,
      originator: payer.publicKey,
      buildPermissivenessToUse: { tokenHolder: true },
    };

  const completeItemEscrowBuildPhaseAccounts: Instructions.Item.CompleteItemEscrowBuildPhaseAccounts =
    {
      itemClassMint: itemClassMint,
      newItemMint: craftItemMint,
      newItemToken: null,
      newItemTokenHolder: null,
      parentMint: null,
      metadataUpdateAuthority: payer.publicKey,
    };

  const completeItemEscrowBuildPhaseAdditionalArgs: Instructions.Item.StartItemEscrowBuildPhaseAdditionalArgs =
    {};

  const completeItemEscrowBuildPhaseResult =
    await itemProgram.completeItemEscrowBuildPhase(
      completeItemEscrowBuildPhaseArgs,
      completeItemEscrowBuildPhaseAccounts,
      completeItemEscrowBuildPhaseAdditionalArgs
    );
  console.log(
    "completeItemEscrowBuildPhaseResult: %s",
    completeItemEscrowBuildPhaseResult.txid
  );

  const [item, _itemBump] = await Utils.PDA.getItemPDA(
    craftItemMint,
    new anchor.BN(0)
  );

  return [item, craftItemMint, itemClassMint];
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
