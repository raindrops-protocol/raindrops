import * as anchor from "@project-serum/anchor";
import { Idls, StakingProgram } from "@raindrops-protocol/raindrops";
import fs from "fs";

async function staking() {
  const decodedKey = new Uint8Array(
    JSON.parse(fs.readFileSync(`./tester.json`).toString())
  );

  const payer = anchor.web3.Keypair.fromSecretKey(decodedKey);

  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const stakingProgram = await StakingProgram.getProgramWithConfig(
    StakingProgram,
    {
      asyncSigning: false,
      provider: new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
      ),
      idl: Idls.StakingIDL,
    }
  );
  console.log("stake program init complete");
}

staking();
