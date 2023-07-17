import { BN, web3 } from "@project-serum/anchor";
import {
  BuildOutput,
} from "../instructions/item";

export const ITEMV2_ID = new web3.PublicKey(
  "itEM2PBUUqSjYhSmEKSbJx9SRPjRXSe3AhSiYk7Mouo"
);

export interface ItemClass {
  authority: web3.PublicKey;
  items: web3.PublicKey;
  recipeIndex: BN;
  recipes: Recipe[];
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
  recipeIndex: BN;
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

export interface PaymentState {
  paid: boolean;
  paymentDetails: Payment;
}

export interface Payment {
  treasury: web3.PublicKey;
  amount: BN;
}

export interface Pack {
  opened: boolean;
  itemClass: web3.PublicKey;
  id: BN;
  contentsHash: Uint8Array;
}

export interface BuildPermit {
  recipe: web3.PublicKey;
  builder: web3.PublicKey;
  remainingBuilds: number;
}

export interface DeterministicIngredient {
  recipe: web3.PublicKey;
  ingredientMint: web3.PublicKey;
  outputs: DeterministicIngredientOutput[];
}

export interface DeterministicIngredientOutput {
  mint: web3.PublicKey;
  amount: BN;
}

export function getItemClassPda(items: web3.PublicKey): web3.PublicKey {
  const [itemClass, _itemClassBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("item_class"), items.toBuffer()],
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
  recipe: web3.PublicKey,
  builder: web3.PublicKey
) {
  const [buildPermit, _buildPermitBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("build_permit"), builder.toBuffer(), recipe.toBuffer()],
    ITEMV2_ID
  );

  return buildPermit;
}

export function getDeterministicIngredientPda(
  recipe: web3.PublicKey,
  ingredientMint: web3.PublicKey
) {
  const [deterministicIngredient, _deterministicIngredientBump] =
    web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("deterministic_ingredient"),
        recipe.toBuffer(),
        ingredientMint.toBuffer(),
      ],
      ITEMV2_ID
    );

  return deterministicIngredient;
}
