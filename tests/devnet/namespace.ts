import * as anchor from "@project-serum/anchor";
import { Idls, NamespaceProgram } from "@raindrops-protocol/raindrops";
import fs from "fs";

async function namespace() {
  const decodedKey = new Uint8Array(
    JSON.parse(fs.readFileSync(`./tester.json`).toString())
  );

  const payer = anchor.web3.Keypair.fromSecretKey(decodedKey);

  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const namespaceProgram = await NamespaceProgram.getProgramWithConfig(
    NamespaceProgram,
    {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.NamespaceIDL,
    }
  );
  console.log("ns program init complete");

  // TODO: requires devnet $RAIN
}

namespace();
