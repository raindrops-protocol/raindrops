import { AnchorProvider, BN, web3 } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import * as Utils from "../utils";
import { getEdition } from "../utils/pda";
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
import { sendTransactionWithRetry, sleep } from "../utils/transactions";
import { PlayerProgram } from "./player";
import { ItemProgram } from "./item";
import { createAssociatedTokenAccountInstruction } from "../utils/ata";
import { NamespaceProgram } from "./namespace";
import { RAIN_PAYMENT_AMOUNT } from "../constants/player";
const {
  PDA: { getAtaForMint, getItemPDA, getMetadata, getPlayerPDA },
} = Utils;

export enum Scope {
  Mint,
  CandyMachine,
  Collection,
}

export enum MintState {
  NotBuilt,
  Built,
  Set,
  Loaded,
  FullyLoadedAndEquipped,
}
export interface BootUpArgs {
  scope: {
    type: Scope;
    values: PublicKey[];
  };
  playerStates: Record<
    string,
    {
      state: MintState;
      itemsAdded: string[];
      itemsMinted: string[];
      itemsEquipped: string[];
    }
  >;
  // These traits will become bodyparts
  bodyPartLayers: string[];
  // These traits will become enums
  enumerableLayers: string[];
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
  writeToImmutableStorage: (f: Buffer, name: string) => Promise<string>;
  writeOutState: (f: any) => Promise<void>;
  env: string;
}

export class BootUp {
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

  async createMainNFTClass(args: BootUpArgs) {
    const {
      // These traits will become bodyparts
      bodyPartLayers,
      // These traits will become enums
      enumerableLayers,
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
            ...enumerableLayers.map((s, i) => ({
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
          bodyParts: bodyPartLayers.map((b, i) => ({
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
        (newBasicStats.length + enumerableLayers.length) *
          (2 + 25 + 8 * 5 + 1) +
        bodyPartLayers.length * (2 + 25 + 9 + 1) +
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

    await writeOutState({
      ...this.turnToConfig(args),
      existingClassDef: classDef,
    });
  }

  turnToConfig(args: BootUpArgs) {
    return {
      scope: {
        type: args.scope.type,
        values: args.scope.values.map((s) => s.toBase58()),
      },
      // These traits will become bodyparts
      bodyPartLayers: args.bodyPartLayers,
      // These traits will become enums
      enumerableLayers: args.enumerableLayers,
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
      playerStates: args.playerStates,
    };
  }

  async getMints(args: BootUpArgs): Promise<PublicKey[]> {
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

  async createItemCollection(args: BootUpArgs) {
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
      const traits = Object.keys(itemClassLookup[layers[0]]).sort();
      const firstUpload = await writeToImmutableStorage(
        itemImageFile[layers[0] + "-" + traits[0]],
        layers[0] + "-" + traits[0] + ".png"
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

    await writeOutState({
      ...args,
      existingCollectionForItems: realCollectionMint.toBase58(),
    });
  }

  async createItemClasses(args: BootUpArgs) {
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
            itemImageFile[layer + "-" + trait],
            layer + "-" + trait + ".png"
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
        await writeOutState({
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
        });

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
        await writeOutState({
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
        });
      }
    }
  }

  async createPlayers(args: BootUpArgs) {
    const {
      existingClassDef,
      index,
      itemIndex,
      enumerableLayers,
      bodyPartLayers,
      newBasicStats,
      itemClassLookup,
      itemsWillBeSFTs,
      playerStates,
      writeOutState,
      env,
    } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    const mints = await this.getMints(args);

    for (let i = 0; i < mints.length; i++) {
      console.log(
        `Doing ${i} of ${mints.length} which is ${mints[i].toBase58()}`
      );
      const mint = mints[i];
      const playerPDA = (await getPlayerPDA(mint, index))[0];
      const metadata = await getMetadata(mint);
      const metadataAccount =
        await this.player.client.provider.connection.getAccountInfo(metadata);
      const metadataObj = decodeMetadata(metadataAccount.data);
      console.log("Grabbed metadata obj.");
      const json = (await fetch(metadataObj.data.uri)) as any;
      console.log("Fetched ", metadataObj.data.uri);

      if (
        playerStates[mint.toBase58()].state == MintState.FullyLoadedAndEquipped
      ) {
        await this.player.client.account.player.fetch(playerPDA);
        console.log(
          "Player exists and is in it's final state already. Updating player permissionlessly."
        );
        await (
          await this.player.updatePlayer(
            {
              index: index,
              classIndex: index,
              updatePermissivenessToUse:
                existingClassDef.updatePermissivenessToUse,
              playerClassMint: new web3.PublicKey(existingClassDef.mint),
              playerMint: mint,
              newData: null,
            },
            {
              metadataUpdateAuthority: wallet,
            },
            {
              permissionless: true,
            }
          )
        ).rpc();
      } else {
        console.log(
          `Player for mint ${mint} is in state ${
            playerStates[mint.toBase58()]?.state || MintState.NotBuilt
          }`
        );

        if (!playerStates[mint.toBase58()]) {
          playerStates[mint.toBase58()] = {
            state: MintState.NotBuilt,
            itemsAdded: [],
            itemsMinted: [],
            itemsEquipped: [],
          };
          await writeOutState({ ...this.turnToConfig(args), playerStates });
        }

        if (playerStates[mint.toBase58()].state == MintState.NotBuilt) {
          console.log("First we need to mint tokens for the body part traits.");
          for (
            let i = playerStates[mint.toBase58()].itemsMinted.length;
            i < bodyPartLayers.length;
            i++
          ) {
            const myValue = json.attributes.find(
              (a) => a.trait_type == bodyPartLayers[i]
            ).value;
            const itemClassMint = new web3.PublicKey(
              itemClassLookup[bodyPartLayers[i]][myValue].existingClassDef.mint
            );

            const instructions = [];
            if (itemsWillBeSFTs) {
              const ata = (await getAtaForMint(itemClassMint, wallet))[0];
              instructions.push(
                Token.createMintToInstruction(
                  TOKEN_PROGRAM_ID,
                  itemClassMint,
                  ata,
                  wallet,
                  [],
                  1
                )
              );
            } else {
              throw new Error(
                "No support for creating NFT items yet. You need to first create the NFT that is a child edition of the mint variable, then go through the escrow build process for item. Given this does not match our current business model, we will revisit soon! Why not try SFTs instead? They are more cost effective. NFT Items are only sensible for stateful items!"
              );
            }

            await sendTransactionWithRetry(
              this.player.client.provider.connection,
              (this.player.client.provider as AnchorProvider).wallet,
              instructions,
              [],
              "single"
            );
            console.log(
              `Minted ${itemClassMint.toBase58()}, for layer ${
                bodyPartLayers[i]
              } which is a ${myValue}`
            );
            playerStates[mint.toBase58()].itemsMinted.push(
              itemClassMint.toBase58()
            );

            await writeOutState({ ...this.turnToConfig(args), playerStates });
          }
        }

        if (
          playerStates[mint.toBase58()].itemsMinted.length !=
          bodyPartLayers.length
        ) {
          throw new Error(
            "At this stage, items minted should equal number of body part layers."
          );
        }

        if (playerStates[mint.toBase58()].state == MintState.NotBuilt) {
          console.log(
            "Now that we have the tokens, we need to build the player."
          );
          const tokenOwner =
            await this.player.client.provider.connection.getTokenLargestAccounts(
              mint
            )[0];
          console.log(
            "The token owner of this mint is ",
            tokenOwner.toBase58()
          );
          await (
            await this.player.buildPlayer(
              {
                newPlayerIndex: index,
                parentClassIndex: null,
                classIndex: index,
                buildPermissivenessToUse:
                  existingClassDef.updatePermissivenessToUse,
                playerClassMint: new web3.PublicKey(existingClassDef.mint),
                space: new BN(existingClassDef.totalSpaceBytes),
                storeMint: existingClassDef.storeMint,
                storeMetadataFields: existingClassDef.storeMetadataFields,
              },
              {
                parentMint: null,
                metadataUpdateAuthority: wallet,
                newPlayerMint: mint,
                newPlayerToken: (await getAtaForMint(mint, tokenOwner))[0],
                newPlayerTokenHolder: tokenOwner,
              },
              {
                rainAmount:
                  env == "mainnet-beta"
                    ? new BN(RAIN_PAYMENT_AMOUNT)
                    : new BN(0),
              }
            )
          ).rpc();

          playerStates[mint.toBase58()].state = MintState.Built;
          await writeOutState({ ...this.turnToConfig(args), playerStates });
        }

        if (playerStates[mint.toBase58()].state == MintState.Built) {
          console.log("Built player. Time to update it.");

          await (
            await this.player.updatePlayer(
              {
                index: index,
                classIndex: index,
                updatePermissivenessToUse:
                  existingClassDef.updatePermissivenessToUse,
                playerClassMint: new web3.PublicKey(existingClassDef.mint),
                playerMint: mint,
                newData: {
                  //@ts-ignore,
                  statsUri: player.data.statsUri,
                  //@ts-ignore,
                  category: player.data.category,
                  //@ts-ignore,
                  basicStats: [
                    //@ts-ignore
                    ...player.basicStats.slice(0, newBasicStats.length),
                    ...enumerableLayers.map((l, i) => ({
                      index: newBasicStats.length + i,
                      state: {
                        enum: {
                          current: Object.keys(itemClassLookup[l])
                            .sort()
                            .findIndex(
                              (s) =>
                                s ==
                                json.attributes.find((a) => a.trait_type == l)
                                  .value
                            ),
                        },
                      },
                    })),
                  ],
                },
              },
              {
                metadataUpdateAuthority: wallet,
              },
              {
                permissionless: false,
              }
            )
          ).rpc();

          playerStates[mint.toBase58()].state = MintState.Set;
          await writeOutState({ ...this.turnToConfig(args), playerStates });
        }

        if (playerStates[mint.toBase58()].state == MintState.Set) {
          console.log(
            "Now that we have updated it, time to add stuff to the backpack."
          );
          for (
            let i = playerStates[mint.toBase58()].itemsAdded.length;
            i < bodyPartLayers.length;
            i++
          ) {
            const myValue = json.attributes.find(
              (a) => a.trait_type == bodyPartLayers[i]
            ).value;
            const itemClassMint = new web3.PublicKey(
              itemClassLookup[bodyPartLayers[i]][myValue].existingClassDef.mint
            );
            console.log(
              `Adding item of class mint ${itemClassMint.toBase58()}, which represents ${
                bodyPartLayers[i]
              }`
            );

            if (itemsWillBeSFTs) {
              await (
                await this.player.addItem(
                  {
                    index: index,
                    addItemPermissivenessToUse:
                      existingClassDef.updateItemPermissivenessToUse,
                    playerMint: mint,
                    amount: new BN(1),
                    itemIndex,
                  },
                  {
                    itemMint: itemClassMint,
                    metadataUpdateAuthority: wallet,
                  },
                  {
                    itemProgram: this.item,
                    playerClassMint: new web3.PublicKey(existingClassDef.mint),
                    itemClassMint: itemClassMint,
                  }
                )
              ).rpc();
            } else {
              throw new Error(
                "This is not supported yet. You'll need to transfer one NFT of this type over to the player."
              );
            }

            playerStates[mint.toBase58()].itemsAdded.push(
              itemClassMint.toBase58()
            );

            await writeOutState({ ...this.turnToConfig(args), playerStates });
          }
        }

        if (
          playerStates[mint.toBase58()].itemsMinted.length !=
          playerStates[mint.toBase58()].itemsAdded.length
        ) {
          throw new Error(
            "At this stage, items minted should equal number of items added."
          );
        }

        if (playerStates[mint.toBase58()].state == MintState.Set) {
          console.log(
            "Performing a check with 5s interval to see if the items added on chain match what we think we have. We cannot proceed until we know for sure."
          );
          let player;
          let tries = 0;
          do {
            player = await this.player.client.account.player.fetch(playerPDA);
            tries++;
            console.log("Try #1.");
            if (
              (player.itemsInBackpack as BN).toNumber() <
              playerStates[mint.toBase58()].itemsAdded.length
            )
              await sleep(5000);
          } while (
            (player.itemsInBackpack as BN).toNumber() <
              playerStates[mint.toBase58()].itemsAdded.length &&
            tries < 3
          );

          if (tries >= 3) {
            throw new Error(
              `Failed to add items, mint ${mint} cannot move forward`
            );
          } else {
            playerStates[mint.toBase58()].state = MintState.Loaded;
            await writeOutState({ ...this.turnToConfig(args), playerStates });
          }
        }

        if (playerStates[mint.toBase58()].state == MintState.Loaded) {
          console.log(
            "Now that we have updated it, time to equip stuff in the backpack."
          );
          for (
            let i = playerStates[mint.toBase58()].itemsAdded.length;
            i < bodyPartLayers.length;
            i++
          ) {
            const myValue = json.attributes.find(
              (a) => a.trait_type == bodyPartLayers[i]
            ).value;
            const itemClassMint = new web3.PublicKey(
              itemClassLookup[bodyPartLayers[i]][myValue].existingClassDef.mint
            );
            console.log(
              `Equipping item of class mint ${itemClassMint.toBase58()}, which represents ${
                bodyPartLayers[i]
              }`
            );

            if (itemsWillBeSFTs) {
              await (
                await this.player.toggleEquipItem(
                  {
                    index: index,
                    playerMint: mint,
                    amount: new BN(1),
                    itemIndex,
                    itemMint: itemClassMint,
                    itemClassMint: itemClassMint,
                    equipping: true,
                    bodyPartIndex: i,
                    equipItemPermissivenessToUse:
                      existingClassDef.updatePermissivenessToUse,
                    itemUsageIndex: 0,
                    itemUsageProof: null,
                    itemUsage: null,
                  },
                  {
                    metadataUpdateAuthority: wallet,
                  },
                  {
                    itemProgram: this.item,
                    playerClassMint: new web3.PublicKey(existingClassDef.mint),
                  }
                )
              ).rpc();
            } else {
              throw new Error("This is not supported yet.");
            }

            playerStates[mint.toBase58()].itemsEquipped.push(
              itemClassMint.toBase58()
            );

            await writeOutState({ ...this.turnToConfig(args), playerStates });
          }
        }

        if (
          playerStates[mint.toBase58()].itemsAdded.length !=
          playerStates[mint.toBase58()].itemsEquipped.length
        ) {
          throw new Error(
            "At this stage, items added should equal number of items equipped."
          );
        }

        if (playerStates[mint.toBase58()].state == MintState.Loaded) {
          console.log(
            "Performing a check with 5s interval to see if the items equipped on chain match what we think we have. We cannot proceed until we know for sure."
          );
          let player;
          let tries = 0;
          do {
            player = await this.player.client.account.player.fetch(playerPDA);
            tries++;
            console.log("Try #1.");
            if (
              player.equippedItems.length <
              playerStates[mint.toBase58()].itemsEquipped.length
            )
              await sleep(5000);
          } while (
            player.equippedItems.length <
              playerStates[mint.toBase58()].itemsEquipped.length &&
            tries < 3
          );

          if (tries >= 3) {
            throw new Error(
              `Failed to equip items, mint ${mint} cannot move forward`
            );
          } else {
            playerStates[mint.toBase58()].state =
              MintState.FullyLoadedAndEquipped;
            await writeOutState({ ...this.turnToConfig(args), playerStates });
          }
        }

        console.log(
          `Player for mint ${mint} is in it's final state and ready to go.`
        );
      }
    }
  }
}
