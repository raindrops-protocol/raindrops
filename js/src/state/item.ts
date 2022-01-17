import { BN, web3 } from "@project-serum/anchor";
import {
  Callback,
  InheritanceState,
  Permissiveness,
  PermissivenessType,
  Root,
} from "./common";

export interface ItemClassData {
  childrenMustBeEditions: null | boolean;
  builderMustBeHolder: null | boolean;
  updatePermissiveness: null | Permissiveness[];
  buildPermissiveness: null | Permissiveness[];
  stakingWarmUpDuration: null | BN;
  stakingCooldownDuration: null | BN;
  stakingPermissiveness: null | Permissiveness[];
  unstakingPermissiveness: null | Permissiveness[];
  childUpdatePropagationPermissiveness:
    | null
    | ChildUpdatePropagationPermissiveness[];
  usageRoot: null | Root;
  usageStateRoot: null | Root;
  componentRoot: null | Root;
  usages: null | ItemUsage[];
  components: null | Component[];
}

export interface Component {
  mint: web3.PublicKey;
  amount: BN;
  time_to_build: null | BN;
  component_scope: string;
  use_usage_index: number;
  condition: ComponentCondition;
  inherited: InheritanceState;
}

export enum ComponentCondition {
  Consumed,
  Presence,
  Absence,
  Cooldown,
  CooldownAndConsume,
}

export interface ChildUpdatePropagationPermissiveness {
  overridable: boolean;
  inherited: InheritanceState;
  childUpdatePropagationPermissiveness_type: ChildUpdatePropagationPermissivenessType;
}

export interface ItemUsage {
  index: number;
  basicItemEffects: null | BasicItemEffect[];
  usagePermissiveness: PermissivenessType[];
  inherited: InheritanceState;
  itemClassType: Wearable | Consumable;
  callback: null | Callback;
  validation: null | Callback;
  doNotPairWithSelf: boolean;
  dnp: null | web3.PublicKey[];
}

export enum ItemClassType {
  Wearable,
  Consumable,
}

export class Wearable {
  itemClassType: ItemClassType = ItemClassType.Wearable;
  bodyPart: string[];
  limitPerPart: BN;
}

export class Consumable {
  itemClassType: ItemClassType = ItemClassType.Consumable;
  maxUses: null | BN;
  // If none, is assumed to be 1 (to save space)
  maxPlayersPerUse: null | BN;
  itemUsageType: ItemUsageType;
  cooldownDuration: null | BN;
  warmupDuration: null | BN;
}

export enum ItemUsageType {
  Exhaustion,
  Destruction,
  Infinite,
}

export interface BasicItemEffect {
  amount: BN;
  stat: string;
  itemEffectType: BasicItemEffectType;
  activeDuration: null | BN;
  stakingAmountNumerator: null | BN;
  stakingAmountDivisor: null | BN;
  stakingDurationNumerator: null | BN;
  stakingDurationDivisor: null | BN;
  maxUses: null | BN;
}

export enum BasicItemEffectType {
  Increment,
  Decrement,
  IncrementPercent,
  DecrementPercent,
  IncrementPercentFromBase,
  DecrementPercentFromBase,
}

export enum ChildUpdatePropagationPermissivenessType {
  Usages,
  Components,
  UpdatePermissiveness,
  BuildPermissiveness,
  ChildUpdatePropagationPermissiveness,
  ChildrenMustBeEditionsPermissiveness,
  BuilderMustBeHolderPermissiveness,
  StakingPermissiveness,
  Namespaces,
}
