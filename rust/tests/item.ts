import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as splToken from "../node_modules/@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  Instructions,
  Utils,
  ItemProgram,
  Idls,
} from "@raindrops-protocol/raindrops";

describe.only("item", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it("item activation flow", async () => {
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

    const [itemClassMint, itemClassMetadata, itemClassMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "itemClass",
        connection,
        payer
      );

    // create item class
    const itemClassIndex = 0;
    const itemClassData = {
      settings: {
        freeBuild: {
          inherited: { notInherited: true },
          boolean: true,
        },
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
            usagePermissiveness: [{ updateAuthority: true }],
            inherited: { notInherited: true },
            validation: null,
            callback: null,
            itemClassType: {
              consumable: {
                maxUses: 1,
                maxPlayersPerUse: null,
                itemUsageType: { destruction: true },
                cooldownDuration: 0,
                warmupDuration: null,
              },
            },
          },
        ],
        components: null,
      },
    };

    const args: Instructions.Item.CreateItemClassArgs = {
      classIndex: new BN(itemClassIndex),
      parentClassIndex: null,
      space: new BN(300),
      desiredNamespaceArraySize: new anchor.BN(1),
      updatePermissivenessToUse: { tokenHolder: true },
      storeMint: false,
      storeMetadataFields: false,
      itemClassData,
      parentOfParentClassIndex: null,
    };

    const accounts: Instructions.Item.CreateItemClassAccounts = {
      itemMint: itemClassMint,
      parent: null,
      parentMint: null,
      parentOfParentClass: null,
      parentOfParentClassMint: null,
      metadataUpdateAuthority: payer.publicKey,
      parentUpdateAuthority: null,
    };

    const additionalArgs: Instructions.Item.CreateItemClassAdditionalArgs = {};

    const createItemClassResult = await itemProgram.createItemClass(
      args,
      accounts,
      additionalArgs,
      {
        commitment: "confirmed",
      }
    );
    console.log("createItemClass: %s", createItemClassResult.txid);

    const [itemMint, itemMetadata, itemMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "item",
        connection,
        payer
      );

    // create item escrow
    const craftItemEscrowIndex = 0;
    let componentScope = "none";

    // create the item escrow
    const createItemEscrowArgs: Instructions.Item.CreateItemEscrowArgs = {
      classIndex: new BN(itemClassIndex),
      craftEscrowIndex: new BN(craftItemEscrowIndex),
      componentScope,
      buildPermissivenessToUse: { tokenHolder: true },
      namespaceIndex: null,
      itemClassMint: itemClassMint,
      amountToMake: new BN(1),
      parentClassIndex: null,
    };

    const createItemEscrowAccounts: Instructions.Item.CreateItemEscrowAccounts =
      {
        newItemMint: itemMint,
        newItemToken: null, // item ATA
        newItemTokenHolder: payer.publicKey,
        parentMint: null,
        itemClassMint: itemClassMint,
        metadataUpdateAuthority: payer.publicKey,
      };

    const createItemEscrowAdditionalArgs: Instructions.Item.CreateItemEscrowAdditionalArgs =
      {};

    const createItemEscrowResult = await itemProgram.createItemEscrow(
      createItemEscrowArgs,
      createItemEscrowAccounts,
      createItemEscrowAdditionalArgs,
      { commitment: "confirmed" }
    );
    console.log("createItemEscrowTxSig: %s", createItemEscrowResult.txid);

    const [itemEscrowPDA] = await Utils.PDA.getItemEscrow({
      itemClassMint: itemClassMint,
      payer: payer.publicKey,
      newItemMint: itemMint,
      newItemToken: (
        await Utils.PDA.getAtaForMint(itemMint, payer.publicKey)
      )[0],
      amountToMake: new BN(1),
      componentScope,
      craftEscrowIndex: new BN(craftItemEscrowIndex),
      classIndex: new BN(itemClassIndex),
    });

    // start the item build phase
    const startItemEscrowBuildPhaseArgs: Instructions.Item.StartItemEscrowBuildPhaseArgs =
      {
        classIndex: new BN(itemClassIndex),
        parentClassIndex: null,
        craftEscrowIndex: new BN(craftItemEscrowIndex),
        componentScope: "none",
        amountToMake: new BN(1),
        itemClassMint: itemClassMint,
        originator: payer.publicKey,
        newItemMint: itemMint,
        buildPermissivenessToUse: { tokenHolder: true },
        endNodeProof: null,
        totalSteps: null,
      };

    const startItemEscrowBuildPhaseAccounts: Instructions.Item.StartItemEscrowBuildPhaseAccounts =
      {
        itemClassMint: itemClassMint,
        newItemToken: (
          await Utils.PDA.getAtaForMint(itemMint, payer.publicKey)
        )[0],
        newItemTokenHolder: payer.publicKey,
        parentMint: null,
        metadataUpdateAuthority: payer.publicKey,
      };

    const startItemEscrowBuildPhaseAdditionalArgs: Instructions.Item.StartItemEscrowBuildPhaseAdditionalArgs =
      {};

    const startItemEscrowResult = await itemProgram.startItemEscrowBuildPhase(
      startItemEscrowBuildPhaseArgs,
      startItemEscrowBuildPhaseAccounts,
      startItemEscrowBuildPhaseAdditionalArgs,
      { commitment: "confirmed" }
    );
    console.log("startItemEscrowTxSig: %s", startItemEscrowResult.txid);

    // complete item build phase
    const itemIndex = 0;
    // complete the item escrow build phase
    const completeItemEscrowBuildPhaseArgs: Instructions.Item.CompleteItemEscrowBuildPhaseArgs =
      {
        classIndex: new BN(itemClassIndex),
        newItemIndex: new BN(itemIndex),
        parentClassIndex: null,
        craftEscrowIndex: new BN(craftItemEscrowIndex),
        componentScope: "none",
        amountToMake: new BN(1),
        space: new BN(300),
        itemClassMint: itemClassMint,
        originator: payer.publicKey,
        buildPermissivenessToUse: { tokenHolder: true },
        storeMint: false,
        storeMetadataFields: false,
      };

    const itemNFTTokenAccountAddress = splToken.getAssociatedTokenAddressSync(
      itemMint,
      payer.publicKey
    );

    const completeItemEscrowBuildPhaseAccounts: Instructions.Item.CompleteItemEscrowBuildPhaseAccounts =
      {
        itemClassMint: itemClassMint,
        newItemMint: itemMint,
        newItemToken: itemNFTTokenAccountAddress,
        newItemTokenHolder: payer.publicKey,
        parentMint: null,
        metadataUpdateAuthority: payer.publicKey,
      };

    const completeItemEscrowBuildPhaseAdditionalArgs: Instructions.Item.CompleteItemEscrowBuildPhaseAdditionalArgs =
      {};

    const completeItemEscrowResult =
      await itemProgram.completeItemEscrowBuildPhase(
        completeItemEscrowBuildPhaseArgs,
        completeItemEscrowBuildPhaseAccounts,
        completeItemEscrowBuildPhaseAdditionalArgs,
        { commitment: "confirmed" }
      );
    console.log("completeItemEscrowTxSig: %s", completeItemEscrowResult.txid);

    const wrappedItemClass = await itemProgram.fetchItemClass(
      itemClassMint,
      new BN(itemClassIndex)
    );

    // begin item activation
    const itemActivationArgs: Instructions.Item.BeginItemActivationArgs = {
      itemClassMint: itemClassMint,
      itemMint: itemMint,
      // itemMarkerSpace: 254,
      itemMarkerSpace: 106,
      usagePermissivenessToUse: { updateAuthority: true },
      usageIndex: 0,
      usageInfo: null,
      target: null,
      classIndex: new BN(itemClassIndex),
      index: new BN(itemIndex),
      amount: new BN(1),
      itemClass: wrappedItemClass,
    };

    const itemTokenAccount = splToken.getAssociatedTokenAddressSync(
      itemMint,
      payer.publicKey
    );

    const itemActivationAccounts: Instructions.Item.BeginItemActivationAccounts =
      {
        itemAccount: itemTokenAccount,
        metadataUpdateAuthority: payer.publicKey,
      };
    const itemActivationAdditionalArgs: Instructions.Item.BeginItemActivationAdditionalArgs =
      {};

    // activate item usage
    const beginItemActivationResult = await itemProgram.beginItemActivation(
      itemActivationArgs,
      itemActivationAccounts,
      itemActivationAdditionalArgs,
      { commitment: "confirmed" }
    );
    console.log("beginItemActivationTxSig: %s", beginItemActivationResult.txid);

    // end item activation

    const endItemActivationArgs: Instructions.Item.EndItemActivationArgs = {
      classIndex: new BN(0),
      index: new BN(0),
      itemClassMint: itemClassMint,
      usagePermissivenessToUse: { updateAuthority: true },
      amount: new BN(1),
      usageIndex: 0,
      usageInfo: null,
    };

    const endItemActivationAccounts: Instructions.Item.EndItemActivationAccounts =
      {
        originator: payer.publicKey,
        itemMint: itemMint,
        itemAccount: itemTokenAccount,
        itemTransferAuthority: payer,
        metadataUpdateAuthority: payer.publicKey,
      };

    const endItemActivationAdditionalArgs: Instructions.Item.EndItemActivationAdditionalArgs =
      {};

    // complete item usage
    const endItemActivationResult = await itemProgram.endItemActivation(
      endItemActivationArgs,
      endItemActivationAccounts,
      endItemActivationAdditionalArgs,
    );
    console.log("endItemActivationTxSig: %s", endItemActivationResult.txid);
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

async function createMintMetadataAndMasterEditionAccounts(
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
