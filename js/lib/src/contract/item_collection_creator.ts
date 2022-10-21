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
  METADATA_SCHEMA,
  VerifyCollectionArgs,
} from "../utils/tokenMetadata/schema";
import { sendTransactionWithRetry, sleep } from "../utils/transactions";
import { PlayerProgram } from "./player";
import { ItemProgram } from "./item";
import { createAssociatedTokenAccountInstruction } from "../utils/ata";
import { NamespaceProgram } from "./namespace";
const {
  PDA: { getAtaForMint, getItemPDA, getMetadata },
} = Utils;

export interface ItemCollectionCreatorArgs {
  redoFailures: boolean;
  namespaceName: string;
  skipUpdates: boolean; // Nested set of URLs for each trait value.
  itemClassLookup: Record<
    string,
    Record<
      string,
      { existingClassDef: any; address: string; requiredBalance: number }
    >
  >;
  hydraWallet: PublicKey;
  itemsWillBeSFTs: boolean;
  itemImageFile: Record<string, Buffer>;
  itemCollectionFile: Buffer;

  sellerFeeBasisPoints: number;
  itemIndex: BN;
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

export class ItemCollectionCreator {
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

  turnToConfig(args: ItemCollectionCreatorArgs) {
    return {
      namespaceName: args.namespaceName,
      // Nested set of URLs for each trait value.
      itemClassLookup: args.itemClassLookup,

      itemIndex: args.itemIndex.toNumber(),
      hydraWallet: args.hydraWallet,
      existingItemClassDef: args.existingItemClassDef,
      skipUpdates: args.skipUpdates,
      redoFailures: args.redoFailures,
      sellerFeeBasisPoints: args.sellerFeeBasisPoints,
      itemsWillBeSFTs: args.itemsWillBeSFTs,
      itemsName: args.itemsName,
      existingCollectionForItems: args.existingCollectionForItems,
    };
  }

  async createItemCollection(args: ItemCollectionCreatorArgs) {
    const {
      itemClassLookup,
      existingCollectionForItems,
      existingItemClassDef,
      itemsName,
      itemImageFile,
      itemCollectionFile,
      hydraWallet,
      itemIndex,

      sellerFeeBasisPoints,
      writeToImmutableStorage,
      writeOutState,
    } = args;
    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    let realCollectionMint;

    if (!existingCollectionForItems) {
      console.log("The collection doesn't exist. Uploading image.");

      const firstUpload = await writeToImmutableStorage(
        itemCollectionFile,
        itemsName,
        [
          new Creator({
            address: hydraWallet.toBase58(),
            share: 100,
            verified: 0,
          }),
        ]
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
                  creators: [
                    new Creator({
                      address: hydraWallet.toBase58(),
                      verified:
                        hydraWallet.toBase58() == wallet.toBase58() ? 1 : 0,
                      share: 100,
                    }),
                  ],
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

  async createItemClasses(args: ItemCollectionCreatorArgs) {
    const {
      itemClassLookup,
      existingCollectionForItems,
      itemImageFile,
      hydraWallet,
      existingItemClassDef,
      itemIndex,

      sellerFeeBasisPoints,
      itemsWillBeSFTs,
      writeToImmutableStorage,
      writeOutState,
    } = args;

    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    console.log(
      "Now let's make some f-in item classes. Item collection mint:",
      existingCollectionForItems.toBase58()
    );

    const royalties = [
      new Creator({
        address: hydraWallet.toBase58(),
        verified: hydraWallet.toBase58() == wallet.toBase58() ? 1 : 0,
        share: 100,
      }),
    ];

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
                      sellerFeeBasisPoints,
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
                ...itemClassLookup[layer][trait],
                existingClassDef: existingClass,
                address: (
                  await getItemPDA(new PublicKey(existingClass.mint), itemIndex)
                )[0].toBase58(),
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
                ...itemClassLookup[layer][trait],
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

  async createItems(args: ItemCollectionCreatorArgs) {
    const { itemClassLookup, itemsWillBeSFTs } = args;

    const wallet = (this.player.client.provider as AnchorProvider).wallet
      .publicKey;

    if (!itemsWillBeSFTs) throw new Error("NFTs not supported yet");

    const layers = Object.keys(itemClassLookup);
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const traits = Object.keys(itemClassLookup[layer]);
      for (let j = 0; j < traits.length; j++) {
        const trait = traits[j];

        console.log("Beginning item creation for", layer, trait);

        const existingClassDef = itemClassLookup[layer][trait].existingClassDef;
        const itemClassMint = new web3.PublicKey(existingClassDef.mint);

        await this.mintSFTTrait(
          itemClassMint,
          existingClassDef,
          itemClassLookup[layer][trait].requiredBalance
        );
      }
    }
  }

  async mintSFTTrait(
    itemClassMint: PublicKey,
    existingClass: any,
    upToBalance: number
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
    if (currBalance < upToBalance) {
      try {
        await this.item.createItemEscrow(
          {
            classIndex: new BN(existingClass.index),
            craftEscrowIndex: new BN(0),
            componentScope: "none",
            buildPermissivenessToUse: existingClass.updatePermissivenessToUse,
            namespaceIndex: null,
            itemClassMint: new web3.PublicKey(existingClass.mint),
            amountToMake: new BN(upToBalance - currBalance),
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
            amountToMake: new BN(upToBalance - currBalance),
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
            amountToMake: new BN(upToBalance - currBalance),
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
            amountToMake: new BN(upToBalance - currBalance),
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
        successful = supply >= upToBalance;
        if (!successful) await sleep(10000);
      } while (!successful && tries < 3);
    } else {
      // if currBalance >= 4, we have enough to deploy a token!
      successful = true;
    }
    return successful;
  }
}
