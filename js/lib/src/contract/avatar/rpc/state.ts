import * as anchor from "@project-serum/anchor-0.26.0";
import { sha256 } from "js-sha256";
import { AvatarClient, updateStatePDA } from "./avatar";

export const AVATAR_CLASS_PREFIX = "avatar_class";
export const AVATAR_PREFIX = "avatar";
export const TRAIT_PREFIX = "trait";
export const TRAIT_CONFLICTS_PREFIX = "trait_conflicts";
export const PAYMENT_METHOD_PREFIX = "payment_method";
export const UPDATE_STATE_PREFIX = "update_state";
export const VERIFIED_PAYMENT_MINT_PREFIX = "verified_payment_mint";

export interface CreateAvatarClassAccounts {
  avatarClassMint: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface CreateAvatarClassArgs {
  attributeMetadata: AttributeMetadata[];
  variantMetadata: VariantMetadata[];
  globalRenderingConfigUri: string;
}

export interface VariantMetadata {
  name: string;
  id: string;
  status: VariantStatus;
  options: VariantOption[];
}

export interface VariantStatus {
  enabled: boolean;
}

export interface AttributeMetadata {
  name: string;
  id: number;
  status: AttributeStatus;
}

export interface AttributeStatus {
  attributeType: AttributeType;
  mutable: boolean;
}

export type AttributeType = "Optional" | "Essential";

export function formatAttributeType(attributeType: AttributeType): any {
  switch (attributeType) {
    case "Optional":
      return { optional: {} };
    case "Essential":
      return { essential: {} };
  }
}

export function parseAttributeType(attributeType: any): AttributeType {
  switch (Object.keys(attributeType)[0]) {
    case "optional":
      return "Optional";
    case "essential":
      return "Essential";
    default:
      throw new Error(`Unknown AttributeType: ${attributeType}`);
  }
}

export interface CreateAvatarAccounts {
  avatarClass: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
  avatarMint: anchor.web3.PublicKey;
}

export interface CreateAvatarArgs {
  variants: Variant[];
}

export interface CreateTraitAccounts {
  avatarClass: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
  traitMint: anchor.web3.PublicKey;
}

export interface CreateTraitArgs {
  componentUri: string;
  attributeIds: number[];
  variantMetadata: VariantMetadata[];
  traitStatus: TraitStatus;
  equipPaymentDetails: PaymentDetails | null;
  removePaymentDetails: PaymentDetails | null;
}

export interface BootTraitsAccounts {
  avatar: anchor.web3.PublicKey;
  avatarClass: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
  traitMints: anchor.web3.PublicKey[];
}

export interface EquipTraitAccounts {
  avatar: anchor.web3.PublicKey;
  payer: anchor.web3.PublicKey;
  traitMint: anchor.web3.PublicKey;
}

export interface RemoveTraitAccounts {
  avatar: anchor.web3.PublicKey;
  payer: anchor.web3.PublicKey;
  traitMint: anchor.web3.PublicKey;
}

export interface SwapTraitAccounts {
  avatar: anchor.web3.PublicKey;
  payer: anchor.web3.PublicKey;
  equipTraitMint: anchor.web3.PublicKey;
  removeTraitMint: anchor.web3.PublicKey;
}

export interface EquipTraitsAuthorityAccounts {
  avatar: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
  traitMints: anchor.web3.PublicKey[];
}

export interface RemoveTraitsAuthorityAccounts {
  avatar: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
  traitMints: anchor.web3.PublicKey[];
}

export interface UpdateVariantAccounts {
  avatar: anchor.web3.PublicKey;
  payer: anchor.web3.PublicKey;
}

export interface UpdateVariantArgs {
  updateTarget: UpdateTargetSelection;
}

export interface UpdateTraitVariantMetadataAccounts {
  avatarClass: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
  traitMint: anchor.web3.PublicKey;
}

export interface UpdateTraitVariantMetadataArgs {
  variantMetadata: VariantMetadata;
}

export interface UpdateClassVariantMetadataAccounts {
  avatarClass: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface UpdateClassVariantMetadataArgs {
  variantMetadata: VariantMetadata;
}

export interface CreatePaymentMethodAccounts {
  avatarClass: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
  mints?: anchor.web3.Keypair;
}

export interface CreatePaymentMethodArgs {
  assetClass: PaymentAssetClass;
  action: PaymentAction;
}

export interface BeginUpdateAccounts {
  avatar: anchor.web3.PublicKey;
}

export interface BeginUpdateArgs {
  updateTarget: UpdateTargetSelection;
}

export interface CancelUpdateAccounts {
  avatar: anchor.web3.PublicKey;
}

export interface CancelUpdateArgs {
  updateTarget: UpdateTargetSelection;
}

export interface PayForUpdateAccounts {
  avatar: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
  paymentMint?: anchor.web3.PublicKey;
}

export interface PayForUpdateArgs {
  amount: anchor.BN;
  updateTarget: UpdateTargetSelection;
  verifyPaymentMintArgs?: VerifyPaymentMintArgs;
}

export interface TransferPaymentAccounts {
  avatar: anchor.web3.PublicKey;
  paymentMint: anchor.web3.PublicKey;
  paymentMethod: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface TransferPaymentArgs {
  amount: anchor.BN;
  updateTarget: UpdateTargetSelection;
}

export interface BurnPaymentAccounts {
  avatar: anchor.web3.PublicKey;
  paymentMint: anchor.web3.PublicKey;
  paymentMethod: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface BurnPaymentArgs {
  amount: anchor.BN;
  updateTarget: UpdateTargetSelection;
}

export interface AddPaymentMintToPaymentMethodAccounts {
  paymentMint: anchor.web3.PublicKey;
  paymentMethod: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface BurnPaymentTreeAccounts {
  paymentMint: anchor.web3.PublicKey;
  paymentMethod: anchor.web3.PublicKey;
  avatar: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface BurnPaymentTreeArgs {
  amount: anchor.BN;
  updateTarget: UpdateTargetSelection;
}

export interface TransferPaymentTreeAccounts {
  paymentMint: anchor.web3.PublicKey;
  paymentMethod: anchor.web3.PublicKey;
  avatar: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface TransferPaymentTreeArgs {
  amount: anchor.BN;
  updateTarget: UpdateTargetSelection;
}

export interface UpdateClassVariantAuthorityAccounts {
  avatar: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface UpdateClassVariantAuthorityArgs {
  variantIds: string[];
  newVariantOptionIds: string[];
}

export interface UpdateTraitVariantAuthorityAccounts {
  avatar: anchor.web3.PublicKey;
  traitMint: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface UpdateTraitVariantAuthorityArgs {
  variantId: string;
  newVariantOptionId: string;
}

export interface VerifyPaymentMintAccounts {
  paymentMint: anchor.web3.PublicKey;
  paymentMethod: anchor.web3.PublicKey;
  payer: anchor.web3.PublicKey;
}

export interface VerifyPaymentMintArgs {
  root: Buffer;
  leafIndex: number;
  proof: Buffer[];
}

export interface VerifyPaymentMintTestAccounts {
  paymentMint: anchor.web3.PublicKey;
  paymentMints: anchor.web3.PublicKey;
  payer: anchor.web3.PublicKey;
}

export interface AddTraitConflictsAccounts {
  avatarClass: anchor.web3.PublicKey;
  traitAccount: anchor.web3.PublicKey;
  authority: anchor.web3.PublicKey;
}

export interface AddTraitConflictsArgs {
  traitAccounts?: anchor.web3.PublicKey[];
  traitIds?: number[];
  attributeIds?: number[];
}

export interface Attribute {
  id: number;
  trait: anchor.web3.PublicKey | null;
}

export interface EquipRule {
  attributeIds: number[];
}

export interface RenderAccounts {
  avatar: anchor.web3.PublicKey;
}

export interface AvatarRenderConfig {
  avatarClass: string;
  avatar: string;
  stages: StageRenderConfig[];
  adjustmentOperations: any;
  variants: VariantRenderConfig;
  traits: TraitRenderConfig[];
}

export interface AvatarClassRenderConfig {
  stages: StageRenderConfig[];
  adjustmentOperations: any;
  variantReference: any;
}

export interface StageRenderConfig {
  id: number;
  blendMode: string;
  layers: any[];
  usingStages: number[];
  premultiplied: boolean;
  adjustmentOperation: any;
}

export interface VariantRenderConfig {
  primaryVariants: Variant[];
}

export interface Variant {
  variantId: string;
  optionId: string;
}

export interface VariantOption {
  name?: string; // not written to chain
  variantId: string;
  optionId: string;
  paymentDetails: PaymentDetails | null;
  traitGate: TraitGate | null;
}

export interface PaymentDetails {
  paymentMethod: anchor.web3.PublicKey;
  amount: anchor.BN;
}

export interface PaymentDetailsExpanded {
  paymentMethodAddress: anchor.web3.PublicKey;
  paymentMethodData: PaymentMethod;
  amount: anchor.BN;
}

export class PaymentState {
  readonly paymentMethod: anchor.web3.PublicKey;
  readonly currentAmount: anchor.BN;
  readonly requiredAmount: anchor.BN;

  constructor(
    paymentMethod: anchor.web3.PublicKey,
    currentAmount: anchor.BN,
    requiredAmount: anchor.BN
  ) {
    this.paymentMethod = paymentMethod;
    this.currentAmount = currentAmount;
    this.requiredAmount = requiredAmount;
  }

  isPaid(): boolean {
    return this.currentAmount.gte(this.requiredAmount);
  }
}

export interface TraitGate {
  operator: { and: {} }; // hardcoded for now until we support other operators
  traits: anchor.web3.PublicKey[];
}

export enum Operator {
  And,
}

export interface TraitData {
  attributeIds: number[];
  traitAddress: anchor.web3.PublicKey;
  variantSelection: VariantOption[];
}

export interface TraitStatus {
  enabled: boolean;
}

export interface TraitRenderConfig {
  trait: string;
  name: string;
  isAvatarSubject: boolean;
  components: any[];
}

export class AvatarClass {
  readonly mint: anchor.web3.PublicKey;
  readonly traitIndex: number;
  readonly paymentIndex: anchor.BN;
  readonly attributeMetadata: AttributeMetadata[];
  readonly variantMetadata: VariantMetadata[];
  readonly globalRenderingConfigUri: string;

  constructor(
    mint: anchor.web3.PublicKey,
    traitIndex: number,
    paymentIndex: anchor.BN,
    attributeMetadata: AttributeMetadata[],
    variantMetadata: VariantMetadata[],
    globalRenderingConfigUri: string
  ) {
    this.mint = mint;
    this.traitIndex = traitIndex;
    this.paymentIndex = paymentIndex;
    this.attributeMetadata = attributeMetadata;
    this.variantMetadata = variantMetadata;
    this.globalRenderingConfigUri = globalRenderingConfigUri;
  }

  findVariantOption(variantId: string, optionId: string): VariantOption {
    const variantMetadata = this.variantMetadata.find(
      (vm) => vm.id === variantId
    );
    if (variantMetadata === undefined) {
      throw new Error(`variantId ${variantId} not found`);
    }

    const option = variantMetadata.options.find(
      (opt) => opt.optionId === optionId
    );
    if (option === undefined) {
      throw new Error(`optionId ${optionId} not found`);
    }

    return option;
  }
}

export class Avatar {
  readonly address: anchor.web3.PublicKey;
  readonly avatarClass: anchor.web3.PublicKey;
  readonly mint: anchor.web3.PublicKey;
  readonly imageUri: string;
  readonly traits: TraitData[];
  readonly variants: VariantOption[];
  public updateStates: UpdateState[] = [];

  constructor(
    address: anchor.web3.PublicKey,
    avatarClass: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey,
    imageUri: string,
    traits: TraitData[],
    variants: VariantOption[]
  ) {
    this.address = address;
    this.avatarClass = avatarClass;
    this.mint = mint;
    this.imageUri = imageUri;
    this.traits = traits;
    this.variants = variants;
  }

  // true if the provided attribute ids are not currently occupied
  isAttributeSlotAvailable(attributeIds: number[]): boolean {
    for (const trait of this.traits) {
      for (const attributeId of trait.attributeIds) {
        if (attributeIds.includes(attributeId)) {
          return false;
        }
      }
    }

    return true;
  }

  // return traits which occupy the given attributeIds, will return empty array if no match
  getTraitsByAttributeId(attributeIds: number[]): anchor.web3.PublicKey[] {
    const traits: anchor.web3.PublicKey[] = [];
    for (const trait of this.traits) {
      for (const attributeId of trait.attributeIds) {
        if (attributeIds.includes(attributeId)) {
          traits.push(trait.traitAddress);
        }
      }
    }

    return traits;
  }

  // return all in progress updates for the avatar
  // TODO: add equip/remove traits when feature is ready
  async inProgressUpdates(client: AvatarClient): Promise<UpdateState[]> {
    const updateStates: UpdateState[] = [];

    // check class variant updates
    for (const variant of this.variants) {
      const target = new UpdateTargetClassVariant(
        variant.variantId,
        variant.optionId
      );
      const updateState = updateStatePDA(this.address, target);
      const updateStateData = await client.getUpdateState(updateState);
      if (updateStateData === null) {
        continue;
      }
      updateStates.push(updateStateData);
    }

    // check trait variant updates
    for (const trait of this.traits) {
      for (const variant of trait.variantSelection) {
        const target = new UpdateTargetTraitVariant(
          variant.variantId,
          variant.optionId,
          trait.traitAddress
        );
        const updateState = updateStatePDA(this.address, target);
        const updateStateData = await client.getUpdateState(updateState);
        if (updateStateData === null) {
          continue;
        }
        updateStates.push(updateStateData);
      }
    }
    this.updateStates = updateStates;

    return updateStates;
  }
}

export class Trait {
  readonly id: number;
  readonly traitAddress: anchor.web3.PublicKey;
  readonly avatarClass: anchor.web3.PublicKey;
  readonly traitMint: anchor.web3.PublicKey;
  readonly attributeIds: number[];
  readonly componentUri: string;
  readonly status: TraitStatus;
  readonly variantMetadata: VariantMetadata[];
  readonly equipPaymentDetails: PaymentDetailsExpanded | null;
  readonly removePaymentDetails: PaymentDetailsExpanded | null;

  constructor(
    id: number,
    traitAddress: anchor.web3.PublicKey,
    avatarClass: anchor.web3.PublicKey,
    traitMint: anchor.web3.PublicKey,
    attributeIds: number[],
    componentUri: string,
    status: TraitStatus,
    variantMetadata: VariantMetadata[],
    equipPaymentDetails: PaymentDetailsExpanded | null,
    removePaymentDetails: PaymentDetailsExpanded | null
  ) {
    this.id = id;
    this.traitAddress = traitAddress;
    this.avatarClass = avatarClass;
    this.traitMint = traitMint;
    this.attributeIds = attributeIds;
    this.componentUri = componentUri;
    this.status = status;
    this.variantMetadata = variantMetadata;
    this.equipPaymentDetails = equipPaymentDetails;
    this.removePaymentDetails = removePaymentDetails;
  }

  isValidVariant(variantId: string, optionId: string): boolean {
    const variant = this.variantMetadata.find(
      (variant) => variant.id === variantId
    );
    if (variant === undefined) {
      return false;
    }

    return variant.options.some((opt) => opt.optionId === optionId);
  }
}

export class PaymentMethod {
  readonly index: anchor.BN;
  readonly avatarClass: anchor.web3.PublicKey;
  readonly assetClass: PaymentAssetClass;
  readonly action: PaymentAction;

  constructor(
    index: anchor.BN,
    avatarClass: anchor.web3.PublicKey,
    assetClass: PaymentAssetClass,
    action: PaymentAction
  ) {
    this.index = index;
    this.avatarClass = avatarClass;
    this.assetClass = assetClass;
    this.action = action;
  }
}

export class UpdateState {
  initialized: boolean;
  avatar: anchor.web3.PublicKey;
  target: UpdateTarget;

  constructor(
    initialized: boolean,
    avatar: anchor.web3.PublicKey,
    target: UpdateTarget
  ) {
    this.initialized = initialized;
    this.avatar = avatar;
    this.target = target;
  }

  isPaid(): boolean {
    switch (this.target.kind) {
      case "classVariant":
        return (this.target as UpdateTargetClassVariant).paymentState
          ? (this.target as UpdateTargetClassVariant).paymentState.isPaid()
          : true;
      case "traitVariant":
        return (this.target as UpdateTargetTraitVariant).paymentState
          ? (this.target as UpdateTargetTraitVariant).paymentState.isPaid()
          : true;
      case "equipTrait":
        return (this.target as UpdateTargetEquipTrait).paymentState
          ? (this.target as UpdateTargetEquipTrait).paymentState.isPaid()
          : true;
      case "removeTrait":
        return (this.target as UpdateTargetRemoveTrait).paymentState
          ? (this.target as UpdateTargetRemoveTrait).paymentState.isPaid()
          : true;
      case "swapTrait":
        return (
          ((this.target as UpdateTargetSwapTrait).equipPaymentState
            ? (this.target as UpdateTargetSwapTrait).equipPaymentState.isPaid()
            : true) &&
          ((this.target as UpdateTargetSwapTrait).removePaymentState
            ? (this.target as UpdateTargetSwapTrait).removePaymentState.isPaid()
            : true)
        );
      default:
        throw new Error(`Unknown target kind: ${this.target.kind}`);
    }
  }
}

export interface VerifiedPaymentMint {
  paymentMethod: anchor.web3.PublicKey;
  paymentMint: anchor.web3.PublicKey;
}

export type UpdateTarget =
  | UpdateTargetClassVariant
  | UpdateTargetTraitVariant
  | UpdateTargetEquipTrait
  | UpdateTargetRemoveTrait
  | UpdateTargetSwapTrait;

export function parseUpdateTarget(data: any): UpdateTarget {
  if ("classVariant" in data) {
    let paymentState: PaymentState | undefined = undefined;
    if (data.classVariant.paymentState) {
      paymentState = new PaymentState(
        new anchor.web3.PublicKey(data.classVariant.paymentState.paymentMethod),
        new anchor.BN(data.classVariant.paymentState.currentAmount),
        new anchor.BN(data.classVariant.paymentState.requiredAmount)
      );
    }
    return new UpdateTargetClassVariant(
      data.classVariant.variantId,
      data.classVariant.optionId,
      paymentState
    );
  }

  if ("traitVariant" in data) {
    let paymentState: PaymentState | undefined = undefined;
    if (data.traitVariant.paymentState) {
      paymentState = new PaymentState(
        new anchor.web3.PublicKey(data.traitVariant.paymentState.paymentMethod),
        new anchor.BN(data.traitVariant.paymentState.currentAmount),
        new anchor.BN(data.traitVariant.paymentState.requiredAmount)
      );
    }
    return new UpdateTargetTraitVariant(
      data.traitVariant.variantId,
      data.traitVariant.optionId,
      data.traitVariant.traitAccount,
      paymentState
    );
  }

  if ("equipTrait" in data) {
    let paymentState: PaymentState | undefined = undefined;
    if (data.equipTrait.paymentState) {
      paymentState = new PaymentState(
        new anchor.web3.PublicKey(data.equipTrait.paymentState.paymentMethod),
        new anchor.BN(data.equipTrait.paymentState.currentAmount),
        new anchor.BN(data.equipTrait.paymentState.requiredAmount)
      );
    }
    return new UpdateTargetEquipTrait(
      data.equipTrait.traitAccount,
      paymentState
    );
  }

  if ("removeTrait" in data) {
    let paymentState: PaymentState | undefined = undefined;
    if (data.removeTrait.paymentState) {
      paymentState = new PaymentState(
        new anchor.web3.PublicKey(data.removeTrait.paymentState.paymentMethod),
        new anchor.BN(data.removeTrait.paymentState.currentAmount),
        new anchor.BN(data.removeTrait.paymentState.requiredAmount)
      );
    }
    return new UpdateTargetRemoveTrait(
      data.removeTrait.traitAccount,
      paymentState
    );
  }

  if ("swapTrait" in data) {
    return new UpdateTargetSwapTrait(
      data.swapTrait.traitAccount,
      data.swapTrait.traitDestinationAuthority
    );
  }
}

export function hashUpdateTarget(
  updateTarget: UpdateTarget | UpdateTargetSelection
): Buffer {
  if (
    updateTarget instanceof UpdateTargetClassVariant ||
    updateTarget instanceof UpdateTargetSelectionClassVariant
  ) {
    const digest = sha256.digest(
      `${updateTarget.variantId}${updateTarget.optionId}`
    );
    const buf = Buffer.from(digest);
    return buf;
  }

  if (
    updateTarget instanceof UpdateTargetTraitVariant ||
    updateTarget instanceof UpdateTargetSelectionTraitVariant
  ) {
    const digest = sha256.digest(
      `${updateTarget.variantId}${
        updateTarget.optionId
      }${updateTarget.trait.toString()}`
    );
    const buf = Buffer.from(digest);
    return buf;
  }

  if (
    updateTarget instanceof UpdateTargetEquipTrait ||
    updateTarget instanceof UpdateTargetSelectionEquipTrait
  ) {
    const digest = sha256.digest(`${updateTarget.traitAccount.toString()}`);
    const buf = Buffer.from(digest);
    return buf;
  }

  if (
    updateTarget instanceof UpdateTargetRemoveTrait ||
    updateTarget instanceof UpdateTargetSelectionRemoveTrait
  ) {
    const digest = sha256.digest(`${updateTarget.traitAccount.toString()}`);
    const buf = Buffer.from(digest);
    return buf;
  }

  if (
    updateTarget instanceof UpdateTargetSwapTrait ||
    updateTarget instanceof UpdateTargetSelectionSwapTrait
  ) {
    const digest = sha256.digest(
      `${updateTarget.equipTraitAccount.toString()}${updateTarget.removeTraitAccount.toString()}`
    );
    const buf = Buffer.from(digest);
    return buf;
  }

  throw new Error(`invalid update target: ${updateTarget}`);
}

export class UpdateTargetTraitVariant {
  readonly kind: string;
  readonly variantId: string;
  readonly optionId: string;
  readonly trait: anchor.web3.PublicKey;
  readonly paymentState: PaymentState | null;

  constructor(
    variantId: string,
    optionId: string,
    trait: anchor.web3.PublicKey,
    paymentState?: PaymentState
  ) {
    this.kind = "traitVariant";
    this.variantId = variantId;
    this.optionId = optionId;
    this.trait = new anchor.web3.PublicKey(trait);
    if (paymentState) {
      this.paymentState = paymentState;
    } else {
      this.paymentState = null;
    }
  }

  format(): any {
    return {
      traitVariant: {
        variantId: this.variantId,
        optionId: this.optionId,
        traitAccount: this.trait,
      },
    };
  }
}

export class UpdateTargetClassVariant {
  readonly kind: string;
  readonly variantId: string;
  readonly optionId: string;
  readonly paymentState: PaymentState | null;

  constructor(
    variantId: string,
    optionId: string,
    paymentState?: PaymentState
  ) {
    this.kind = "classVariant";
    this.variantId = variantId;
    this.optionId = optionId;

    if (paymentState) {
      this.paymentState = paymentState;
    } else {
      this.paymentState = null;
    }
  }

  format(): any {
    return {
      classVariant: {
        variantId: this.variantId,
        optionId: this.optionId,
        paymentState: this.paymentState,
      },
    };
  }
}

export class UpdateTargetEquipTrait {
  readonly kind: string;
  readonly traitAccount: anchor.web3.PublicKey;
  readonly paymentState: PaymentState | null;

  constructor(
    traitAccount: anchor.web3.PublicKey,
    paymentState?: PaymentState
  ) {
    this.kind = "equipTrait";
    this.traitAccount = new anchor.web3.PublicKey(traitAccount);
    if (paymentState) {
      this.paymentState = paymentState;
    } else {
      this.paymentState = null;
    }
  }

  format(): any {
    return {
      equipTrait: {
        traitAccount: this.traitAccount,
        paymentState: this.paymentState,
      },
    };
  }
}

export class UpdateTargetRemoveTrait {
  readonly kind: string;
  readonly traitAccount: anchor.web3.PublicKey;
  readonly paymentState: PaymentState | null;

  constructor(
    traitAccount: anchor.web3.PublicKey,
    paymentState?: PaymentState
  ) {
    this.kind = "removeTrait";
    this.traitAccount = new anchor.web3.PublicKey(traitAccount);
    if (paymentState) {
      this.paymentState = paymentState;
    } else {
      this.paymentState = null;
    }
  }

  format(): any {
    return {
      removeTrait: {
        traitAccount: this.traitAccount,
        paymentState: this.paymentState,
      },
    };
  }
}

export class UpdateTargetSwapTrait {
  readonly kind: string;
  readonly equipTraitAccount: anchor.web3.PublicKey;
  readonly removeTraitAccount: anchor.web3.PublicKey;
  readonly equipPaymentState: PaymentState | null;
  readonly removePaymentState: PaymentState | null;

  constructor(
    equiptraitAccount: anchor.web3.PublicKey,
    removetraitAccount: anchor.web3.PublicKey,
    equipPaymentState?: PaymentState,
    removePaymentState?: PaymentState
  ) {
    this.kind = "swapTrait";
    this.equipTraitAccount = new anchor.web3.PublicKey(equiptraitAccount);
    this.removeTraitAccount = new anchor.web3.PublicKey(removetraitAccount);
    if (equipPaymentState) {
      this.equipPaymentState = equipPaymentState;
    } else {
      this.equipPaymentState = null;
    }

    if (removePaymentState) {
      this.removePaymentState = removePaymentState;
    } else {
      this.removePaymentState = null;
    }
  }

  format(): any {
    return {
      swapTrait: {
        equipTraitAccount: this.equipTraitAccount,
        removeTraitAccount: this.removeTraitAccount,
        equipPaymentState: this.equipPaymentState,
        removePaymentState: this.removePaymentState,
      },
    };
  }
}

export type UpdateTargetSelection =
  | UpdateTargetSelectionClassVariant
  | UpdateTargetSelectionTraitVariant
  | UpdateTargetSelectionEquipTrait
  | UpdateTargetSelectionRemoveTrait
  | UpdateTargetSelectionSwapTrait;

export class UpdateTargetSelectionTraitVariant {
  readonly kind: string;
  readonly variantId: string;
  readonly optionId: string;
  readonly trait: anchor.web3.PublicKey;

  constructor(
    variantId: string,
    optionId: string,
    trait: anchor.web3.PublicKey
  ) {
    this.kind = "traitVariant";
    this.variantId = variantId;
    this.optionId = optionId;
    this.trait = new anchor.web3.PublicKey(trait);
  }

  format(): any {
    return {
      traitVariant: {
        variantId: this.variantId,
        optionId: this.optionId,
        traitAccount: this.trait,
      },
    };
  }
}

export class UpdateTargetSelectionClassVariant {
  readonly kind: string;
  readonly variantId: string;
  readonly optionId: string;

  constructor(variantId: string, optionId: string) {
    this.kind = "classVariant";
    this.variantId = variantId;
    this.optionId = optionId;
  }

  format(): any {
    return {
      classVariant: { variantId: this.variantId, optionId: this.optionId },
    };
  }
}

export class UpdateTargetSelectionEquipTrait {
  readonly kind: string;
  readonly traitAccount: anchor.web3.PublicKey;

  constructor(
    traitAccount: anchor.web3.PublicKey,
    paymentState?: PaymentState
  ) {
    this.kind = "equipTrait";
    this.traitAccount = new anchor.web3.PublicKey(traitAccount);
  }

  format(): any {
    return {
      equipTrait: { traitAccount: this.traitAccount },
    };
  }
}

export class UpdateTargetSelectionRemoveTrait {
  readonly kind: string;
  readonly traitAccount: anchor.web3.PublicKey;

  constructor(traitAccount: anchor.web3.PublicKey) {
    this.kind = "removeTrait";
    this.traitAccount = new anchor.web3.PublicKey(traitAccount);
  }

  format(): any {
    return {
      removeTrait: {
        traitAccount: this.traitAccount,
      },
    };
  }
}

export class UpdateTargetSelectionSwapTrait {
  readonly kind: string;
  readonly equipTraitAccount: anchor.web3.PublicKey;
  readonly removeTraitAccount: anchor.web3.PublicKey;

  constructor(
    equiptraitAccount: anchor.web3.PublicKey,
    removetraitAccount: anchor.web3.PublicKey
  ) {
    this.kind = "swapTrait";
    this.equipTraitAccount = new anchor.web3.PublicKey(equiptraitAccount);
    this.removeTraitAccount = new anchor.web3.PublicKey(removetraitAccount);
  }

  format(): any {
    return {
      swapTrait: {
        equipTraitAccount: this.equipTraitAccount,
        removeTraitAccount: this.removeTraitAccount,
      },
    };
  }
}

export type PaymentAssetClass =
  | FungiblePaymentAssetClass
  | NonFungiblePaymentAssetClass;

export function parsePaymentAssetClass(jsonPayload: any): PaymentAssetClass {
  if ("fungible" in jsonPayload) {
    return new FungiblePaymentAssetClass(
      new anchor.web3.PublicKey(jsonPayload.fungible.mint)
    );
  }

  if ("nonFungible" in jsonPayload) {
    return new NonFungiblePaymentAssetClass(
      new anchor.web3.PublicKey(jsonPayload.nonFungible.mints)
    );
  }
}

export function parsePaymentAction(jsonPayload: any): PaymentAction {
  if ("transfer" in jsonPayload) {
    return new TransferPaymentAction(
      new anchor.web3.PublicKey(jsonPayload.transfer.treasury)
    );
  }

  if ("burn" in jsonPayload) {
    return new BurnPaymentAction();
  }
}

export class FungiblePaymentAssetClass {
  readonly mint: anchor.web3.PublicKey;
  constructor(mint: anchor.web3.PublicKey) {
    this.mint = mint;
  }

  format(): any {
    return { fungible: { mint: this.mint } };
  }
}

export class NonFungiblePaymentAssetClass {
  readonly mints: anchor.web3.PublicKey;
  constructor(mints: anchor.web3.PublicKey) {
    this.mints = mints;
  }

  format(): any {
    return { nonFungible: { mints: this.mints } };
  }
}

export type PaymentAction = BurnPaymentAction | TransferPaymentAction;

export class BurnPaymentAction {
  format(): any {
    return { burn: {} };
  }
}

export class TransferPaymentAction {
  readonly treasury: anchor.web3.PublicKey;

  constructor(treasury: anchor.web3.PublicKey) {
    this.treasury = treasury;
  }

  format(): any {
    return { transfer: { treasury: this.treasury } };
  }
}

export interface TraitConflicts {
  avatarClass: anchor.web3.PublicKey;
  traitAccount: anchor.web3.PublicKey;
  attributeConflicts: number[];
  traitConflicts: number[];
}
