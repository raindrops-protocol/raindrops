import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import * as splToken from "@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  State,
  Instructions,
  Utils,
  Constants,
  StakingProgram,
  Idls,
  ItemProgram,
} from "@raindrops-protocol/raindrops";
import assert = require("assert");

describe("item", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it("pNFT item smoke test", async () => {
    const payer = await newPayer(connection);

    const _itemProgram = await ItemProgram.getProgramWithConfig(
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

async function confirmTransactions(
  txSigs: string[],
  connection: anchor.web3.Connection
) {
  for (let txSig of txSigs) {
    connection.confirmTransaction(txSig, "finalized");
  }
}
