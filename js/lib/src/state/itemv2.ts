import { BN, web3 } from "@project-serum/anchor";
import { BuildOutput } from "../instructions/itemv2";
import { sha256 } from "js-sha256";

export const ITEMV2_ID = new web3.PublicKey(
  "itEm2FtqJWqUmMTYrUxoFcmFtBxEpd68VTmxJamQXA3"
);

export interface ItemClass {
  name: string;
  authorityMint: web3.PublicKey;
  recipeIndex: BN | null;
  recipes: Recipe[];
  mode: ItemClassMode;
}

export type ItemClassModeSelection =
  | { kind: "MerkleTree";  }
  | { kind: "Collection"; collectionMint: web3.PublicKey }
  | { kind: "Pack"; }
  | { kind: "PresetOnly" };

export type ItemClassMode =
  | { kind: "MerkleTree"; tree: web3.PublicKey  }
  | { kind: "Collection"; collectionMint: web3.PublicKey  }
  | { kind: "Pack"; index: BN }
  | { kind: "PresetOnly" };

export function formatItemClassModeSelection(mode: ItemClassModeSelection): any {
  switch (mode.kind) {
    case "MerkleTree":
      return { merkleTree: {} };
    case "Collection":
      return { collection: { collectionMint: mode.collectionMint } };
    case "Pack":
      return { pack: {} };
    case "PresetOnly":
      return { presetOnly: {} };
  }
}

export function parseItemClassMode(itemClassData: any): ItemClassMode {
  let mode: ItemClassMode = { kind: "PresetOnly" };
    switch (Object.keys(itemClassData.mode)[0]) {
      case "pack":
        mode = {
          kind: "Pack",
          index: new BN((itemClassData.mode as any).pack.index),
        };
        break;
      case "merkleTree":
        mode = {
          kind: "MerkleTree",
          tree: new web3.PublicKey((itemClassData.mode as any).merkleTree.tree),
        }
        break;
      case "collection":
        mode = {
          kind: "Collection",
          collectionMint: new web3.PublicKey((itemClassData.mode as any).collection.collectionMint),
        }
        break;
      case "presetOnly":
        // this is the default selected above the switch func
        break;
      default:
        throw new Error(`unknown item class mode: ${itemClassData.mode}`);
    }
  
  return mode
}

export interface Recipe {
  recipeIndex: BN;
  itemClass: web3.PublicKey;
  buildEnabled: boolean;
  payment: Payment | null;
  ingredients: Ingredient[];
  buildPermitRequired: boolean;
  selectableOutputs: OutputSelectionGroup[];
}

export interface Ingredient {
  itemClass: web3.PublicKey;
  requiredAmount: BN;
  buildEffect: any;
}

export interface OutputSelectionGroup {
  groupId: number;
  choices: OutputSelection[];
}

export interface OutputSelection {
  outputId: number;
  mint: web3.PublicKey;
  amount: BN;
}

export interface OutputSelectionArgs {
  groupId: number;
  outputId: number;
}

export interface Item {
  initialized: boolean;
  itemMint: web3.PublicKey;
  itemState: ItemState;
}

export interface ItemState {
  durability: BN;
  cooldown: BN | null;
}

export interface Build {
  address: web3.PublicKey;
  recipe: web3.PublicKey;
  builder: web3.PublicKey;
  itemClass: web3.PublicKey;
  output: BuildOutput;
  payment: PaymentState | null;
  ingredients: BuildIngredientData[];
  status: BuildStatus;
  buildPermitInUse: boolean;
}

export interface BuildIngredientData {
  itemClass: web3.PublicKey;
  currentAmount: BN;
  requiredAmount: BN;
  buildEffect: any;
  mints: IngredientMint[];
  isDeterministic: boolean;
}

export interface IngredientMint {
  mint: web3.PublicKey;
  buildEffectApplied: boolean;
}

export enum BuildStatus {
  InProgress,
  Complete,
  ItemReceived,
}

export function convertToBuildStatus(buildStatusRaw: any): BuildStatus {
  const buildStatusStr = JSON.stringify(buildStatusRaw);

  switch (true) {
    case buildStatusStr.includes("inProgress"):
      return BuildStatus.InProgress;
    case buildStatusStr.includes("complete"):
      return BuildStatus.Complete;
    case buildStatusStr.includes("itemReceived"):
      return BuildStatus.ItemReceived;
    default:
      throw new Error(`Invalid Build Status: ${buildStatusRaw}`);
  }
}

export enum PaymentStatus {
  NotPaid,
  Escrowed,
  SentToTreasury,
}

export function convertToPaymentStatus(paymentStatusRaw: any): PaymentStatus {
  const paymentStatusStr = JSON.stringify(paymentStatusRaw);

  switch (true) {
    case paymentStatusStr.includes("notPaid"):
      return PaymentStatus.NotPaid;
    case paymentStatusStr.includes("escrowed"):
      return PaymentStatus.Escrowed;
    case paymentStatusStr.includes("sentToTreasury"):
      return PaymentStatus.SentToTreasury;
    default:
      throw new Error(`Invalid Payment Status: ${paymentStatusRaw}`);
  }
}

export interface PaymentState {
  status: PaymentStatus;
  paymentDetails: Payment;
}

export interface Payment {
  treasury: web3.PublicKey;
  amount: BN;
}

export interface Pack {
  address: web3.PublicKey;
  opened: boolean;
  itemClass: web3.PublicKey;
  id: BN;
  contentsHash: Uint8Array;
}

export class PackContents {
  readonly entries: PackContentsEntry[];
  readonly nonce: Uint8Array;

  constructor(entries: PackContentsEntry[], nonce: Uint8Array) {
    if (nonce.length !== 16) {
      throw new Error(`nonce must be 16 bytes`);
    }
    this.nonce = nonce;
    this.entries = entries;
  }

  hash(): Buffer {
    // match this with the program code
    const contentBuffers = this.entries.map((entry) =>
      Buffer.concat([
        entry.mint.toBuffer(),
        entry.amount.toArrayLike(Buffer, "le", 8),
      ])
    );

    const digest = sha256.digest(
      Buffer.concat([...contentBuffers, Buffer.from(this.nonce)])
    );
    const hash = Buffer.from(digest);

    return hash;
  }
}

export interface PackContentsEntry {
  mint: web3.PublicKey;
  amount: BN;
}

export interface BuildPermit {
  itemClass: web3.PublicKey;
  builder: web3.PublicKey;
  remainingBuilds: number;
}

export interface DeterministicIngredient {
  recipes: web3.PublicKey[];
  ingredientMint: web3.PublicKey;
  outputs: DeterministicIngredientOutput[];
}

export interface DeterministicIngredientOutput {
  mint: web3.PublicKey;
  amount: BN;
}

export function getItemClassPda(authorityMint: web3.PublicKey): web3.PublicKey {
  const [itemClass, _itemClassBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("item_class"), authorityMint.toBuffer()],
    ITEMV2_ID
  );

  return itemClass;
}

export function getItemPda(itemMint: web3.PublicKey): web3.PublicKey {
  const [item, _itemBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("item"), itemMint.toBuffer()],
    ITEMV2_ID
  );

  return item;
}

export function getBuildPda(
  itemClass: web3.PublicKey,
  builder: web3.PublicKey
): web3.PublicKey {
  const [build, _buildBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("build"), itemClass.toBuffer(), builder.toBuffer()],
    ITEMV2_ID
  );

  return build;
}

export function getRecipePda(
  itemClass: web3.PublicKey,
  recipeIndex: BN
): web3.PublicKey {
  const [recipe, _recipeBump] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("recipe"),
      recipeIndex.toArrayLike(Buffer, "le", 8),
      itemClass.toBuffer(),
    ],
    ITEMV2_ID
  );

  return recipe;
}

export function getPackPda(itemClass: web3.PublicKey, id: BN) {
  const [pack, _packBump] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("pack"),
      itemClass.toBuffer(),
      id.toArrayLike(Buffer, "le", 8),
    ],
    ITEMV2_ID
  );

  return pack;
}

export function getBuildPermitPda(
  builder: web3.PublicKey,
  itemClass: web3.PublicKey
) {
  const [buildPermit, _buildPermitBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("build_permit"), builder.toBuffer(), itemClass.toBuffer()],
    ITEMV2_ID
  );

  return buildPermit;
}

export function getDeterministicIngredientPda(
  itemClass: web3.PublicKey,
  ingredientMint: web3.PublicKey
) {
  const [deterministicIngredient, _deterministicIngredientBump] =
    web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("deterministic_ingredient"),
        itemClass.toBuffer(),
        ingredientMint.toBuffer(),
      ],
      ITEMV2_ID
    );

  return deterministicIngredient;
}

export function getBuildPaymentEscrowPda(build: web3.PublicKey) {
  const [buildPaymentEscrow, _buildPaymentEscrow] =
    web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("build_payment_escrow"),
        build.toBuffer(),
      ],
      ITEMV2_ID
    );

  return buildPaymentEscrow; 
}