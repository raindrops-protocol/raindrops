import { web3 } from "@project-serum/anchor";
import { Token } from "@solana/spl-token";

import { TOKEN_PROGRAM_ID } from "../../constants/programIds";
import { loadWalletKey } from "../../utils/file";

async function createMint(
  connection: web3.Connection,
  walletKeypair: web3.Keypair,
): Promise<web3.PublicKey> {
  const mint = await Token.createMint(
    connection,
    walletKeypair,
    walletKeypair.publicKey,
    walletKeypair.publicKey,
    9,
    TOKEN_PROGRAM_ID,
  );
  return mint.publicKey;
};

async function main() {
  const process = require("process");
  const walletKeyPair = loadWalletKey(process.env.KEYPAIR);
  const solConnection = new web3.Connection(process.env.SOLANA_CLUSTER);
  return createMint(solConnection, walletKeyPair);
}

main().then((mint) => {console.log(mint.toBase58())})
