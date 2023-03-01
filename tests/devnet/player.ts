import * as anchor from "@project-serum/anchor";
import * as fs from "fs";
import * as splToken from "@solana/spl-token";
import * as utils from "./utils";
import {
  Idls,
  Instructions,
  ItemProgram,
  PlayerProgram,
  Utils,
} from "@raindrops-protocol/raindrops";

async function player() {
  const decodedKey = new Uint8Array(
    JSON.parse(fs.readFileSync(`./tester.json`).toString())
  );

  const payer = anchor.web3.Keypair.fromSecretKey(decodedKey);

  const connection = new anchor.web3.Connection(
    "https://dry-polished-bush.solana-devnet.discover.quiknode.pro/ed6aaf728f5cc938afefe738d60b1e43853877f6",
    "confirmed"
  );

  const [item, itemMint, itemClassMint] =
    await utils.createItemEscrowAndCompleteBuild(payer, connection);

  console.log("item: %s", item.toString());
  console.log("itemMint: %s", itemMint.toString());

  const [playerClass, playerClassMint] = await utils.createPlayerClass(
    payer,
    connection
  );

  console.log("playerClass: %s", playerClass.toString());

  const [player, playerMint] = await utils.createPlayer(
    payer,
    connection,
    playerClassMint
  );

  console.log("player: %s", player.toString());

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

  const itemProgram = await ItemProgram.getProgramWithConfig(ItemProgram, {
    asyncSigning: false,
    provider: new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: "confirmed",
    }),
    idl: Idls.ItemIDL,
  });

  const payerItemAta = splToken.getAssociatedTokenAddressSync(
    itemMint,
    payer.publicKey
  );

  const addItemAccounts: Instructions.Player.AddItemAccounts = {
    itemAccount: payerItemAta,
    itemMint: itemMint,
    itemTransferAuthority: payer,
    metadataUpdateAuthority: payer.publicKey,
    validationProgram: null,
  };
  const addItemArgs: Instructions.Player.AddItemArgs = {
    itemIndex: new anchor.BN(0),
    index: new anchor.BN(0),
    playerMint: playerMint,
    addItemPermissivenessToUse: { tokenHolder: true },
    amount: new anchor.BN(1),
  };

  const addItemResult = await (
    await playerProgram.addItem(addItemArgs, addItemAccounts, {
      itemProgram: itemProgram,
      itemClassIndex: new anchor.BN(0),
      itemClassMint: itemClassMint,
      classIndex: new anchor.BN(0),
      playerClassMint: playerClassMint,
    })
  ).rpc();
  console.log("addItemTxSig: %s", addItemResult.txid);

  const equipItemAccount: Instructions.Player.ToggleEquipItemAccounts = {
    metadataUpdateAuthority: payer.publicKey,
    validationProgram: null,
  };
  const equipItemArgs: Instructions.Player.ToggleEquipItemArgs = {
    itemIndex: new anchor.BN(0),
    itemMint: itemMint,
    itemClassMint: itemClassMint,
    index: new anchor.BN(0),
    playerMint: playerMint,
    amount: new anchor.BN(1),
    equipping: true,
    bodyPartIndex: 0,
    equipItemPermissivenessToUse: { tokenHolder: true },
    itemUsage: null,
    itemUsageIndex: 0,
    itemUsageProof: null,
  };

  const equipItemResult = await (
    await playerProgram.toggleEquipItem(equipItemArgs, equipItemAccount, {
      playerClassMint: playerClassMint,
      itemClassIndex: new anchor.BN(0),
      classIndex: new anchor.BN(0),
      itemProgram: itemProgram,
    })
  ).rpc();
  console.log("equipItemTxSig: %s", equipItemResult.txid);

  await utils.delay(5000);

  const toggleEquipItemAccounts: Instructions.Player.ToggleEquipItemAccounts = {
    metadataUpdateAuthority: payer.publicKey,
    validationProgram: null,
  };

  const toggleEquipItemArgs: Instructions.Player.ToggleEquipItemArgs = {
    itemIndex: new anchor.BN(0),
    itemMint: itemMint,
    itemClassMint: itemClassMint,
    index: new anchor.BN(0),
    playerMint: playerMint,
    amount: new anchor.BN(1),
    equipping: false,
    bodyPartIndex: 0,
    equipItemPermissivenessToUse: { tokenHolder: true },
    itemUsageIndex: 0,
    itemUsage: null,
    itemUsageProof: null,
  };

  const toggleEquipItemAddArgs: Instructions.Player.ToggleEquipItemAdditionalArgs =
    {
      playerClassMint: playerClassMint,
      classIndex: new anchor.BN(0),
      itemClassIndex: new anchor.BN(0),
      itemProgram: itemProgram,
    };

  const toggleEquipItemResult = await (
    await playerProgram.toggleEquipItem(
      toggleEquipItemArgs,
      toggleEquipItemAccounts,
      toggleEquipItemAddArgs
    )
  ).rpc();
  console.log("toggleEquipItemTxSig: %s", toggleEquipItemResult.txid);

  const removeItemArgs: Instructions.Player.RemoveItemArgs = {
    itemIndex: new anchor.BN(0),
    index: new anchor.BN(0),
    playerMint: playerMint,
    amount: new anchor.BN(1),
    removeItemPermissivenessToUse: { tokenHolder: true },
  };

  const removeItemAccounts: Instructions.Player.RemoveItemAccounts = {
    itemAccount: payerItemAta,
    itemMint: itemMint,
    validationProgram: null,
    metadataUpdateAuthority: payer.publicKey,
  };
  const removeItemAddArgs: Instructions.Player.RemoveItemAdditionalArgs = {
    playerClassMint: playerClassMint,
    classIndex: new anchor.BN(0),
    itemClassMint: itemClassMint,
    itemClassIndex: new anchor.BN(0),
    itemProgram: itemProgram,
  };

  const removeItemResult = await (
    await playerProgram.removeItem(
      removeItemArgs,
      removeItemAccounts,
      removeItemAddArgs
    )
  ).rpc();
  console.log("removeItemTxSig: %s", removeItemResult.txid);
}

player();
