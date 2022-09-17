import { AnchorProvider, BN, web3 } from "@project-serum/anchor";
import { Program } from "@raindrop-studios/sol-kit";
import { PublicKey, Signer, TransactionInstruction } from "@solana/web3.js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";

import * as PlayerInstruction from "../instructions/player";
import * as Utils from "../utils";
import { PLAYER_ID } from "../constants/programIds";
import {
  getEdition,
  getNamespacePDA,
  getPlayerItemAccount,
} from "../utils/pda";
import {
  createMasterEditionInstruction,
  createMetadataInstruction,
} from "../utils/tokenMetadata/instructions";
import { MintLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { serialize } from "borsh";
import {
  Collection,
  CreateMasterEditionArgs,
  CreateMetadataArgs,
  Creator,
  decodeMetadata,
  METADATA_SCHEMA,
} from "../utils/tokenMetadata/schema";
import { sendTransactionWithRetry } from "../utils/transactions";
import { PlayerProgram } from "./player";
import { ItemProgram } from "./item";
import { createAssociatedTokenAccountInstruction } from "../utils/ata";
import { NamespaceProgram } from "./namespace";
import { randomUUID } from "crypto";
const {
  PDA: {
    getAtaForMint,
    getItemActivationMarker,
    getItemPDA,
    getMetadata,
    getPlayerPDA,
  },
} = Utils;

enum Scope {
  Mint,
  CandyMachine,
  Collection,
}
export interface PlayerizeArgs {
  scope: {
    type: Scope;
    values: PublicKey[];
  };
  // These traits will become bodyparts
  bodyPartTraits: string[];
  // These traits will become enums
  enumerableTraits: string[];
  newBasicStats: any[];
  itemsWillBeSFTs: boolean;
  className: string;
  namespaceName: string;
  allowTokenHolder: boolean;
  // Nested set of URLs for each trait value.
  itemClassLookup: Record<
    string,
    Record<string, { existingClassDef: any; address: string }>
  >;
  itemImageFile: Record<string, Buffer>;
  collectionMint: PublicKey;
  index: BN;
  itemIndex: BN;
  existingClassDef: any;
  itemsName: string;
  existingCollectionForItems: PublicKey | null;
  writeToImmutableStorage: (f: Buffer) => Promise<string>;
  writeOutState: (f: string) => Promise<void>;
}

export class Playerizer {
  player: PlayerProgram;
  item: ItemProgram;
  namespace: NamespaceProgram;
  constructor(
    player: PlayerProgram,
    item: ItemProgram,
    namespace: NamespaceProgram
  ) {
    this.player = player;
    this.item = item;
    this.namespace = namespace;
  }

  async createMainNFTClass(args: PlayerizeArgs) {
    const {
      // These traits will become bodyparts
      bodyPartTraits,
      // These traits will become enums
      enumerableTraits,
      newBasicStats,
      className,
      itemClassLookup,
      collectionMint,
      allowTokenHolder,
      existingClassDef,
      index,
      writeOutState,
    } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    // how do we determine if class already exists?
    // we build class off collection NFT.
    const classDef = existingClassDef || {
      data: {
        settings: {
          defaultCategory: {
            category: className,
            inherited: { notInherited: true },
          },
          childrenMustBeEditions: {
            boolean: false,
            inherited: { notInherited: true },
          },
          builderMustBeHolder: {
            boolean: false,
            inherited: { notInherited: true },
          },
          updatePermissiveness: [
            {
              permissivenessType: { updateAuthority: true },
              inherited: { notInherited: true },
            },
          ],
          instanceUpdatePermissiveness: [
            {
              permissivenessType: { updateAuthority: true },
              inherited: { notInherited: true },
            },
          ],
          buildPermissiveness: [
            {
              permissivenessType: { updateAuthority: true },
              inherited: { notInherited: true },
            },
          ],
          equipItemPermissiveness: [
            ...(allowTokenHolder
              ? [
                  {
                    permissivenessType: { tokenHolder: true },
                    inherited: { notInherited: true },
                  },
                ]
              : []),
            {
              permissivenessType: { updateAuthority: true },
              inherited: { notInherited: true },
            },
          ],
          addItemPermissiveness: [
            ...(allowTokenHolder
              ? [
                  {
                    permissivenessType: { tokenHolder: true },
                    inherited: { notInherited: true },
                  },
                ]
              : []),
            {
              permissivenessType: { updateAuthority: true },
              inherited: { notInherited: true },
            },
          ],
          useItemPermissiveness: [
            ...(allowTokenHolder
              ? [
                  {
                    permissivenessType: { tokenHolder: true },
                    inherited: { notInherited: true },
                  },
                ]
              : []),
            {
              permissivenessType: { updateAuthority: true },
              inherited: { notInherited: true },
            },
          ],
          unequipItemPermissiveness: null,
          removeItemPermissiveness: null,
          stakingWarmUpDuration: null,
          stakingCooldownDuration: null,
          stakingPermissiveness: null,
          unstakingPermissiveness: null,
          childUpdatePropagationPermissiveness: [],
        },
        config: {
          startingStatsUri: null,
          basicStats: [
            ...newBasicStats,
            ...enumerableTraits.map((s, i) => ({
              index: i + newBasicStats.length,
              name: s,
              inherited: { notInherited: true },
              statType: {
                enum: {
                  starting: 0,
                  values: Object.keys(itemClassLookup[s])
                    .sort()
                    .map((n, v) => ({ name: n, value: v })),
                },
              },
            })),
          ],
          bodyParts: bodyPartTraits.map((b, i) => ({
            index: i,
            bodyPart: b,
            totalItemSpots: 1,
            inherited: { notInherited: true },
          })),
          equipValidation: null,
          addToPackValidation: null,
        },
      },
      metadataUpdateAuthority: null,
      storeMint: true,
      storeMetadataFields: true,
      mint: collectionMint.toBase58(),
      index,
      updatePermissivenessToUse: { updateAuthority: true },
      namespaceRequirement: 1,
      /// Rough estimate of bytes needed for class plus buffer
      totalSpaceBytes:
        250 +
        (newBasicStats.length + enumerableTraits.length) *
          (2 + 25 + 8 * 5 + 1) +
        bodyPartTraits.length * (2 + 25 + 9 + 1) +
        100,
    };

    let playerClass;
    try {
      playerClass = await this.player.fetchPlayerClass(collectionMint, index);
      console.log("Updating player class");
      await this.player.updatePlayerClass(
        {
          classIndex: index,
          parentClassIndex: null,
          updatePermissivenessToUse: playerClass.updatePermissivenessToUse,
          playerClassData: playerClass.data,
        },
        {
          playerMint: new web3.PublicKey(playerClass.mint),
          parent: null,
          parentMint: null,
          metadataUpdateAuthority: wallet,
        },
        {
          permissionless: false,
        }
      );
    } catch (e) {
      console.error(e);
      console.log("Player Class not found.");
      console.log("Creating player class");
      await this.player.createPlayerClass(
        {
          classIndex: index,
          parentClassIndex: null,
          space: new BN(playerClass.space),
          desiredNamespaceArraySize: playerClass.namespaceRequirement,
          updatePermissivenessToUse: playerClass.updatePermissivenessToUse,
          storeMint: playerClass.storeMint,
          storeMetadataFields: playerClass.storeMetadataFields,
          playerClassData: playerClass.data,
          parentOfParentClassIndex: null,
        },
        {
          playerMint: new web3.PublicKey(playerClass.mint),
          parent: null,
          parentMint: null,
          parentOfParentClassMint: null,
          metadataUpdateAuthority: wallet,
          parentUpdateAuthority: null,
        },
        {}
      );
    }

    console.log("Writing out player class to save area.");

    await writeOutState(
      JSON.stringify({ ...this.turnToConfig(args), existingClassDef: classDef })
    );
  }

  turnToConfig(args: PlayerizeArgs) {
    return {
      scope: {
        type: args.scope.type,
        values: args.scope.values.map((s) => s.toBase58()),
      },
      // These traits will become bodyparts
      bodyPartTraits: args.bodyPartTraits,
      // These traits will become enums
      enumerableTraits: args.enumerableTraits,
      newBasicStats: args.newBasicStats,
      itemsWillBeSFTs: args.itemsWillBeSFTs,
      className: args.className,
      namespaceName: args.namespaceName,
      allowTokenHolder: args.allowTokenHolder,
      // Nested set of URLs for each trait value.
      itemClassLookup: args.itemClassLookup,
      collectionMint: args.collectionMint.toBase58(),
      index: args.index.toNumber(),
      itemIndex: args.itemIndex.toNumber(),
      existingClassDef: args.existingClassDef,
      itemsName: args.itemsName,
      existingCollectionForItems: args.existingCollectionForItems,
    };
  }

  async getMints(args: PlayerizeArgs): Promise<PublicKey[]> {
    const {
      scope: { type, values },
    } = args;
    let mints = [];
    if (type == Scope.Mint) {
      mints = values;
    } else if (type == Scope.Collection) {
      throw new Error("Not supported yet");
    } else if (type == Scope.CandyMachine) {
      throw new Error("Not supported yet");
    }
    return mints;
  }

  async createItemCollection(args: PlayerizeArgs) {
    const {
      scope: { type, values },
      itemClassLookup,
      existingCollectionForItems,
      index,
      itemsName,
      itemImageFile,
      writeToImmutableStorage,
      writeOutState,
    } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    let realCollectionMint;

    const mints = await this.getMints(args);

    if (!existingCollectionForItems) {
      console.log("The collection doesn't exist. Uploading image.");

      const layers = Object.keys(itemClassLookup);
      const traits = Object.keys(itemClassLookup[layers[0]]);
      const firstUpload = await writeToImmutableStorage(
        itemImageFile[layers[0] + "-" + traits[0]]
      );
      const mint = mints[0];
      console.log("Grabbing a single mint to grab royalties...");
      const metadata = await getMetadata(mint);
      const metadataAccount =
        await this.player.client.provider.connection.getAccountInfo(metadata);
      const metadataObj = decodeMetadata(metadataAccount.data);

      console.log("Uploaded image to", firstUpload);

      const keypair = web3.Keypair.generate();
      const ata = (await getAtaForMint(keypair.publicKey, wallet))[0];

      const instructions = [
        web3.SystemProgram.createAccount({
          fromPubkey: (this.player.client.provider as AnchorProvider).wallet
            .publicKey,
          newAccountPubkey: keypair.publicKey,
          space: MintLayout.span,
          lamports:
            await this.player.client.provider.connection.getMinimumBalanceForRentExemption(
              MintLayout.span
            ),
          programId: TOKEN_PROGRAM_ID,
        }),
        await Token.createInitMintInstruction(
          TOKEN_PROGRAM_ID,
          keypair.publicKey,
          0,
          wallet,
          wallet
        ),
        createAssociatedTokenAccountInstruction(
          ata,
          wallet,
          wallet,
          keypair.publicKey
        ),
        Token.createMintToInstruction(
          TOKEN_PROGRAM_ID,
          keypair.publicKey,
          ata,
          wallet,
          [],
          1
        ),
        createMetadataInstruction(
          await getMetadata(keypair.publicKey),
          keypair.publicKey,
          wallet,
          wallet,
          wallet,
          Buffer.from(
            serialize(
              METADATA_SCHEMA,
              new CreateMetadataArgs({
                data: {
                  name: itemsName,
                  symbol: null,
                  uri: firstUpload,
                  sellerFeeBasisPoints: 0,
                  creators: metadataObj.data.creators?.map(
                    (c) =>
                      new Creator({
                        address: c.address,
                        verified: c.verified,
                        share: c.share,
                      })
                  ),
                  collection: null,
                  uses: null,
                },
                isMutable: true,
              })
            )
          )
        ),
        createMasterEditionInstruction(
          await getMetadata(keypair.publicKey),
          await getEdition(keypair.publicKey),
          keypair.publicKey,
          wallet,
          wallet,
          wallet,
          Buffer.from(
            serialize(
              METADATA_SCHEMA,
              new CreateMasterEditionArgs({ maxSupply: new BN(0) })
            )
          )
        ),
      ];

      await sendTransactionWithRetry(
        this.player.client.provider.connection,
        (this.player.client.provider as AnchorProvider).wallet,
        instructions,
        [keypair],
        "single"
      );
      realCollectionMint = keypair.publicKey;
    } else {
      realCollectionMint = existingCollectionForItems;
    }

    console.log("Writing out collection to save area.");

    await writeOutState(
      JSON.stringify({
        ...args,
        existingCollectionForItems: realCollectionMint.toBase58(),
      })
    );
  }

  async createItemClasses(args: PlayerizeArgs) {
    const {
      itemClassLookup,
      existingCollectionForItems,
      itemImageFile,
      itemsWillBeSFTs,
      itemIndex,
      writeToImmutableStorage,
      writeOutState,
    } = args;

    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    const mints = await this.getMints(args);

    console.log(
      "Now let's make some f-in item classes. Item collection mint:",
      existingCollectionForItems.toBase58()
    );

    const mint = mints[0];
    console.log("Grabbing a single mint to grab royalties...");
    const metadata = await getMetadata(mint);
    const metadataAccount =
      await this.player.client.provider.connection.getAccountInfo(metadata);
    const metadataObj = decodeMetadata(metadataAccount.data);
    const royalties = metadataObj.data.creators?.map(
      (c) =>
        new Creator({
          address: c.address,
          verified: c.verified,
          share: c.share,
        })
    );

    const layers = Object.keys(itemClassLookup);
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const traits = Object.keys(itemClassLookup[layer]);
      for (let j = 0; j < traits.length; j++) {
        const trait = traits[j];

        let itemMint: string =
          itemClassLookup[layer][trait].existingClassDef?.mint;

        if (!itemMint) {
          console.log(`Trait ${trait} doesn't exist. Creating NFT.`);
          console.log("Uploading trait image to web3 storage");
          const upload = await writeToImmutableStorage(
            itemImageFile[layer + "-" + trait]
          );
          console.log("Upload complete, pushing to chain", upload);
          const keypair = web3.Keypair.generate();
          const ata = (await getAtaForMint(keypair.publicKey, wallet))[0];
          const instructions = [
            web3.SystemProgram.createAccount({
              fromPubkey: (this.player.client.provider as AnchorProvider).wallet
                .publicKey,
              newAccountPubkey: keypair.publicKey,
              space: MintLayout.span,
              lamports:
                await this.player.client.provider.connection.getMinimumBalanceForRentExemption(
                  MintLayout.span
                ),
              programId: TOKEN_PROGRAM_ID,
            }),
            await Token.createInitMintInstruction(
              TOKEN_PROGRAM_ID,
              keypair.publicKey,
              0,
              wallet,
              wallet
            ),
            createAssociatedTokenAccountInstruction(
              ata,
              wallet,
              wallet,
              keypair.publicKey
            ),
            Token.createMintToInstruction(
              TOKEN_PROGRAM_ID,
              keypair.publicKey,
              ata,
              wallet,
              [],
              1
            ),
            createMetadataInstruction(
              await getMetadata(keypair.publicKey),
              keypair.publicKey,
              wallet,
              wallet,
              wallet,
              Buffer.from(
                serialize(
                  METADATA_SCHEMA,
                  new CreateMetadataArgs({
                    data: {
                      name: trait,
                      symbol: null,
                      uri: upload,
                      sellerFeeBasisPoints:
                        metadataObj.data.sellerFeeBasisPoints,
                      creators: royalties,
                      collection: new Collection({
                        verified: 1,
                        key: existingCollectionForItems.toBase58(),
                      }),
                      uses: null,
                    },
                    isMutable: true,
                  })
                )
              )
            ),
            ...(itemsWillBeSFTs
              ? []
              : [
                  createMasterEditionInstruction(
                    await getMetadata(keypair.publicKey),
                    await getEdition(keypair.publicKey),
                    keypair.publicKey,
                    wallet,
                    wallet,
                    wallet,
                    Buffer.from(
                      serialize(
                        METADATA_SCHEMA,
                        new CreateMasterEditionArgs({ maxSupply: null })
                      )
                    )
                  ),
                ]),
          ];

          await sendTransactionWithRetry(
            this.player.client.provider.connection,
            (this.player.client.provider as AnchorProvider).wallet,
            instructions,
            [keypair],
            "single"
          );
          console.log(
            "Pushed item to chain with mint",
            keypair.publicKey.toBase58()
          );
          itemMint = keypair.publicKey.toBase58();
        }

        itemClassLookup[layer][trait].existingClassDef ||= {
          data: {
            settings: {
              freeBuild: {
                boolean: true,
                inherited: { notInherited: true },
              },
              childrenMustBeEditions: {
                boolean: true,
                inherited: { notInherited: true },
              },
              builderMustBeHolder: {
                boolean: true,
                inherited: { notInherited: true },
              },
              updatePermissiveness: [
                {
                  permissivenessType: { updateAuthority: true },
                  inherited: { notInherited: true },
                },
              ],
              buildPermissiveness: [
                {
                  permissivenessType: { updateAuthority: true },
                  inherited: { notInherited: true },
                },
              ],
              stakingWarmUpDuration: null,
              stakingCooldownDuration: null,
              stakingPermissiveness: null,
              unstakingPermissiveness: null,
              childUpdatePropagationPermissiveness: [],
            },
            config: {
              usageRoot: null,
              usageStateRoot: null,
              componentRoot: null,
              usages: [
                {
                  index: 0,
                  basicItemEffects: null,
                  usagePermissiveness: [{ tokenHolder: true }],
                  inherited: { notInherited: true },
                  validation: null,
                  callback: null,
                  itemClassType: {
                    wearable: {
                      bodyPart: [layer],
                      limitPerPart: 1,
                    },
                  },
                },
              ],
              components: [],
            },
          },
          metadataUpdateAuthority: null,
          storeMint: true,
          storeMetadataFields: true,
          mint: itemMint,
          index: itemIndex,
          updatePermissivenessToUse: { updateAuthority: true },
          namespaceRequirement: 1,
          totalSpaceBytes: 300,
        };

        const existingClass = itemClassLookup[layer][trait].existingClassDef;

        console.log(
          `Storing class def for ${itemMint} to config storage before attempting to update on chain in case that breaks so we don't lose the mint key.`
        );
        await writeOutState(
          JSON.stringify({
            ...this.turnToConfig(args),
            itemClassLookup: {
              ...itemClassLookup,
              [layer]: {
                ...itemClassLookup[layer],
                [trait]: {
                  existingClassDef: existingClass,
                  address: itemClassLookup[layer][trait].address,
                },
              },
            },
          })
        );

        try {
          await this.item.fetchItemClass(new PublicKey(itemMint), itemIndex);
          console.log("Item Class exists, updating");
          await this.item.updateItemClass(
            {
              classIndex: new BN(existingClass.index),
              updatePermissivenessToUse:
                existingClass.updatePermissivenessToUse,
              itemClassData: existingClass.data,
              parentClassIndex: null,
            },
            {
              itemMint: new web3.PublicKey(existingClass.mint),
              parent: null,
              parentMint: null,
              metadataUpdateAuthority: wallet,
            },
            {
              permissionless: false,
            }
          );
        } catch (e) {
          console.error(e);
          console.log("ItemClass does not exist, creating");

          await this.item.createItemClass(
            {
              classIndex: new BN(existingClass.index),
              parentClassIndex: null,
              space: new BN(existingClass.totalSpaceBytes),
              desiredNamespaceArraySize: existingClass.namespaceRequirement,
              updatePermissivenessToUse:
                existingClass.updatePermissivenessToUse,
              storeMint: existingClass.storeMint,
              storeMetadataFields: existingClass.storeMetadataFields,
              itemClassData: existingClass.data,
              parentOfParentClassIndex: null,
            },
            {
              itemMint: new web3.PublicKey(existingClass.mint),
              parent: null,
              parentMint: null,
              parentOfParentClass: null,
              parentOfParentClassMint: null,
              metadataUpdateAuthority: wallet,
              parentUpdateAuthority: null,
            },
            {}
          );
        }

        if (itemsWillBeSFTs) {
          console.log(
            `Because items will be SFTs, we need to demarcate this decimals=0, supply unlimited mint as an Item as well as an ItemClass. We will fetch the item to see if it exists, if it does not, we will create it.`
          );
          try {
            await this.item.client.account.item.fetch(
              (
                await getItemPDA(
                  new web3.PublicKey(existingClass.mint),
                  existingClass.index.add(1)
                )
              )[0]
            );
            console.log(
              "This item pda already exists. Let's just update it to make sure its in sync."
            );
            await this.item.updateItem(
              {
                index: existingClass.index.add(1),
                classIndex: existingClass.index,
                itemMint: new web3.PublicKey(existingClass.mint),
                itemClassMint: new web3.PublicKey(existingClass.mint),
              },
              {},
              {}
            );
          } catch (e) {
            console.error(e);
            console.log(
              "This item pda hasnt been made yet. We will make it now. Creating item escrow..."
            );

            const ata = (
              await getAtaForMint(
                new web3.PublicKey(existingClass.mint),
                wallet
              )
            )[0];

            try {
              await this.item.createItemEscrow(
                {
                  classIndex: existingClass.index,
                  craftEscrowIndex: new BN(0),
                  componentScope: "none",
                  buildPermissivenessToUse:
                    existingClass.updatePermissivenessToUse,
                  namespaceIndex: null,
                  itemClassMint: new web3.PublicKey(existingClass.mint),
                  amountToMake: new BN(1),
                  parentClassIndex: null,
                },
                {
                  newItemMint: new web3.PublicKey(existingClass.mint),
                  newItemToken: ata,
                  newItemTokenHolder: wallet,
                  parentMint: null,
                  itemClassMint: new web3.PublicKey(existingClass.mint),
                  metadataUpdateAuthority: wallet,
                },
                {}
              );
            } catch (e) {
              console.error(e);
              console.log(
                "Caught this error with item escrow creation. Attempting next step anyway."
              );
            }
            console.log("Attempting to start the build phase of the escrow.");
            try {
              await this.item.startItemEscrowBuildPhase(
                {
                  classIndex: existingClass.index,
                  craftEscrowIndex: new BN(0),
                  componentScope: "none",
                  buildPermissivenessToUse:
                    existingClass.updatePermissivenessToUse,
                  newItemMint: new web3.PublicKey(existingClass.mint),
                  itemClassMint: new web3.PublicKey(existingClass.mint),
                  amountToMake: new BN(1),
                  originator: wallet,
                  totalSteps: null,
                  endNodeProof: null,
                  parentClassIndex: null,
                },
                {
                  newItemToken: ata,
                  newItemTokenHolder: wallet,
                  parentMint: null,
                  itemClassMint: new web3.PublicKey(existingClass.mint),
                  metadataUpdateAuthority: wallet,
                },
                {}
              );
            } catch (e) {
              console.error(e);
              console.log(
                "Caught this error with item escrow build phase start. Attempting next step anyway."
              );
            }

            console.log("Attempting to end the build phase of the escrow.");
            try {
              await this.item.completeItemEscrowBuildPhase(
                {
                  classIndex: existingClass.index,
                  craftEscrowIndex: new BN(0),
                  componentScope: "none",
                  buildPermissivenessToUse:
                    existingClass.updatePermissivenessToUse,
                  itemClassMint: new web3.PublicKey(existingClass.mint),
                  amountToMake: new BN(1),
                  originator: wallet,
                  parentClassIndex: null,
                  newItemIndex: existingClass.index.add(1),
                  space: new BN(250),
                  storeMint: true,
                  storeMetadataFields: true,
                },
                {
                  newItemToken: ata,
                  newItemTokenHolder: wallet,
                  parentMint: null,
                  itemClassMint: new web3.PublicKey(existingClass.mint),
                  metadataUpdateAuthority: wallet,
                  newItemMint: new PublicKey(existingClass.mint),
                },
                {}
              );
            } catch (e) {
              console.error(e);
              console.log(
                "Caught this error with item escrow build phase end. Attempting next step anyway."
              );
            }

            console.log("Attempting to drain the escrow.");
            try {
              await this.item.drainItemEscrow(
                {
                  classIndex: existingClass.index,
                  craftEscrowIndex: new BN(0),
                  componentScope: "none",
                  itemClassMint: new web3.PublicKey(existingClass.mint),
                  amountToMake: new BN(1),
                  parentClassIndex: null,
                  newItemMint: new PublicKey(existingClass.mint),
                  newItemToken: ata,
                },
                {
                  originator: wallet,
                },
                {}
              );
            } catch (e) {
              console.error(e);
              console.log(
                "Caught this error with item escrow build phase drain. Attempting next step anyway."
              );
            }
          }
        }

        console.log(
          `Done update/create for item class ${itemMint}. Writing to config storage.`
        );
        await writeOutState(
          JSON.stringify({
            ...this.turnToConfig(args),
            itemClassLookup: {
              ...itemClassLookup,
              [layer]: {
                ...itemClassLookup[layer],
                [trait]: {
                  existingClassDef: existingClass,
                  address: (
                    await getItemPDA(
                      new web3.PublicKey(existingClass.mint),
                      existingClass.index
                    )
                  )[0].toBase58(),
                },
              },
            },
          })
        );
      }
    }
  }

  async createNamespace(args: PlayerizeArgs) {
    const { namespaceName, collectionMint } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    if (!collectionMint) throw new Error("Needs to be a collection mint!");
    console.log("Checking if there is a namespace.");

    try {
      this.namespace.fetchNamespace((await getNamespacePDA(collectionMint))[0]);
    } catch (e) {
      console.error(e);
      console.log("Okay, none found. Creating the namespace.");
      await this.namespace.initializeNamespace(
        {
          desiredNamespaceArraySize: new BN(1),
          uuid: randomUUID(),
          prettyName: config.prettyName,
          permissivenessSettings: config.permissivenessSettings,
          whitelistedStakingMints: whitelistedStakingMints,
        },
        {
          mint: new web3.PublicKey(config.mint),
          metadata: new web3.PublicKey(config.metadata),
          masterEdition: new web3.PublicKey(config.masterEdition),
        }
      );
    }
  }

  async createPlayers(args: PlayerizeArgs) {
    const {
      scope: { type, values },
      itemClassLookup,
      collectionMint,
      index,
      itemsName,
      writeToImmutableStorage,
      writeOutState,
    } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    let realCollectionMint;

    const mints = await this.getMints(args);

    for (let i = 0; i < mints.length; i++) {
      console.log(
        `Doing ${i} of ${mints.length} which is ${mints[i].toBase58()}`
      );
      const mint = mints[i];
      const playerPDA = (await getPlayerPDA(mint, index))[0];
      try {
        const player = await this.player.client.account.player.fetch(playerPDA);
      } catch (e) {
        console.error(e);
        console.log("Player doesnt exist. Creating player.");
      }
    }
  }
}
