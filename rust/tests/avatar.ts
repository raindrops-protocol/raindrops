import * as anchor from "@project-serum/anchor";
import * as splToken from "@solana/spl-token";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  State,
  Instructions,
  Utils,
  Constants,
  PlayerProgram,
  Idls,
} from "@raindrops-protocol/raindrops";
import { assert } from "chai";
import { Avatar, IDL } from "../target/types/avatar";

describe.only("avatar", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program: anchor.Program<Avatar> = new anchor.Program(
    IDL,
    "HPhmNTrxHWs8JzCYxx8c479Ya8wju2roKF61vTCEWQGW",
    anchor.getProvider()
  );
  const provider = program.provider as anchor.AnchorProvider;
  const connection = provider.connection;

  const rainTokenMint = Constants.Common.RAIN_TOKEN_MINT;

  // receives all $RAIN payments
  const rainVaultAuthority = Constants.Common.RAIN_TOKEN_VAULT_AUTHORITY;

  // Mint Authority for our mock $RAIN
  const mintAuthoritySecretKey = new Uint8Array([
    100, 162, 5, 160, 251, 9, 105, 243, 77, 211, 169, 101, 169, 237, 4, 234, 35,
    250, 235, 162, 55, 77, 144, 249, 220, 185, 242, 225, 8, 160, 200, 130, 1,
    237, 169, 176, 82, 206, 183, 81, 233, 30, 153, 237, 13, 46, 130, 71, 22,
    179, 133, 3, 170, 140, 225, 16, 11, 210, 69, 163, 102, 144, 242, 169,
  ]);
  // address: 8XbgRBz8pHzCBy4mwgr4ViDhJWFc35cd7E5oo3t5FvY
  const rainTokenMintAuthority = anchor.web3.Keypair.fromSecretKey(
    mintAuthoritySecretKey
  );

  before("create rain token vault", async () => {
    // receives the rain token as payment for creating raindrops accounts
    const tokenVaultPayer = await newPayer(
      connection,
      rainTokenMint,
      rainTokenMintAuthority
    );
    await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      tokenVaultPayer,
      rainTokenMint,
      rainVaultAuthority
    );
  });

  it("create avatar", async () => {
    const payer = await newPayer(connection);

    const [playerClass, playerClassMint] = await createPlayerClass(
      payer,
      connection
    );

    const player = await createPlayer(payer, connection, playerClassMint);

    //const [avatar, _avatarBump] =
    //  await anchor.web3.PublicKey.findProgramAddress(
    //    [playerClass.toBuffer()],
    //    program.programId
    //  );

    //const createAvatarTxSig = await program.methods
    //  .createAvatar()
    //  .accounts({
    //    avatar: avatar,
    //    //playerClass: playerClass,
    //    playerAuthority: payer.publicKey,
    //    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    //    systemProgram: anchor.web3.SystemProgram.programId,
    //    playerProgram: Constants.ProgramIds.PLAYER_ID,
    //  })
    //  .rpc();
    //console.log("createAvatarTxSig: %s", createAvatarTxSig);
  });

  it.only("create avatar2", async () => {
    const playerClassMint = anchor.web3.Keypair.generate();
    const authorityAta = splToken.getAssociatedTokenAddressSync(
      playerClassMint.publicKey,
      provider.publicKey
    );

    const [playerClass, _playerClassBump] = await Utils.PDA.getPlayerPDA(
      playerClassMint.publicKey,
      new anchor.BN(0)
    );
    const playerClassMetadata = await Utils.PDA.getMetadata(
      playerClassMint.publicKey
    );
    const playerClassMe = await Utils.PDA.getEdition(playerClassMint.publicKey);

    const createPlayerTxSig = await program.methods
      .createPlayerClass()
      .accounts({
        playerClass: playerClass,
        playerClassMint: playerClassMint.publicKey,
        playerClassMetadata: playerClassMetadata,
        playerClassMe: playerClassMe,
        authorityAta: authorityAta,
        authority: provider.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
        associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        playerProgram: Constants.ProgramIds.PLAYER_ID,
        metadataProgram: mpl.PROGRAM_ID,
      })
      .signers([playerClassMint])
      .rpc({ skipPreflight: false });
    console.log("createPlayerTxSig: %s", createPlayerTxSig);
  });
});

async function createPlayerClass(
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
        bodyParts: null,
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
      metadataUpdateAuthority: payer.publicKey,
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

async function createPlayer(
  payer: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  playerClassMint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> {
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
    space: new anchor.BN(400),
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
    metadataUpdateAuthority: _playerMasterEdition,
  };

  const buildPlayerAdditionalArgs: Instructions.Player.BuildPlayerAdditionalArgs =
    {
      rainAmount: new anchor.BN(Constants.Player.RAIN_PAYMENT_AMOUNT),
    };

  const createPlayerTx = await playerProgram.buildPlayer(
    buildPlayerArgs,
    buildPlayerAccounts,
    buildPlayerAdditionalArgs
  );
  const createPlayerResult = await createPlayerTx.rpc();
  console.log("createPlayerTxSig: %s", createPlayerResult.txid);

  const [player, _playerBump] = await Utils.PDA.getPlayerPDA(
    playerMint,
    new anchor.BN(0)
  );

  return player;
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

async function newPayer(
  connection: anchor.web3.Connection,
  rainTokenMint?: anchor.web3.PublicKey,
  rainTokenMintAuthority?: anchor.web3.Keypair
): Promise<anchor.web3.Keypair> {
  const payer = anchor.web3.Keypair.generate();

  const txSig = await connection.requestAirdrop(
    payer.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(txSig);

  if (rainTokenMint && rainTokenMintAuthority) {
    const payerRainTokenAta = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      rainTokenMint,
      payer.publicKey
    );
    await splToken.mintTo(
      connection,
      payer,
      rainTokenMint,
      payerRainTokenAta.address,
      rainTokenMintAuthority,
      100_000_000_000
    );
  }

  return payer;
}
