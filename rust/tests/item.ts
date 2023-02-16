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
import { assert } from "chai";
import {
  AddCraftItemToEscrowAccounts,
  AddCraftItemToEscrowArgs,
} from "@raindrops-protocol/raindrops/build/instructions/item";

describe.only("item", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it("item activation, max uses limit reached", async () => {
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

    // create item class with max uses 1
    const [itemClassMint, _itemClassMetadata, _itemClassMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "itemClass",
        connection,
        payer
      );

    const itemClassIndex = 0;

    await createItemClass(
      itemProgram,
      itemClassMint,
      payer.publicKey,
      itemClassIndex,
      1
    );

    const [itemMint, itemMetadata, itemMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "item",
        connection,
        payer
      );

    // build the item via escrow flow
    await buildItem(
      itemProgram,
      itemMint,
      itemClassMint,
      payer.publicKey,
      itemClassIndex
    );

    // active the item
    await activateItem(
      itemProgram,
      itemClassMint,
      itemMint,
      payer,
      itemClassIndex
    );

    // expect a balance of 0 because of the burn
    assertTokenBalance(connection, itemMint, payer.publicKey, new BN(0));
  });

  it("item activation, uses leftover", async () => {
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

    // create item class with max uses 1
    const [itemClassMint, _itemClassMetadata, _itemClassMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "itemClass",
        connection,
        payer
      );

    const itemClassIndex = 0;

    await createCraftItemClass(
      itemProgram,
      itemClassMint,
      payer.publicKey,
      itemClassIndex,
      2,
    );

    const [itemMint, itemMetadata, itemMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "item",
        connection,
        payer
      );

    // build the item via escrow flow
    await buildItem(
      itemProgram,
      itemMint,
      itemClassMint,
      payer.publicKey,
      itemClassIndex
    );

    // active the item
    await activateItem(
      itemProgram,
      itemClassMint,
      itemMint,
      payer,
      itemClassIndex
    );

    // expect a balance of 1, no burn because max uses not reached
    assertTokenBalance(connection, itemMint, payer.publicKey, new BN(1));
  });

  it.only("add craft item to token escrow", async () => {
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

    // fully build a craft item
    const [craftItemClassMint, craftItemMint] = await buildCraftItem(itemProgram, payer);
 
    // create item class mint
    const [itemClassMint, _itemClassMetadata, _itemClassMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "itemClass",
        connection,
        payer
      );

    // create item class, will require the craft item to build
    const itemClassIndex = 0;
    await createItemClass(
      itemProgram,
      itemClassMint,
      payer.publicKey,
      itemClassIndex,
      5,
      craftItemClassMint
    );

    const [itemMint, _itemMetadata, _itemMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "item",
        itemProgram.client.provider.connection,
        payer,
      );

    await createItemEscrow(
      itemProgram,
      itemClassMint,
      craftItemMint,
      payer.publicKey,
    );

    await addItemToEscrow(
      itemProgram,
      itemClassMint,
      itemMint,
      craftItemMint,
      craftItemClassMint,
      payer.publicKey,
    );

    //await startItemBuild(
    //  itemProgram,
    //  itemClassMint,
    //  itemMint,
    //  payer.publicKey,
    //  new BN(itemClassIndex),
    //  new BN(craftItemIndex)
    //);
  });
});

async function buildCraftItem(itemProgram: ItemProgram, authority: anchor.web3.Keypair): Promise<[anchor.web3.PublicKey, anchor.web3.PublicKey]> {

  const [craftItemClassMint, _craftItemClassMetadata, _craftItemClassMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "craftItemClass",
        itemProgram.client.provider.connection,
        authority,
      );

  // create the item class for the craft item
  await createCraftItemClass(itemProgram, craftItemClassMint, authority.publicKey, 0, 5);
  
  const [craftItemMint, _craftItemMetadata, _craftItemMasterEdition] =
      await createMintMetadataAndMasterEditionAccounts(
        "craftItem",
        itemProgram.client.provider.connection,
        authority,
      );


  await createCraftItemEscrow(itemProgram, craftItemClassMint, craftItemMint, authority.publicKey);

  await startAndCompleteCraftItemBuild(itemProgram, craftItemClassMint, craftItemMint, authority.publicKey);

  return [craftItemClassMint, craftItemMint]
}

async function activateItem(
  itemProgram: ItemProgram,
  itemClassMint: anchor.web3.PublicKey,
  itemMint: anchor.web3.PublicKey,
  authority: anchor.web3.Keypair,
  itemClassIndex: number
) {
  const wrappedItemClass = await itemProgram.fetchItemClass(
    itemClassMint,
    new BN(itemClassIndex)
  );

  // begin item activation
  const itemActivationArgs: Instructions.Item.BeginItemActivationArgs = {
    itemClassMint: itemClassMint,
    itemMint: itemMint,
    itemMarkerSpace: 106, // upper bound
    usagePermissivenessToUse: { updateAuthority: true },
    usageIndex: 0,
    usageInfo: null,
    target: null,
    classIndex: new BN(itemClassIndex),
    index: new BN(0),
    amount: new BN(1),
    itemClass: wrappedItemClass,
  };

  const itemTokenAccount = splToken.getAssociatedTokenAddressSync(
    itemMint,
    authority.publicKey
  );

  const itemActivationAccounts: Instructions.Item.BeginItemActivationAccounts =
    {
      itemAccount: itemTokenAccount,
      metadataUpdateAuthority: authority.publicKey,
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
    classIndex: new BN(itemClassIndex),
    index: new BN(0),
    itemClassMint: itemClassMint,
    usagePermissivenessToUse: { updateAuthority: true },
    amount: new BN(1),
    usageIndex: 0,
    usageInfo: null,
  };

  const endItemActivationAccounts: Instructions.Item.EndItemActivationAccounts =
    {
      originator: authority.publicKey,
      itemMint: itemMint,
      itemAccount: itemTokenAccount,
      itemTransferAuthority: authority,
      metadataUpdateAuthority: authority.publicKey,
    };

  const endItemActivationAdditionalArgs: Instructions.Item.EndItemActivationAdditionalArgs =
    {};

  // complete item usage
  const endItemActivationResult = await itemProgram.endItemActivation(
    endItemActivationArgs,
    endItemActivationAccounts,
    endItemActivationAdditionalArgs
  );
  console.log("endItemActivationTxSig: %s", endItemActivationResult.txid);
}

async function buildItem(
  itemProgram: ItemProgram,
  itemMint: anchor.web3.PublicKey,
  itemClassMint: anchor.web3.PublicKey,
  authority: anchor.web3.PublicKey,
  itemClassIndex: number
) {
  const craftItemEscrowIndex = 0;

  // create the item escrow accounts
  await createItemEscrow(
    itemProgram,
    itemClassMint,
    itemMint,
    authority,
    itemClassIndex,
    craftItemEscrowIndex
  );

  await startItemBuild(
    itemProgram,
    itemClassMint,
    itemMint,
    authority,
    new BN(itemClassIndex),
    new BN(craftItemEscrowIndex)
  );

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
      originator: authority,
      buildPermissivenessToUse: { tokenHolder: true },
      storeMint: false,
      storeMetadataFields: false,
    };

  const itemNFTTokenAccountAddress = splToken.getAssociatedTokenAddressSync(
    itemMint,
    authority
  );

  const completeItemEscrowBuildPhaseAccounts: Instructions.Item.CompleteItemEscrowBuildPhaseAccounts =
    {
      itemClassMint: itemClassMint,
      newItemMint: itemMint,
      newItemToken: itemNFTTokenAccountAddress,
      newItemTokenHolder: authority,
      parentMint: null,
      metadataUpdateAuthority: authority,
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
}

async function startItemBuild(
  itemProgram: ItemProgram,
  itemClassMint: anchor.web3.PublicKey,
  itemMint: anchor.web3.PublicKey,
  authority: anchor.web3.PublicKey,
  itemClassIndex: BN,
  craftItemEscrowIndex: BN
) {
  // start the item build phase
  const startItemEscrowBuildPhaseArgs: Instructions.Item.StartItemEscrowBuildPhaseArgs =
    {
      classIndex: itemClassIndex,
      parentClassIndex: null,
      craftEscrowIndex: craftItemEscrowIndex,
      componentScope: "none",
      amountToMake: new BN(1),
      itemClassMint: itemClassMint,
      originator: authority,
      newItemMint: itemMint,
      buildPermissivenessToUse: { tokenHolder: true },
      endNodeProof: null,
      totalSteps: null,
    };

  const startItemEscrowBuildPhaseAccounts: Instructions.Item.StartItemEscrowBuildPhaseAccounts =
    {
      itemClassMint: itemClassMint,
      newItemToken: (await Utils.PDA.getAtaForMint(itemMint, authority))[0],
      newItemTokenHolder: authority,
      parentMint: null,
      metadataUpdateAuthority: authority,
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
}

async function startAndCompleteCraftItemBuild(
  itemProgram: ItemProgram,
  itemClassMint: anchor.web3.PublicKey,
  itemMint: anchor.web3.PublicKey,
  authority: anchor.web3.PublicKey,
) {
  // start the item build phase
  const startItemEscrowBuildPhaseArgs: Instructions.Item.StartItemEscrowBuildPhaseArgs =
    {
      classIndex: new BN(0),
      parentClassIndex: null,
      craftEscrowIndex: new BN(0),
      componentScope: "none",
      amountToMake: new BN(1),
      itemClassMint: itemClassMint,
      originator: authority,
      newItemMint: itemMint,
      buildPermissivenessToUse: { tokenHolder: true },
      endNodeProof: null,
      totalSteps: null,
    };

  const startItemEscrowBuildPhaseAccounts: Instructions.Item.StartItemEscrowBuildPhaseAccounts =
    {
      itemClassMint: itemClassMint,
      newItemToken: (await Utils.PDA.getAtaForMint(itemMint, authority))[0],
      newItemTokenHolder: authority,
      parentMint: null,
      metadataUpdateAuthority: authority,
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
      classIndex: new BN(0),
      newItemIndex: new BN(itemIndex),
      parentClassIndex: null,
      craftEscrowIndex: new BN(0),
      componentScope: "none",
      amountToMake: new BN(1),
      space: new BN(300),
      itemClassMint: itemClassMint,
      originator: authority,
      buildPermissivenessToUse: { tokenHolder: true },
      storeMint: false,
      storeMetadataFields: false,
    };

  const itemNFTTokenAccountAddress = splToken.getAssociatedTokenAddressSync(
    itemMint,
    authority
  );

  const completeItemEscrowBuildPhaseAccounts: Instructions.Item.CompleteItemEscrowBuildPhaseAccounts =
    {
      itemClassMint: itemClassMint,
      newItemMint: itemMint,
      newItemToken: itemNFTTokenAccountAddress,
      newItemTokenHolder: authority,
      parentMint: null,
      metadataUpdateAuthority: authority,
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
}


async function createCraftItemEscrow(itemProgram: ItemProgram, craftItemClassMint: anchor.web3.PublicKey, craftItemMint: anchor.web3.PublicKey, authority: anchor.web3.PublicKey) {
  // create item escrow
  let componentScope = "none";

  // create the item escrow
  const createItemEscrowArgs: Instructions.Item.CreateItemEscrowArgs = {
    classIndex: new BN(0),
    craftEscrowIndex: new BN(0),
    componentScope,
    buildPermissivenessToUse: { tokenHolder: true },
    namespaceIndex: null,
    itemClassMint: craftItemClassMint,
    amountToMake: new BN(1),
    parentClassIndex: null,
  };

  const createItemEscrowAccounts: Instructions.Item.CreateItemEscrowAccounts = {
    newItemMint: craftItemMint,
    newItemToken: splToken.getAssociatedTokenAddressSync(craftItemMint, authority),
    newItemTokenHolder: authority,
    parentMint: null,
    itemClassMint: craftItemClassMint,
    metadataUpdateAuthority: authority,
  };

  const createItemEscrowAdditionalArgs: Instructions.Item.CreateItemEscrowAdditionalArgs =
    {};

  const createItemEscrowResult = await itemProgram.createItemEscrow(
    createItemEscrowArgs,
    createItemEscrowAccounts,
    createItemEscrowAdditionalArgs,
    { commitment: "confirmed" }
  );
  await itemProgram.client.provider.connection.confirmTransaction(createItemEscrowResult.txid, "confirmed");
  console.log("createItemEscrowTxSig: %s", createItemEscrowResult.txid); 
}

async function createItemEscrow(
  itemProgram: ItemProgram,
  itemClassMint: anchor.web3.PublicKey,
  itemMint: anchor.web3.PublicKey,
  authority: anchor.web3.PublicKey,
) {
  // create item escrow
  let componentScope = "main";

  // create the item escrow
  const createItemEscrowArgs: Instructions.Item.CreateItemEscrowArgs = {
    classIndex: new BN(0),
    craftEscrowIndex: new BN(0),
    componentScope,
    buildPermissivenessToUse: { tokenHolder: true },
    namespaceIndex: null,
    itemClassMint: itemClassMint,
    amountToMake: new BN(1),
    parentClassIndex: null,
  };

  const createItemEscrowAccounts: Instructions.Item.CreateItemEscrowAccounts = {
    newItemMint: itemMint,
    newItemToken: splToken.getAssociatedTokenAddressSync(itemMint, authority),
    newItemTokenHolder: authority,
    parentMint: null,
    itemClassMint: itemClassMint,
    metadataUpdateAuthority: authority,
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
}

async function addItemToEscrow(
  itemProgram: ItemProgram,
  itemClassMint: anchor.web3.PublicKey,
  itemMint: anchor.web3.PublicKey,
  craftItemMint: anchor.web3.PublicKey,
  craftItemClassMint: anchor.web3.PublicKey,
  authority: anchor.web3.PublicKey,
) {
  const accounts: AddCraftItemToEscrowAccounts = {
    itemClassMint: itemClassMint,
    newItemToken: (await Utils.PDA.getAtaForMint(itemMint, authority))[0],
    newItemTokenHolder: authority,
    craftItemTokenMint: craftItemMint,
    parentMint: null,
    metadataUpdateAuthority: authority,
    craftItemTransferAuthority: authority,
  };

  const args: AddCraftItemToEscrowArgs = {
    classIndex: new BN(0),
    parentClassIndex: null,
    craftItemIndex: new BN(0),
    craftEscrowIndex: new BN(0),
    craftItemClassIndex: new BN(0),
    craftItemClassMint: craftItemClassMint,
    componentScope: "main",
    amountToMake: new BN(1),
    amountToContributeFromThisContributor: new BN(1),
    newItemMint: itemMint,
    originator: authority,
    namespaceIndex: null,
    buildPermissivenessToUse: { tokenHolder: true },
    itemClassMint: itemClassMint,
    componentProof: null,
    component: {
      mint: craftItemMint,
      classIndex: new BN(0),
      amount: new BN(1),
      timeToBuild: new BN(0),
      componentScope: "main",
      useUsageIndex: new BN(0),
      condition: { presence: true },
      inherited: { notInherited: true },
    },
    craftUsageInfo: null,
  };

  const result = await itemProgram.addCraftItemToEscrow(args, accounts, {});
  console.log("addCraftItemToEscrowTxSig: %s", result.txid);
}

// create a new item class
async function createCraftItemClass(
  itemProgram: ItemProgram,
  itemClassMint: anchor.web3.PublicKey,
  authority: anchor.web3.PublicKey,
  index: number,
  maxUses: number,
) {

  const itemClassData = {
    settings: {
      freeBuild: {
        inherited: { notInherited: true},
        boolean: true,  
      },
      childrenMustBeEditions: null,
      builderMustBeHolder: null,
      updatePermissiveness: null,
      buildPermissiveness: null,
      stakingWarmUpDuration: null,
      stakingCooldownDuration: null,
      stakingPermissiveness: null,
      unstakingPermissiveness: null,
      childUpdatePropagationPermissiveness: null,
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
              maxUses: maxUses,
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
    classIndex: new BN(index),
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
    metadataUpdateAuthority: authority,
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
}

// create a new item class
async function createItemClass(
  itemProgram: ItemProgram,
  itemClassMint: anchor.web3.PublicKey,
  authority: anchor.web3.PublicKey,
  index: number,
  maxUses: number,
  craftItemMint: anchor.web3.PublicKey
) {

  const itemClassData = {
    settings: {
      freeBuild: null,
      childrenMustBeEditions: null,
      builderMustBeHolder: null,
      updatePermissiveness: null,
      buildPermissiveness: null,
      stakingWarmUpDuration: null,
      stakingCooldownDuration: null,
      stakingPermissiveness: null,
      unstakingPermissiveness: null,
      childUpdatePropagationPermissiveness: null,
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
              maxUses: maxUses,
              maxPlayersPerUse: null,
              itemUsageType: { destruction: true },
              cooldownDuration: 0,
              warmupDuration: null,
            },
          },
        },
      ],
      components: [
        {
          mint: craftItemMint,
          classIndex: new BN(index),
          amount: new BN(1),
          timeToBuild: new BN(0),
          componentScope: "main",
          useUsageIndex: new BN(0),
          condition: { presence: true },
          inherited: { notInherited: true },
        },
      ]
    },
  };

  const args: Instructions.Item.CreateItemClassArgs = {
    classIndex: new BN(index),
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
    metadataUpdateAuthority: authority,
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
    symbol: name.toUpperCase().substring(0, 2),
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
  console.log("createMdAndMeAccountsTxSig: %s", createMdAndMeAccountsTxSig);
  await connection.confirmTransaction(createMdAndMeAccountsTxSig, "confirmed");

  return [mint.publicKey, metadata, masterEdition];
}

async function newPayer(
  connection: anchor.web3.Connection
): Promise<anchor.web3.Keypair> {
  const payer = anchor.web3.Keypair.generate();

  const txSig = await connection.requestAirdrop(
    payer.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(txSig, "confirmed");

  return payer;
}

async function assertTokenBalance(
  connection: anchor.web3.Connection,
  mint: anchor.web3.PublicKey,
  owner: anchor.web3.PublicKey,
  expectedAmount: BN
) {
  const ata = splToken.getAssociatedTokenAddressSync(mint, owner);
  const response = await connection.getTokenAccountBalance(ata, "confirmed");
  assert(new BN(response.value.amount).eq(expectedAmount));
}
