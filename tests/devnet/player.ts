import * as anchor from "@project-serum/anchor";
import * as fs from "fs";
import * as utils from "./utils";
const os = require("os");

async function player() {
  const decodedKey = new Uint8Array(
    JSON.parse(fs.readFileSync(`./tester.json`).toString())
  );

  let payer = anchor.web3.Keypair.fromSecretKey(decodedKey);

  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
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

  // TODO: will fail bc no $RAIN in dev
  const [player, playerMint] = await utils.createPlayer(
    payer,
    connection,
    playerClassMint
  );

  console.log("player: %s", player.toString());
}

player();
