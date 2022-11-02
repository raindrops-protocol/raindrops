import { AnchorProvider, BN, web3 } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import * as Utils from "../utils";
import { getEdition } from "../utils/pda";
import {
  createMasterEditionInstruction,
  createMetadataInstruction,
  createVerifyCollectionInstruction,
} from "../utils/tokenMetadata/instructions";
import {
  AccountLayout,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
  u64,
} from "@solana/spl-token";
import { serialize } from "borsh";
import {
  Collection,
  CreateMasterEditionArgs,
  CreateMetadataArgs,
  Creator,
  DataV2,
  decodeMetadata,
  METADATA_SCHEMA,
  VerifyCollectionArgs,
} from "../utils/tokenMetadata/schema";
import { sendTransactionWithRetry, sleep } from "../utils/transactions";
import { PlayerProgram } from "./player";
import { ItemProgram } from "./item";
import { createAssociatedTokenAccountInstruction } from "../utils/ata";
import { NamespaceProgram } from "./namespace";
import { RAIN_PAYMENT_AMOUNT } from "../constants/player";
import { getAccountsByFirstCreatorAddress } from "../utils/candyMachine";
import { getAccountsByCollectionAddress } from "../utils/collection";
import axios from "axios";
const {
  PDA: {
    getAtaForMint,
    getItemPDA,
    getMetadata,
    getPlayerPDA,
    getPlayerItemAccount,
  },
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
  stringLayers: string[];
  newBasicStats: any[];
  itemsWillBeSFTs: boolean;
  className: string;
  redoFailures: boolean;
  namespaceName: string;
  allowTokenHolder: boolean;
  skipUpdates: boolean;
  runDuplicateChecks: boolean;
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
  existingItemClassDef: any;
  itemsName: string;
  existingCollectionForItems: PublicKey | null;
  writeToImmutableStorage: (
    f: Buffer,
    name: string,
    creators: { address: string; share: number }[]
  ) => Promise<string>;
  writeOutState: (f: any) => Promise<void>;
  env: string;
  reloadPlayer: () => Promise<PlayerProgram>;
}

async function fetch(uri: string) {
  return (
    await axios({
      method: "get",
      url: uri,
    })
  ).data;
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

  createItemLookupKey(layer: string, trait: string): string {
    return (layer + "-" + trait + ".png")
      .replace(new RegExp(/\s+/g), "_")
      .replace("|", "")
      .replace(":", "")
      .replace("/", ":");
  }

  async createMainNFTClass(args: BootUpArgs) {
    const {
      // These traits will become bodyparts
      bodyPartLayers,
      // These traits will become enums
      stringLayers,
      newBasicStats,
      className,
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
            ...stringLayers.map((s, i) => ({
              index: i + newBasicStats.length,
              name: s,
              inherited: { notInherited: true },
              statType: {
                string: {
                  starting: "unset",
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
        (newBasicStats.length + stringLayers.length) * (2 + 25 + 8 * 5 + 1) +
        bodyPartLayers.length * (2 + 25 + 9 + 1) +
        100,
    };

    try {
      await this.player.fetchPlayerClass(collectionMint, index);
      console.log("Updating player class");
      await (
        await this.player.updatePlayerClass(
          {
            classIndex: index,
            parentClassIndex: null,
            updatePermissivenessToUse: classDef.updatePermissivenessToUse,
            playerClassData: classDef.data,
          },
          {
            playerMint: new web3.PublicKey(classDef.mint),
            parent: null,
            parentMint: null,
            metadataUpdateAuthority: wallet,
          },
          {
            permissionless: false,
          }
        )
      ).rpc();
    } catch (e) {
      console.error(e);
      console.log("Player Class not found.");
      await (
        await this.player.createPlayerClass(
          {
            classIndex: index,
            parentClassIndex: null,
            space: new BN(classDef.totalSpaceBytes),
            desiredNamespaceArraySize: classDef.namespaceRequirement,
            updatePermissivenessToUse: classDef.updatePermissivenessToUse,
            storeMint: classDef.storeMint,
            storeMetadataFields: classDef.storeMetadataFields,
            playerClassData: classDef.data,
            parentOfParentClassIndex: null,
          },
          {
            playerMint: new web3.PublicKey(classDef.mint),
            parent: null,
            parentMint: null,
            parentOfParentClassMint: null,
            metadataUpdateAuthority: wallet,
            parentUpdateAuthority: null,
          },
          {}
        )
      ).rpc();
    }

    classDef.data.config.bodyParts.forEach((b) => {
      if (b.totalItemSpots.toNumber)
        b.totalItemSpots = b.totalItemSpots.toNumber();
    });
    if (classDef.index.toNumber) classDef.index = classDef.index.toNumber();

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
      stringLayers: args.stringLayers,
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
      existingItemClassDef: args.existingItemClassDef,
      skipUpdates: args.skipUpdates,
      runDuplicateChecks: args.runDuplicateChecks,
      redoFailures: args.redoFailures,
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
      for (let i = 0; i < values.length; i++) {
        mints.push(
          ...(
            await getAccountsByCollectionAddress(
              values[i],
              this.player.client.provider.connection
            )
          ).map((m) => new PublicKey(m[0].mint))
        );
      }
    } else if (type == Scope.CandyMachine) {
      for (let i = 0; i < values.length; i++) {
        mints.push(
          ...(
            await getAccountsByFirstCreatorAddress(
              values[i],
              this.player.client.provider.connection
            )
          ).map((m) => new PublicKey(m[0].mint))
        );
      }
    }
    return mints;
  }

  async createItemCollection(args: BootUpArgs) {
    const {
      scope: { type, values },
      itemClassLookup,
      existingCollectionForItems,
      existingItemClassDef,
      bodyPartLayers,
      itemsName,
      itemImageFile,
      itemIndex,
      writeToImmutableStorage,
      writeOutState,
    } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    let realCollectionMint;

    const mints = await this.getMints(args);

    if (!existingCollectionForItems) {
      console.log("The collection doesn't exist. Uploading image.");

      const traits = Object.keys(itemClassLookup[bodyPartLayers[0]]).sort();

      const mint = mints[0];
      console.log("Grabbing a single mint to grab royalties...");
      const metadata = await getMetadata(mint);
      const metadataAccount =
        await this.player.client.provider.connection.getAccountInfo(metadata);
      const metadataObj = decodeMetadata(metadataAccount.data);
      const firstUpload = await writeToImmutableStorage(
        itemImageFile[this.createItemLookupKey(bodyPartLayers[0], traits[0])],
        itemsName,
        metadataObj.data.creators.map((c) => ({
          address: c.address,
          share: c.share,
        }))
      );
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
                data: new DataV2({
                  name: itemsName,
                  symbol: itemsName.substring(0, 4),
                  uri: firstUpload,
                  sellerFeeBasisPoints: 0,
                  creators: metadataObj.data.creators?.map(
                    (c) =>
                      new Creator({
                        address: c.address,
                        verified: c.address == wallet.toBase58() ? 1 : 0,
                        share: c.share,
                      })
                  ),
                  collection: null,
                  uses: null,
                }),
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
      args.existingCollectionForItems = realCollectionMint = keypair.publicKey;
    } else {
      console.log("Collection exists.");
      realCollectionMint = existingCollectionForItems;
    }

    console.log("Writing out collection to save area.");

    await writeOutState({
      ...args,
      existingCollectionForItems: realCollectionMint.toBase58(),
    });

    console.log("Checking to see if master item class exists.");
    const itemClass = existingItemClassDef || {
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
          childUpdatePropagationPermissiveness: [
            {
              childUpdatePropagationPermissivenessType: {
                updatePermissiveness: true,
              },
              inherited: { notInherited: true },
            },
            {
              childUpdatePropagationPermissivenessType: {
                buildPermissiveness: true,
              },
              inherited: { notInherited: true },
            },
            {
              childUpdatePropagationPermissivenessType: {
                builderMustBeHolderPermissiveness: true,
              },
              inherited: { notInherited: true },
            },
            {
              childUpdatePropagationPermissivenessType: {
                childrenMustBeEditionsPermissiveness: true,
              },
              inherited: { notInherited: true },
            },
            {
              childUpdatePropagationPermissivenessType: {
                freeBuildPermissiveness: true,
              },
              inherited: { notInherited: true },
            },
          ],
        },
        config: {
          usageRoot: null,
          usageStateRoot: null,
          componentRoot: null,
          usages: [],
          components: [],
        },
      },
      metadataUpdateAuthority: null,
      storeMint: true,
      storeMetadataFields: true,
      mint: realCollectionMint,
      index: itemIndex,
      updatePermissivenessToUse: { updateAuthority: true },
      namespaceRequirement: 1,
      totalSpaceBytes: 300,
    };

    const itemClassObj = await this.item.fetchItemClass(
      realCollectionMint,
      itemIndex
    );
    console.log("item index", realCollectionMint.toBase58());
    if (itemClassObj) {
      console.log("Master Item Class exists, updating");
      try {
        await this.item.updateItemClass(
          {
            classIndex: new BN(itemClass.index),
            updatePermissivenessToUse: itemClass.updatePermissivenessToUse,
            itemClassData: itemClass.data,
            parentClassIndex: null,
          },
          {
            itemMint: new web3.PublicKey(itemClass.mint),
            parent: null,
            parentMint: null,
            metadataUpdateAuthority: wallet,
          },
          {
            permissionless: false,
          }
        );
      } catch (e) {
        if (e.toString().match("Timed")) {
          console.log("Timeout detected but ignoring");
        } else {
          throw e;
        }
      }
    } else {
      console.log("Master ItemClass does not exist, creating");
      try {
        await this.item.createItemClass(
          {
            classIndex: new BN(itemClass.index),
            parentClassIndex: null,
            space: new BN(itemClass.totalSpaceBytes),
            desiredNamespaceArraySize: itemClass.namespaceRequirement,
            updatePermissivenessToUse: itemClass.updatePermissivenessToUse,
            storeMint: itemClass.storeMint,
            storeMetadataFields: itemClass.storeMetadataFields,
            itemClassData: itemClass.data,
            parentOfParentClassIndex: null,
          },
          {
            itemMint: new web3.PublicKey(itemClass.mint),
            parent: null,
            parentMint: null,
            parentOfParentClass: null,
            parentOfParentClassMint: null,
            metadataUpdateAuthority: wallet,
            parentUpdateAuthority: null,
          },
          {}
        );
      } catch (e) {
        if (e.toString().match("Timed")) {
          console.log("Timeout detected but ignoring");
        } else {
          throw e;
        }
      }
    }
    if (itemClass.index.toNumber) itemClass.index = itemClass.index.toNumber();
    console.log("Writing out master item class to save area.");

    await writeOutState({
      ...this.turnToConfig(args),
      existingItemClassDef: itemClass,
    });
  }

  async createItemClasses(args: BootUpArgs) {
    const {
      itemClassLookup,
      existingCollectionForItems,
      itemImageFile,
      existingItemClassDef,
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
          verified: c.address == wallet.toBase58() ? 1 : 0,
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
          const fileName = this.createItemLookupKey(layer, trait);
          console.log("Looking for ", fileName);
          const upload = await writeToImmutableStorage(
            itemImageFile[fileName],
            fileName,
            royalties.map((c) => ({ address: c.address, share: c.share }))
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
            ...(itemsWillBeSFTs
              ? []
              : [
                  Token.createMintToInstruction(
                    TOKEN_PROGRAM_ID,
                    keypair.publicKey,
                    ata,
                    wallet,
                    [],
                    1
                  ),
                ]),
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
                    data: new DataV2({
                      name: trait.slice(0, 25),
                      symbol: trait.slice(0, 4),
                      uri: upload,
                      sellerFeeBasisPoints:
                        metadataObj.data.sellerFeeBasisPoints,
                      creators: royalties,
                      collection: new Collection({
                        verified: 0,
                        key: existingCollectionForItems.toBase58(),
                      }),
                      uses: null,
                    }),
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
            createVerifyCollectionInstruction(
              await getMetadata(keypair.publicKey),
              wallet,
              wallet,
              existingCollectionForItems,
              await getMetadata(existingCollectionForItems),
              await getEdition(existingCollectionForItems),
              Buffer.from(
                serialize(METADATA_SCHEMA, new VerifyCollectionArgs())
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
          console.log(
            "Pushed item to chain with mint",
            keypair.publicKey.toBase58()
          );
          itemMint = keypair.publicKey.toBase58();
        }

        itemClassLookup[layer][trait].existingClassDef ||= {
          data: {
            settings: {
              freeBuild: null,
              childrenMustBeEditions: null,
              builderMustBeHolder: null,
              updatePermissiveness: [],
              buildPermissiveness: [],
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
                  usagePermissiveness: [{ updateAuthority: true }],
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
          parent: {
            index: new BN(existingItemClassDef.index),
            mint: existingItemClassDef.mint,
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

        const itemClassObj = await this.item.fetchItemClass(
          new PublicKey(itemMint),
          itemIndex
        );
        if (itemClassObj) {
          existingClass.data.config.usages.map(
            (u) =>
              (u.itemClassType.wearable.limitPerPart = parseInt(
                u.itemClassType.wearable.limitPerPart
              ))
          );
          console.log("Item Class exists, updating");
          try {
            await this.item.updateItemClass(
              {
                classIndex: new BN(existingClass.index),
                updatePermissivenessToUse:
                  existingClass.updatePermissivenessToUse,
                itemClassData: existingClass.data,
                parentClassIndex: new BN(existingItemClassDef.index),
              },
              {
                itemMint: new web3.PublicKey(existingClass.mint),
                parent: (
                  await getItemPDA(
                    new web3.PublicKey(existingItemClassDef.mint),
                    new BN(existingItemClassDef.index)
                  )
                )[0],
                parentMint: new web3.PublicKey(existingItemClassDef.mint),
                metadataUpdateAuthority: wallet,
              },
              {
                permissionless: false,
              }
            );
          } catch (e) {
            if (e.toString().match("Timed")) {
              console.log("Timeout detected but ignoring");
            } else {
              throw e;
            }
          }
        } else {
          console.log("ItemClass does not exist, creating");

          await this.item.createItemClass(
            {
              classIndex: new BN(existingClass.index),
              parentClassIndex: new BN(existingItemClassDef.index),
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
              parent: (
                await getItemPDA(
                  new web3.PublicKey(existingItemClassDef.mint),
                  new BN(existingItemClassDef.index)
                )
              )[0],
              parentMint: new web3.PublicKey(existingItemClassDef.mint),
              parentOfParentClass: null,
              parentOfParentClassMint: null,
              metadataUpdateAuthority: wallet,
              parentUpdateAuthority: wallet,
            },
            {}
          );
        }

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
                    new BN(existingClass.index)
                  )
                )[0].toBase58(),
              },
            },
          },
        });
      }
    }
  }

  async tryBuildPlayer(mint: PublicKey, args: BootUpArgs) {
    const { existingClassDef, index, bodyPartLayers, env } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;
    console.log("Now that we have the tokens, we need to build the player.");
    const token = (
      await this.player.client.provider.connection.getTokenLargestAccounts(mint)
    ).value[0].address;
    const tokenAcct =
      await this.player.client.provider.connection.getAccountInfo(token);
    const parsed = AccountLayout.decode(tokenAcct.data);
    const tokenOwner = new PublicKey(parsed.owner);
    console.log("The token owner of this mint is ", tokenOwner.toBase58());
    try {
      await (
        await this.player.buildPlayer(
          {
            newPlayerIndex: index,
            parentClassIndex: null,
            classIndex: index,
            buildPermissivenessToUse:
              existingClassDef.updatePermissivenessToUse,
            playerClassMint: new web3.PublicKey(existingClassDef.mint),
            space: new BN(existingClassDef.totalSpaceBytes).add(
              new BN(bodyPartLayers.length * 34)
            ),
            storeMint: existingClassDef.storeMint,
            storeMetadataFields: existingClassDef.storeMetadataFields,
          },
          {
            parentMint: null,
            metadataUpdateAuthority: wallet,
            newPlayerMint: mint,
            newPlayerToken: token,
            newPlayerTokenHolder: tokenOwner,
          },
          {
            rainAmount:
              env == "mainnet-beta" ? new BN(RAIN_PAYMENT_AMOUNT) : new BN(0),
          }
        )
      ).rpc();
    } catch (e) {
      if (e.toString().match("Timed")) {
        console.log("Timeout detected but ignoring");
      } else {
        console.log("Maybe player already built? Let's check.");
        let player = await this.player.client.account.player.fetch(
          (
            await getPlayerPDA(new web3.PublicKey(mint), new BN(index))
          )[0]
        );
        if (!player) {
          throw e;
        } else {
          console.log("Player exists!");
        }
      }
    }
  }

  async runDuplicateChecks(
    mint: PublicKey,
    json: any,
    player: any,
    args: BootUpArgs
  ) {
    const {
      existingClassDef,
      index,
      itemIndex,
      bodyPartLayers,
      itemClassLookup,
      itemsWillBeSFTs,
      playerStates,
    } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;
    console.log(
      "Running duplicate checks. Removing all copies of tokens recorded to be on itemsEquipped. Use this feature at your peril."
    );
    if (
      player.itemsInBackpack.toNumber() >
      playerStates[mint.toBase58()].itemsAdded.filter((i) => i != "NA").length
    ) {
      console.log(
        "!!!!!!! There is a mismatch",
        //@ts-ignore
        player.itemsInBackpack.toNumber(),
        " in backpack vs ",
        playerStates[mint.toBase58()].itemsAdded.filter((i) => i != "NA").length
      );
      for (let j = 0; j < bodyPartLayers.length; j++) {
        const myValue = json.attributes.find(
          (a) => a.trait_type == bodyPartLayers[j]
        )?.value;
        if (myValue && itemClassLookup[bodyPartLayers[j]][myValue]) {
          const itemClassMint = new web3.PublicKey(
            itemClassLookup[bodyPartLayers[j]][myValue].existingClassDef.mint
          );

          if (itemsWillBeSFTs) {
            let currBalance = 1;
            try {
              const player = (await getPlayerPDA(mint, index))[0];
              const item = (
                await getItemPDA(itemClassMint, itemIndex.add(new BN(1)))
              )[0];
              const playerAcct = (
                await getPlayerItemAccount({
                  item,
                  player,
                })
              )[0];
              currBalance = (
                await this.player.client.provider.connection.getTokenAccountBalance(
                  playerAcct
                )
              ).value.uiAmount;
            } catch (e) {
              console.error(e);
              console.log(
                "Failed to get token balance of player token acct, assuming 1"
              );
            }
            if (currBalance > 1) {
              console.log(
                `Removing item of class mint ${itemClassMint.toBase58()}, which represents ${
                  bodyPartLayers[j]
                }`
              );
              try {
                await (
                  await this.player.removeItem(
                    {
                      index: index,
                      removeItemPermissivenessToUse:
                        existingClassDef.updatePermissivenessToUse,
                      playerMint: mint,
                      amount: new BN(1),
                      itemIndex: itemIndex.add(new BN(1)), // item, not item class, so add 1 according to our convention
                    },
                    {
                      itemMint: itemClassMint, // for sfts, is the same
                      metadataUpdateAuthority: wallet,
                    },
                    {
                      itemProgram: this.item,
                      playerClassMint: new web3.PublicKey(
                        existingClassDef.mint
                      ),
                      itemClassMint: itemClassMint,
                    }
                  )
                ).rpc();
              } catch (e) {
                console.error(e);
                console.log(
                  "Does not appear this item is present in the backpack."
                );
              }
            } else {
              console.log(
                "Balance is ",
                currBalance,
                "which means no removal."
              );
            }
          } else {
            throw new Error("No support for NFTs yet");
          }
        }
      }
    } else {
      console.log("There is item match, no check to be done here.");
    }
  }

  async mintSFTTrait(
    itemClassMint: PublicKey,
    existingClass: any
  ): Promise<boolean> {
    let successful = false;

    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;
    const ata = (await getAtaForMint(itemClassMint, wallet))[0];
    let currBalance = 0;
    try {
      currBalance = (
        await this.player.client.provider.connection.getTokenAccountBalance(ata)
      ).value.uiAmount;
    } catch (e) {
      console.error(e);
      console.log("Need to make a new token account...");
      const instructions = [
        createAssociatedTokenAccountInstruction(
          ata,
          wallet,
          wallet,
          itemClassMint
        ),
      ];
      await sendTransactionWithRetry(
        this.player.client.provider.connection,
        (this.player.client.provider as AnchorProvider).wallet,
        instructions,
        [],
        "single"
      );
    }
    if (currBalance < 4) {
      try {
        await this.item.createItemEscrow(
          {
            classIndex: new BN(existingClass.index),
            craftEscrowIndex: new BN(0),
            componentScope: "none",
            buildPermissivenessToUse: existingClass.updatePermissivenessToUse,
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
        console.log("Ignoring on start item escrow");
      }
      console.log("Attempting to start the build phase of the escrow.");
      try {
        await this.item.startItemEscrowBuildPhase(
          {
            classIndex: new BN(existingClass.index),
            craftEscrowIndex: new BN(0),
            componentScope: "none",
            buildPermissivenessToUse: existingClass.updatePermissivenessToUse,
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
        console.log("Ignoring on start build phase");
      }

      console.log("Attempting to end the build phase of the escrow.");
      try {
        await this.item.completeItemEscrowBuildPhase(
          {
            classIndex: new BN(existingClass.index),
            craftEscrowIndex: new BN(0),
            componentScope: "none",
            buildPermissivenessToUse: existingClass.updatePermissivenessToUse,
            itemClassMint: new web3.PublicKey(existingClass.mint),
            amountToMake: new BN(1),
            originator: wallet,
            parentClassIndex: null,
            newItemIndex: new BN(existingClass.index).add(new BN(1)),
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
        console.log("Ignoring on end build phase ");
      }

      console.log("Attempting to drain the escrow.");
      try {
        await this.item.drainItemEscrow(
          {
            classIndex: new BN(existingClass.index),
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
        console.log("Ignoring on drain item escrow");
      }

      let tries = 0;
      console.log("Sleeping for 5s before beginning token check.");
      do {
        const ataAcct =
          await this.item.client.provider.connection.getAccountInfo(ata);
        const ataObj = AccountLayout.decode(ataAcct.data);
        const supply = u64.fromBuffer(ataObj.amount).toNumber();
        tries++;
        console.log(
          "Try",
          tries,
          " on checking mint balance after running item build. Starting bal: ",
          currBalance,
          " Ending bal:",
          supply
        );
        successful = supply > currBalance;
        if (!successful) await sleep(10000);
      } while (!successful && tries < 3);
    } else {
      // if currBalance >= 4, we have enough to deploy a token!
      successful = true;
    }
    return successful;
  }
  async createPlayers(args: BootUpArgs) {
    const {
      existingClassDef,
      index,
      itemIndex,
      stringLayers,
      bodyPartLayers,
      newBasicStats,
      itemClassLookup,
      itemsWillBeSFTs,
      playerStates,
      writeOutState,
      reloadPlayer,
      skipUpdates,
      redoFailures,
      runDuplicateChecks,
    } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    const mints = await this.getMints(args);

    for (let i = 0; i < mints.length; i++) {
      console.log(
        `Doing ${i} of ${mints.length} which is ${mints[i].toBase58()}`
      );
      const mint = mints[i];

      if (
        playerStates[mint.toBase58()] &&
        (playerStates[mint.toBase58()].state as MintState) ==
          MintState.FullyLoadedAndEquipped
      ) {
        if (!skipUpdates || runDuplicateChecks) {
          const playerPDA = (await getPlayerPDA(mint, index))[0];
          const metadata = await getMetadata(mint);
          const metadataAccount =
            await this.player.client.provider.connection.getAccountInfo(
              metadata
            );
          const metadataObj = decodeMetadata(metadataAccount.data);
          console.log("Grabbed metadata obj.");

          console.log("Fetched ", metadataObj.data.uri);

          try {
            const player = await this.player.client.account.player.fetch(
              playerPDA
            );
            console.log(
              "Player exists and is in it's final state already. Updating player permissionlessly."
            );

            if (runDuplicateChecks) {
              const json = (await fetch(metadataObj.data.uri)) as any;
              await this.runDuplicateChecks(mint, json, player, args);
            }
            if (!skipUpdates) {
              try {
                await (
                  await this.player.updatePlayer(
                    {
                      index: index,
                      classIndex: index,
                      updatePermissivenessToUse:
                        existingClassDef.updatePermissivenessToUse,
                      playerClassMint: new web3.PublicKey(
                        existingClassDef.mint
                      ),
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
              } catch (e) {
                if (e.toString().match("Timed")) {
                  console.log("Timeout detected but ignoring");
                } else {
                  throw e;
                }
              }
            }
          } catch (e) {
            console.error(e);
            console.log("Skipping due to error.");
          }
        } else {
          console.log("Skipping updates per config file.");
        }
      } else {
        try {
          console.log(
            `Player for mint ${mint} is in state ${
              playerStates[mint.toBase58()]?.state || MintState.NotBuilt
            }`
          );
          const playerPDA = (await getPlayerPDA(mint, index))[0];
          const metadata = await getMetadata(mint);
          const metadataAccount =
            await this.player.client.provider.connection.getAccountInfo(
              metadata
            );
          const metadataObj = decodeMetadata(metadataAccount.data);
          console.log("Grabbed metadata obj.");
          const json = (await fetch(metadataObj.data.uri)) as any;
          console.log("Fetched ", metadataObj.data.uri);

          if (!json.attributes) {
            playerStates[mint.toBase58()] = {
              state: MintState.FullyLoadedAndEquipped,
              itemsAdded: [],
              itemsMinted: [],
              itemsEquipped: [],
            };
            await writeOutState({ ...this.turnToConfig(args), playerStates });
            console.log("Skipping this guy as it has no attributes.");
            continue;
          }

          if (!playerStates[mint.toBase58()]) {
            playerStates[mint.toBase58()] = {
              state: MintState.NotBuilt,
              itemsAdded: [],
              itemsMinted: [],
              itemsEquipped: [],
            };
            await writeOutState({ ...this.turnToConfig(args), playerStates });
          } else {
            playerStates[mint.toBase58()].state = playerStates[mint.toBase58()]
              .state as MintState;
          }

          if (playerStates[mint.toBase58()].state == MintState.NotBuilt) {
            console.log(
              "First we need to mint tokens for the body part traits."
            );
            for (
              let j = playerStates[mint.toBase58()].itemsMinted.length;
              j < bodyPartLayers.length;
              j++
            ) {
              console.log("Searching for value for ", bodyPartLayers[j]);
              const myValue = json.attributes.find(
                (a) => a.trait_type == bodyPartLayers[j]
              )?.value;
              if (myValue && itemClassLookup[bodyPartLayers[j]][myValue]) {
                console.log("Found value", myValue, "issuing token");
                const itemClassMint = new web3.PublicKey(
                  itemClassLookup[bodyPartLayers[j]][
                    myValue
                  ].existingClassDef.mint
                );
                const existingClass =
                  itemClassLookup[bodyPartLayers[j]][myValue].existingClassDef;

                let successful = false;
                if (itemsWillBeSFTs) {
                  successful = await this.mintSFTTrait(
                    itemClassMint,
                    existingClass
                  );
                } else {
                  throw new Error(
                    "No support for creating NFT items yet. You need to first create the NFT that is a child edition of the mint variable, then go through the escrow build process for item. Given this does not match our current business model, we will revisit soon! Why not try SFTs instead? They are more cost effective. NFT Items are only sensible for stateful items!"
                  );
                }

                if (successful) {
                  console.log(
                    `Minted ${itemClassMint.toBase58()}, for layer ${
                      bodyPartLayers[j]
                    } which is a ${myValue}`
                  );
                  playerStates[mint.toBase58()].itemsMinted.push(
                    itemClassMint.toBase58()
                  );
                } else {
                  throw new Error("Failed to mint.");
                }
                await writeOutState({
                  ...this.turnToConfig(args),
                  playerStates,
                });
              } else {
                if (!myValue)
                  console.log(
                    "This NFT doesnt have",
                    bodyPartLayers[j],
                    "defined on it's attribute list, skipping"
                  );
                else if (!itemClassLookup[bodyPartLayers[j]][myValue]) {
                  console.log(
                    "The value",
                    myValue,
                    "is not on the itemClassLookup list meaning you didnt intend it to be wearable and a class for it was never made in step 3. Skipping."
                  );
                }
                playerStates[mint.toBase58()].itemsMinted.push("NA");
                await writeOutState({
                  ...this.turnToConfig(args),
                  playerStates,
                });
              }
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
            await this.tryBuildPlayer(mint, args);

            playerStates[mint.toBase58()].state = MintState.Built;
            await writeOutState({ ...this.turnToConfig(args), playerStates });
          }

          if (playerStates[mint.toBase58()].state == MintState.Built) {
            console.log("Built player. Time to update it.");
            await sleep(10000);
            let tries = 0;
            let player = null;
            while (tries < 3 && !player) {
              try {
                player = await this.player.client.account.player.fetch(
                  (
                    await getPlayerPDA(new web3.PublicKey(mint), new BN(index))
                  )[0]
                );
              } catch (e) {
                console.error(e);
              }
              tries++;
              if (!player) {
                this.player = await reloadPlayer();
                console.log("Fetch player try", tries);
                await sleep(3000);
              }
            }

            if (!player) {
              console.log(
                "Failed three fetches of player. Going to try building it again."
              );
              await this.tryBuildPlayer(mint, args);
              await sleep(10000);
              player = await this.player.client.account.player.fetch(
                (
                  await getPlayerPDA(new web3.PublicKey(mint), new BN(index))
                )[0]
              );
            }

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
                      ...player.data.basicStats.slice(0, newBasicStats.length),
                      ...stringLayers.map((l, i) => ({
                        index: newBasicStats.length + i,
                        state: {
                          string: {
                            current: json.attributes.find(
                              (a) => a.trait_type == l
                            ).value,
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
              let j = playerStates[mint.toBase58()].itemsAdded.length;
              j < bodyPartLayers.length;
              j++
            ) {
              const myValue = json.attributes.find(
                (a) => a.trait_type == bodyPartLayers[j]
              )?.value;
              if (myValue && itemClassLookup[bodyPartLayers[j]][myValue]) {
                const itemClassMint = new web3.PublicKey(
                  itemClassLookup[bodyPartLayers[j]][
                    myValue
                  ].existingClassDef.mint
                );
                console.log(
                  `Adding item of class mint ${itemClassMint.toBase58()}, which represents ${
                    bodyPartLayers[j]
                  }`
                );

                if (itemsWillBeSFTs) {
                  try {
                    await (
                      await this.player.addItem(
                        {
                          index: index,
                          addItemPermissivenessToUse:
                            existingClassDef.updatePermissivenessToUse,
                          playerMint: mint,
                          amount: new BN(1),
                          itemIndex: itemIndex.add(new BN(1)), // item, not item class, so add 1 according to our convention
                        },
                        {
                          itemMint: itemClassMint, // for sfts, is the same
                          metadataUpdateAuthority: wallet,
                        },
                        {
                          itemProgram: this.item,
                          playerClassMint: new web3.PublicKey(
                            existingClassDef.mint
                          ),
                          itemClassMint: itemClassMint,
                        }
                      )
                    ).rpc();
                  } catch (e) {
                    if (
                      e.toString().match("could not find account") ||
                      e.toString().match("NumericalOverflowError")
                    ) {
                      console.log(
                        "It's likely in an earlier iteration we did add the item and now it's gone. Let's check items in backpack.."
                      );

                      const tokenTypesHeld = (
                        await this.player.client.provider.connection.getParsedTokenAccountsByOwner(
                          playerPDA,
                          {
                            programId: TOKEN_PROGRAM_ID,
                          }
                        )
                      ).value;
                      console.log(tokenTypesHeld);
                      const mintPresent = tokenTypesHeld.find(
                        (t) =>
                          t.account.data.parsed.info.mint == mint.toBase58()
                      );

                      if (mintPresent) {
                        console.log("Player has the item.");
                      } else {
                        console.log(
                          "Player does not have the item and neither does the wallet, so you need to mint it.."
                        );

                        const existingClass =
                          itemClassLookup[bodyPartLayers[j]][myValue]
                            .existingClassDef;
                        try {
                          await this.mintSFTTrait(itemClassMint, existingClass);
                        } catch (e) {
                          console.log(
                            "Even though this mint threw an error, we don't want it to end control. Sleeping for a few seconds first."
                          );
                        }
                        await sleep(10000);
                        throw new Error(
                          "Throwing this error to trigger re-run now that SFT has been minted."
                        );
                        throw e;
                      }
                    } else {
                      throw e;
                    }
                  }
                } else {
                  throw new Error(
                    "This is not supported yet. You'll need to transfer one NFT of this type over to the player."
                  );
                }

                playerStates[mint.toBase58()].itemsAdded.push(
                  itemClassMint.toBase58()
                );

                await writeOutState({
                  ...this.turnToConfig(args),
                  playerStates,
                });
              } else {
                if (!myValue)
                  console.log(
                    "This NFT doesnt have",
                    bodyPartLayers[i],
                    "defined on it's attribute list, skipping"
                  );
                else if (!itemClassLookup[bodyPartLayers[j]][myValue]) {
                  console.log(
                    "The value",
                    myValue,
                    "is not on the itemClassLookup list meaning you didnt intend it to be wearable and a class for it was never made in step 3. Skipping."
                  );
                }
                playerStates[mint.toBase58()].itemsAdded.push("NA");
                await writeOutState({
                  ...this.turnToConfig(args),
                  playerStates,
                });
              }
            }

            playerStates[mint.toBase58()].state = MintState.Loaded;
            await writeOutState({
              ...this.turnToConfig(args),
              playerStates,
            });
          }

          if (
            playerStates[mint.toBase58()].itemsMinted.length !=
            playerStates[mint.toBase58()].itemsAdded.length
          ) {
            throw new Error(
              "At this stage, items minted should equal number of items added."
            );
          }

          if (playerStates[mint.toBase58()].state == MintState.Loaded) {
            console.log(
              "Now that we have added items, time to equip stuff in the backpack."
            );
            for (
              let j = playerStates[mint.toBase58()].itemsEquipped.length;
              j < bodyPartLayers.length;
              j++
            ) {
              const myValue = json.attributes.find(
                (a) => a.trait_type == bodyPartLayers[j]
              )?.value;
              if (myValue && itemClassLookup[bodyPartLayers[j]][myValue]) {
                const itemClassMint = new web3.PublicKey(
                  itemClassLookup[bodyPartLayers[j]][
                    myValue
                  ].existingClassDef.mint
                );
                console.log(
                  `Equipping item of class mint ${itemClassMint.toBase58()}, which represents ${
                    bodyPartLayers[j]
                  }`
                );

                if (itemsWillBeSFTs) {
                  try {
                    await (
                      await this.player.toggleEquipItem(
                        {
                          index: index,
                          playerMint: mint,
                          amount: new BN(1),
                          itemIndex: itemIndex.add(new BN(1)), // add one according to our convention, since item not itemclass
                          itemMint: itemClassMint, // with sfts we are stacking the item and itemclass on same mint for economy
                          itemClassMint: itemClassMint,
                          equipping: true,
                          bodyPartIndex: j,
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
                          playerClassMint: new web3.PublicKey(
                            existingClassDef.mint
                          ),
                        }
                      )
                    ).rpc();
                  } catch (e) {
                    if (e.toString().match("Timed")) {
                      console.log("Timeout detected but ignoring");
                    } else if (
                      e
                        .toString()
                        .match("caused by account: player_item_account")
                    ) {
                      console.log(
                        "Looks like maybe this item never got added. Let's wait a pinch for propagation"
                      );
                      await sleep(20000);
                      const playerPDA = (
                        await getPlayerPDA(
                          new web3.PublicKey(mint),
                          new BN(index)
                        )
                      )[0];
                      const realItems = playerStates[
                        mint.toBase58()
                      ].itemsAdded.filter((i) => i != "NA").length;
                      const tokenTypesHeld = (
                        await this.player.client.provider.connection.getTokenAccountsByOwner(
                          playerPDA,
                          {
                            programId: TOKEN_PROGRAM_ID,
                          }
                        )
                      ).value.length;
                      if (tokenTypesHeld < realItems) {
                        console.log(
                          "Yep, you got fucked. Need to re-add that item."
                        );
                        playerStates[mint.toBase58()].itemsAdded =
                          playerStates[mint.toBase58()].itemsEquipped;
                        playerStates[mint.toBase58()].state = MintState.Set;

                        await writeOutState({
                          ...this.turnToConfig(args),
                          playerStates,
                        });
                        throw Error("Reset this run.");
                      } else {
                        console.log(
                          "Nope, you have the items. Not sure why this is fucked."
                        );
                        throw e;
                      }
                    } else {
                      throw e;
                    }
                  }
                } else {
                  throw new Error("This is not supported yet.");
                }

                playerStates[mint.toBase58()].itemsEquipped.push(
                  itemClassMint.toBase58()
                );

                await writeOutState({
                  ...this.turnToConfig(args),
                  playerStates,
                });
              } else {
                if (!myValue)
                  console.log(
                    "This NFT doesnt have",
                    bodyPartLayers[j],
                    "defined on it's attribute list, skipping"
                  );
                else if (!itemClassLookup[bodyPartLayers[j]][myValue]) {
                  console.log(
                    "The value",
                    myValue,
                    "is not on the itemClassLookup list meaning you didnt intend it to be wearable and a class for it was never made in step 3. Skipping."
                  );
                }
                playerStates[mint.toBase58()].itemsEquipped.push("NA");
                await writeOutState({
                  ...this.turnToConfig(args),
                  playerStates,
                });
              }
            }
          }

          if (
            playerStates[mint.toBase58()].itemsAdded.length !=
            playerStates[mint.toBase58()].itemsEquipped.length
          ) {
            throw new Error(
              "At this stage, items added should equal number of items equipped"
            );
          }

          if (playerStates[mint.toBase58()].state == MintState.Loaded) {
            console.log(
              "Performing a check to see if the items equipped on chain match what we think we have. We cannot proceed until we know for sure."
            );
            let player = await this.player.client.account.player.fetch(
              playerPDA
            );
            if (
              //@ts-ignore
              player.equippedItems.length <
              playerStates[mint.toBase58()].itemsEquipped.filter(
                (a) => a != "NA"
              ).length
            ) {
              playerStates[mint.toBase58()].itemsEquipped = [];
              await writeOutState({ ...this.turnToConfig(args), playerStates });

              throw new Error(
                `Failed to equip items, mint ${mint} cannot move forward. Resetting items equipped to try again next run.`
              );
            } else {
              playerStates[mint.toBase58()].state =
                MintState.FullyLoadedAndEquipped;
              await writeOutState({ ...this.turnToConfig(args), playerStates });
            }

            console.log(
              `Player for mint ${mint.toBase58()} is in it's final state and ready to go.`
            );
          }
        } catch (e) {
          console.error(e);
          if (redoFailures) {
            console.log(
              "Player",
              mint.toBase58(),
              "Failed. You marked retries true. Retrying."
            );
            i--;
          } else {
            throw e;
          }
        }
      }
    }
  }
}
