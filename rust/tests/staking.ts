import * as anchor from "@project-serum/anchor";
import { StakingProgram, Idls } from "@raindrops-protocol/raindrops";

describe("staking", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;

  it("staking smoke test", async () => {
    const payer = await newPayer(connection);

    const _stakingProgram = await StakingProgram.getProgramWithConfig(
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
