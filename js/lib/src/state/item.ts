import { BN, web3 } from "@project-serum/anchor";
import { deserializeUnchecked } from "borsh";
import { extendBorsh } from "../utils/borsh";
import {
  Instructable,
  InstructableCallback,
  Callback,
  InstructableChildUpdatePropagationPermissiveness,
  ChildUpdatePropagationPermissiveness,
  InstructableInheritanceState,
  InheritanceState,
  InstructableInheritedBoolean,
  InheritedBoolean,
  InstructableNamespaceAndIndex,
  NamespaceAndIndex,
  InstructablePermissiveness,
  Permissiveness,
  InstructablePermissivenessType,
  PermissivenessType,
  InstructableRoot,
  Root,
} from "./common";

extendBorsh();

export const decodeItemClass = (buffer: Buffer): ItemClass => {
  const metadata = deserializeUnchecked(
    ITEM_SCHEMA,
    ItemClass,
    buffer
  ) as ItemClass;
  return metadata;
};

export class Item implements Instructable {
  namespaces: NamespaceAndIndex[] | null;
  padding: number;
  parent: web3.PublicKey;
  classIndex: number;
  mint: web3.PublicKey | null;
  metadata: web3.PublicKey | null;
  edition: web3.PublicKey | null;
  bump: number;
  tokensStaked: number | null
  data: ItemData

  constructor(data) {
    this.namespaces = data.namespaces.map((n) => {
      new NamespaceAndIndex(n);
    });
    this.padding = data.padding;
    this.parent = data.parent;
    this.classIndex = data.classIndex;
    this.mint = data.mint;
    this.metadata = data.metadata;
    this.edition = data.edition;
    this.bump = data.bump;
    this.tokensStaked = data.tokensStaked;
    this.data = new ItemData(data.data);
  }

  toInstruction(): InstructableItem {
    return {
      ...this,
      namespaces: this.namespaces ? this.namespaces.map((n) => n.toInstruction()) : null,
      data: this.data.toInstruction(),
    }
  }
}
export interface InstructableItem {
  namespaces: InstructableNamespaceAndIndex[] | null;
  padding: number;
  parent: web3.PublicKey;
  classIndex: number;
  mint: web3.PublicKey | null;
  metadata: web3.PublicKey | null;
  edition: web3.PublicKey | null;
  bump: number;
  tokensStaked: number | null;
  data: InstructableItemData;
}

export class ItemData implements Instructable {
  usageStateRoot: Root | null;
  usageStates: ItemUsageState[] | null;

  constructor(data) {
    this.usageStateRoot = new Root(data.usageStateRoot);
    this.usageStates = data.usageStates.map((s) => {
      new ItemUsageState(s);
    });
  }

  toInstruction(): InstructableItemData {
    return {
      usageStateRoot: this.usageStateRoot ? this.usageStateRoot.toInstruction() : null,
      usageStates: this.usageStates ? this.usageStates.map((s) => s.toInstruction()) : null,
    }
  }
}
export interface InstructableItemData {
  usageStateRoot: InstructableRoot | null;
  usageStates: InstructableItemUsageState[] | null;
}

export class ItemUsageState implements Instructable {
  index: number;
  uses: number;
  activatedAt: number | null;

  constructor(data) {
    this.index = data.index;
    this.uses = data.uses;
    this.activatedAt = data.activatedAt;
  }

  toInstruction(): InstructableItemUsageState {
    return {
      ...this,
    }
  }
}
export interface InstructableItemUsageState {
  index: number;
  uses: number;
  activatedAt: number | null;
}

export class ItemClassSettings implements Instructable {
  freeBuild: null | InheritedBoolean;
  childrenMustBeEditions: null | InheritedBoolean;
  builderMustBeHolder: null | InheritedBoolean;
  updatePermissiveness: null | Permissiveness[];
  buildPermissiveness: null | Permissiveness[];
  stakingWarmUpDuration: null | BN;
  stakingCooldownDuration: null | BN;
  stakingPermissiveness: null | Permissiveness[];
  unstakingPermissiveness: null | Permissiveness[];
  childUpdatePropagationPermissiveness:
    | null
    | ChildUpdatePropagationPermissiveness[];

  constructor(args: {
    freeBuild: null | InheritedBoolean;
    childrenMustBeEditions: null | InheritedBoolean;
    builderMustBeHolder: null | InheritedBoolean;
    updatePermissiveness: null | Permissiveness[];
    buildPermissiveness: null | Permissiveness[];
    stakingWarmUpDuration: null | BN;
    stakingCooldownDuration: null | BN;
    stakingPermissiveness: null | Permissiveness[];
    unstakingPermissiveness: null | Permissiveness[];
    childUpdatePropagationPermissiveness: null
      | ChildUpdatePropagationPermissiveness[];
  }) {
    this.freeBuild = args.freeBuild;
    this.childrenMustBeEditions = args.childrenMustBeEditions;
    this.builderMustBeHolder = args.builderMustBeHolder;
    this.updatePermissiveness = args.updatePermissiveness;
    this.buildPermissiveness = args.buildPermissiveness;
    this.stakingWarmUpDuration = args.stakingWarmUpDuration;
    this.stakingCooldownDuration = args.stakingCooldownDuration;
    this.stakingPermissiveness = args.stakingPermissiveness;
    this.unstakingPermissiveness = args.unstakingPermissiveness;
    this.childUpdatePropagationPermissiveness =
      args.childUpdatePropagationPermissiveness;
  }

  toInstruction(): InstructableItemClassSettings {
    return {
      ...this,
      freeBuild: this.freeBuild ? this.freeBuild.toInstruction() : null,
      childrenMustBeEditions: this.childrenMustBeEditions ? this.childrenMustBeEditions.toInstruction() : null,
      builderMustBeHolder: this.builderMustBeHolder ? this.builderMustBeHolder.toInstruction() : null,
      updatePermissiveness: this.updatePermissiveness ? this.updatePermissiveness.map((p) => p.toInstruction()) : null,
      buildPermissiveness: this.buildPermissiveness ? this.buildPermissiveness.map((p) => p.toInstruction()) : null,
      stakingPermissiveness: this.stakingPermissiveness ? this.stakingPermissiveness.map((p) => p.toInstruction()) : null,
      unstakingPermissiveness: this.unstakingPermissiveness ? this.unstakingPermissiveness.map((p) => p.toInstruction()) : null,
      childUpdatePropagationPermissiveness: this.childUpdatePropagationPermissiveness ? this.childUpdatePropagationPermissiveness.map((p) => p.toInstruction()) : null,
    }
  }
}
export interface InstructableItemClassSettings {
  freeBuild: InstructableInheritedBoolean | null;
  childrenMustBeEditions: InstructableInheritedBoolean | null;
  builderMustBeHolder: InstructableInheritedBoolean | null;
  updatePermissiveness: InstructablePermissiveness[] | null;
  buildPermissiveness: InstructablePermissiveness[] | null;
  stakingWarmUpDuration: BN | null;
  stakingCooldownDuration: BN | null;
  stakingPermissiveness: InstructablePermissiveness[] | null;
  unstakingPermissiveness: InstructablePermissiveness[] | null;
  childUpdatePropagationPermissiveness: InstructableChildUpdatePropagationPermissiveness[] | null;
}

export class ItemClassData implements Instructable {
  settings: ItemClassSettings;
  config: ItemClassConfig;

  constructor(args: { settings: ItemClassSettings; config: ItemClassConfig }) {
    this.settings = args.settings;
    this.config = args.config;
  }

  toInstruction(): InstructableItemClassData {
    return {
      settings: this.settings.toInstruction(),
      config: this.config.toInstruction(),
    }
  }
}
export interface InstructableItemClassData {
  settings: InstructableItemClassSettings;
  config: InstructableItemClassConfig;
}

export class ItemClassConfig implements Instructable {
  usageRoot: null | Root;
  usageStateRoot: null | Root;
  componentRoot: null | Root;
  usages: null | ItemUsage[];
  components: null | Component[];

  constructor(args: {
    usageRoot: null | Root;
    usageStateRoot: null | Root;
    componentRoot: null | Root;
    usages: null | ItemUsage[];
    components: null | Component[];
  }) {
    this.usageRoot = args.usageRoot;
    this.usageStateRoot = args.usageStateRoot;
    this.componentRoot = args.componentRoot;
    this.usages = args.usages;
    this.components = args.components;
  }

  toInstruction(): InstructableItemClassConfig {
    return {
      usageRoot: this.usageRoot ? this.usageRoot.toInstruction() : null,
      usageStateRoot: this.usageStateRoot ? this.usageStateRoot.toInstruction() : null,
      componentRoot: this.componentRoot ? this.componentRoot.toInstruction() : null,
      usages: this.usages ? this.usages.map((u) => u.toInstruction()) : null,
      components: this.components ? this.components.map((c) => c.toInstruction()) : null,
    }
  }
}
export interface InstructableItemClassConfig {
  usageRoot: InstructableRoot | null;
  usageStateRoot: InstructableRoot | null;
  componentRoot: InstructableRoot | null;
  usages: InstructableItemUsage[] | null;
  components: InstructableComponent[] | null;
}

export class Component implements Instructable {
  mint: web3.PublicKey;
  classIndex: BN;
  amount: BN;
  timeToBuild: null | BN;
  componentScope: string;
  useUsageIndex: number;
  condition: ComponentCondition;
  inherited: InheritanceState;

  constructor(args: {
    mint: web3.PublicKey;
    classIndex: BN;
    amount: BN;
    timeToBuild: null | BN;
    componentScope: string;
    useUsageIndex: number;
    condition: ComponentCondition;
    inherited: InheritanceState;
  }) {
    this.classIndex = args.classIndex;
    this.mint = args.mint;
    this.amount = args.amount;
    this.timeToBuild = args.timeToBuild;
    this.componentScope = args.componentScope;
    this.useUsageIndex = args.useUsageIndex;
    this.condition = args.condition;
    this.inherited = args.inherited;
  }

  toInstruction(): InstructableComponent {
    return {
      ...this,
      condition: ComponentCondition.toInstruction(this.condition),
      inherited: InheritanceState.toInstruction(this.inherited),
    }
  }
}
export interface InstructableComponent {
  mint: web3.PublicKey;
  classIndex: BN;
  amount: BN;
  timeToBuild: BN | null;
  componentScope: string;
  useUsageIndex: number;
  condition: InstructableComponentCondition;
  inherited: InstructableInheritanceState;
}

export enum ComponentCondition {
  Consumed,
  Presence,
  Absence,
  Cooldown,
  CooldownAndConsume,
}
export namespace ComponentCondition {
  export function toInstruction(state: ComponentCondition): InstructableComponentCondition {
    switch(state) {
      case ComponentCondition.Consumed:
        return { consumed: true };
      case ComponentCondition.Presence:
        return { presence: true };
      case ComponentCondition.Absence:
        return { absence: true };
      case ComponentCondition.Cooldown:
        return { cooldown: true };
      case ComponentCondition.CooldownAndConsume:
        return { cooldownAndConsume: true };
      default:
        throw new Error(`Unknown ComponentCondition: ${state}`);
    }
  }
}
export interface InstructableComponentCondition {
  consumed?: boolean;
  presence?: boolean;
  absence?: boolean;
  cooldown?: boolean;
  cooldownAndConsume?: boolean;
}

export class DNPItem implements Instructable {
  key: web3.PublicKey;
  inherited: InheritanceState;

  constructor(args: { key: web3.PublicKey; inherited: InheritanceState }) {
    this.key = args.key;
    this.inherited = args.inherited;
  }

  toInstruction(): InstructableDNPItem {
    return {
      ...this,
      inherited: InheritanceState.toInstruction(this.inherited),
    }
  }
}
export interface InstructableDNPItem {
  key: web3.PublicKey;
  inherited: InstructableInheritanceState;
}

export class ItemUsage implements Instructable {
  index: number;
  basicItemEffects: BasicItemEffect[];
  usagePermissiveness: PermissivenessType[];
  inherited: InheritanceState;
  itemClassType: ItemClassType;
  callback: null | Callback;
  validation: null | Callback;
  doNotPairWithSelf: InheritedBoolean;
  dnp: DNPItem[];

  constructor(args: {
    index: number;
    basicItemEffects: BasicItemEffect[];
    usagePermissiveness: PermissivenessType[];
    inherited: InheritanceState;
    itemClassType: ItemClassType;
    callback: null | Callback;
    validation: null | Callback;
    doNotPairWithSelf: InheritedBoolean;
    dnp: DNPItem[];
  }) {
    this.index = args.index;
    this.basicItemEffects = args.basicItemEffects;
    this.usagePermissiveness = args.usagePermissiveness;
    this.inherited = args.inherited;
    this.itemClassType = args.itemClassType;
    this.callback = args.callback;
    this.validation = args.validation;
    this.doNotPairWithSelf = args.doNotPairWithSelf;
    this.dnp = args.dnp;
  }

  toInstruction(): InstructableItemUsage {
    return {
      ...this,
      basicItemEffects: this.basicItemEffects.map((e) => e.toInstruction()),
      usagePermissiveness: this.usagePermissiveness.map((p) => PermissivenessType.toInstruction(p)),
      inherited: InheritanceState.toInstruction(this.inherited),
      itemClassType: this.itemClassType.toInstruction(),
      callback: this.callback ? this.callback.toInstruction() : null,
      validation: this.validation ? this.validation.toInstruction() : null,
      doNotPairWithSelf: this.doNotPairWithSelf.toInstruction(),
      dnp: this.dnp.map((d) => d.toInstruction()),
    }
  }
}
export interface InstructableItemUsage {
  index: number;
  basicItemEffects: InstructableBasicItemEffect[];
  usagePermissiveness: InstructablePermissivenessType[];
  inherited: InstructableInheritanceState;
  itemClassType: InstructableItemClassType;
  callback: InstructableCallback | null;
  validation: InstructableCallback | null;
  doNotPairWithSelf: InstructableInheritedBoolean;
  dnp: InstructableDNPItem[];
}

export class ItemClass implements Instructable {
  namespaces: NamespaceAndIndex[] | null;
  parent: web3.PublicKey | null;
  mint: web3.PublicKey | null;
  metadata: web3.PublicKey | null;
  edition: web3.PublicKey | null;
  bump: number;
  existingChildren: BN;
  itemClassData: ItemClassData;

  constructor(args: {
    namespaces: NamespaceAndIndex[] | null;
    parent: web3.PublicKey | null;
    mint: web3.PublicKey | null;
    metadata: web3.PublicKey | null;
    edition: web3.PublicKey | null;
    bump: number;
    existingChildren: BN;
    itemClassData: ItemClassData;
  }) {
    this.namespaces = args.namespaces;
    this.parent = args.parent;
    this.mint = args.mint;
    this.metadata = args.metadata;
    this.edition = args.edition;
    this.bump = args.bump;
    this.existingChildren = args.existingChildren;
    this.itemClassData = args.itemClassData;
  }

  toInstruction(): InstructableItemClass {
    return {
      ...this,
      namespaces: this.namespaces ? this.namespaces.map((n) => n.toInstruction()) : null,
      itemClassData: this.itemClassData.toInstruction(),
    }
  }
}
export interface InstructableItemClass {
  namespaces: InstructableNamespaceAndIndex[] | null;
  parent: web3.PublicKey | null;
  mint: web3.PublicKey | null;
  metadata: web3.PublicKey | null;
  edition: web3.PublicKey | null;
  bump: number;
  existingChildren: BN;
  itemClassData: InstructableItemClassData;
}

export class ItemClassType implements Instructable {
  wearable?: Wearable | null;
  consumable?: Consumable | null;

  constructor(args: { wearable?: Wearable | null; consumable?: Consumable | null }) {
    this.wearable = args.wearable;
    this.consumable = args.consumable;
  }

  toInstruction(): InstructableItemClassType {
    return {
      wearable: this.wearable ? this.wearable.toInstruction() : null,
      consumable: this.consumable ? this.consumable.toInstruction() : null,
    }
  }
}
export interface InstructableItemClassType {
  wearable?: InstructableWearable | null;
  consumable?: InstructableConsumable | null;
}

export class Wearable implements Instructable {
  bodyPart: string[];
  limitPerPart: BN;

  constructor(args: { bodyPart: string[]; limitPerPart: BN }) {
    this.bodyPart = args.bodyPart;
    this.limitPerPart = args.limitPerPart;
  }

  toInstruction(): InstructableWearable {
    return {
      ...this,
    }
  }
}
export interface InstructableWearable {
  bodyPart: string[];
  limitPerPart: BN;
}

export class Consumable implements Instructable {
  maxUses: null | BN;
  // If none, is assumed to be 1 (to save space)
  maxPlayersPerUse: null | BN;
  itemUsageType: ItemUsageType;
  cooldownDuration: null | BN;
  warmupDuration: null | BN;

  constructor(args: {
    maxUses: null | BN;
    // If none, is assumed to be 1 (to save space)
    maxPlayersPerUse: null | BN;
    itemUsageType: ItemUsageType;
    cooldownDuration: null | BN;
    warmupDuration: null | BN;
  }) {
    this.maxUses = args.maxUses;
    this.maxPlayersPerUse = args.maxPlayersPerUse;
    this.itemUsageType = args.itemUsageType;
    this.cooldownDuration = args.cooldownDuration;
    this.warmupDuration = args.warmupDuration;
  }

  toInstruction(): InstructableConsumable {
    return {
      ...this,
      itemUsageType: ItemUsageType.toInstruction(this.itemUsageType),
    }
  }
}
export interface InstructableConsumable {
  maxUses: null | BN;
  maxPlayersPerUse: null | BN;
  itemUsageType: InstructableItemUsageType;
  cooldownDuration: null | BN;
  warmupDuration: null | BN;
}

export enum ItemUsageType {
  Exhaustion,
  Destruction,
  Infinite,
}
export namespace ItemUsageType {
  export function toInstruction(state: ItemUsageType): InstructableItemUsageType {
    switch (state) {
      case ItemUsageType.Exhaustion:
        return { exhaustion: true}
      case ItemUsageType.Destruction:
        return { destruction: true}
      case ItemUsageType.Infinite:
        return { infinite: true}
      default:
        throw new Error(`Unknown ItemUsageType: ${state}`)
    }
  }
}
export interface InstructableItemUsageType {
  exhaustion?: boolean;
  destruction?: boolean;
  infinite?: boolean;
}

export class BasicItemEffect implements Instructable {
  amount: BN;
  stat: string;
  itemEffectType: BasicItemEffectType;
  activeDuration: null | BN;
  stakingAmountNumerator: null | BN;
  stakingAmountDivisor: null | BN;
  stakingDurationNumerator: null | BN;
  stakingDurationDivisor: null | BN;
  maxUses: null | BN;

  constructor(args: {
    amount: BN;
    stat: string;
    itemEffectType: BasicItemEffectType;
    activeDuration: null | BN;
    stakingAmountNumerator: null | BN;
    stakingAmountDivisor: null | BN;
    stakingDurationNumerator: null | BN;
    stakingDurationDivisor: null | BN;
    maxUses: null | BN;
  }) {
    this.amount = args.amount;
    this.stat = args.stat;
    this.itemEffectType = args.itemEffectType;
    this.activeDuration = args.activeDuration;
    this.stakingAmountNumerator = args.stakingAmountNumerator;
    this.stakingAmountDivisor = args.stakingAmountDivisor;
    this.stakingDurationNumerator = args.stakingDurationNumerator;
    this.stakingDurationDivisor = args.stakingDurationDivisor;
    this.maxUses = args.maxUses;
  }

  toInstruction(): InstructableBasicItemEffect {
    return {
      ...this,
      itemEffectType: BasicItemEffectType.toInstruction(this.itemEffectType),
    }
  }
}
export interface InstructableBasicItemEffect {
  amount: BN;
  stat: string;
  itemEffectType: InstructableBasicItemEffectType;
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
export namespace BasicItemEffectType {
  export function toInstruction(state: BasicItemEffectType): InstructableBasicItemEffectType {
    switch (state) {
      case BasicItemEffectType.Increment:
        return { increment: true};
      case BasicItemEffectType.Decrement:
        return { decrement: true};
      case BasicItemEffectType.IncrementPercent:
        return { incrementPercent: true};
      case BasicItemEffectType.DecrementPercent:
        return { decrementPercent: true};
      case BasicItemEffectType.IncrementPercentFromBase:
        return { incrementPercentFromBase: true};
      case BasicItemEffectType.DecrementPercentFromBase:
        return { decrementPercentFromBase: true};
      default:
        throw new Error(`Unknown BasicItemEffectType: ${state}`);
    }
  }
}
export interface InstructableBasicItemEffectType {
  increment?: boolean;
  decrement?: boolean;
  incrementPercent?: boolean;
  decrementPercent?: boolean;
  incrementPercentFromBase?: boolean;
  decrementPercentFromBase?: boolean;
}

export const ITEM_SCHEMA = new Map<any, any>([
  [
    ItemClass,
    {
      kind: "struct",
      fields: [
        ["key", "u64"],
        ["namespaces", { kind: "option", type: [NamespaceAndIndex] }],
        ["parent", { kind: "option", type: "pubkey" }],
        ["mint", { kind: "option", type: "pubkey" }],
        ["metadata", { kind: "option", type: "pubkey" }],
        ["edition", { kind: "option", type: "pubkey" }],
        ["bump", "u8"],
        ["existingChildren", "u64"],
        ["itemClassData", ItemClassData],
      ],
    },
  ],

  [
    ItemClassData,
    {
      kind: "struct",
      fields: [
        ["settings", ItemClassSettings],
        ["config", ItemClassConfig],
      ],
    },
  ],
  [
    Root,
    {
      kind: "struct",
      fields: [
        ["inherited", "u8"],
        ["root", "pubkey"],
      ],
    },
  ],
  [
    InheritedBoolean,
    {
      kind: "struct",
      fields: [
        ["inherited", "u8"],
        ["boolean", "u8"],
      ],
    },
  ],
  [
    Permissiveness,
    {
      kind: "struct",
      fields: [
        ["inherited", "u8"],
        ["permissivenessType", "u8"],
      ],
    },
  ],
  [
    ChildUpdatePropagationPermissiveness,
    {
      kind: "struct",
      fields: [
        ["overridable", "u8"],
        ["inherited", "u8"],
        ["childUpdatePropagationPermissivenessType", "u8"],
      ],
    },
  ],
  [
    DNPItem,
    {
      kind: "struct",
      fields: [
        ["key", "pubkey"],
        ["inherited", "u8"],
      ],
    },
  ],
  [
    NamespaceAndIndex,
    {
      kind: "struct",
      fields: [
        ["namespace", "pubkey"],
        ["indexed", "u8"],
        ["inherited", "u8"],
      ],
    },
  ],
  [
    Wearable,
    {
      kind: "struct",
      fields: [
        ["bodyPart", ["string"]],
        ["limitPerPart", { kind: "option", type: "u64" }],
      ],
    },
  ],
  [
    Callback,
    {
      kind: "struct",
      fields: [
        ["key", "pubkey"],
        ["code", "u64"],
      ],
    },
  ],
  [
    Consumable,
    {
      kind: "struct",
      fields: [
        ["maxUses", { kind: "option", type: "u64" }],
        ["maxPlayersPerUse", { kind: "option", type: "u64" }],
        ["itemUsageType", "u8"],
        ["cooldownDuration", { kind: "option", type: "u64" }],
        ["warmupDuration", { kind: "option", type: "u64" }],
      ],
    },
  ],
  [
    ItemClassType,
    {
      kind: "enum",
      values: [
        ["wearable", Wearable],
        ["consumable", Consumable],
      ],
    },
  ],
  [
    ItemUsage,
    {
      kind: "struct",
      fields: [
        ["index", "u16"],
        ["basicItemEffects", { kind: "option", type: [BasicItemEffect] }],
        ["usagePermissiveness", ["u8"]],
        ["inherited", "u8"],
        ["itemClassType", ItemClassType],
        ["callback", { kind: "option", type: Callback }],
        ["validation", { kind: "option", type: Callback }],
        ["doNotPairWithSelf", { kind: "option", type: InheritedBoolean }],
        ["dnp", { kind: "option", type: [DNPItem] }],
      ],
    },
  ],

  [
    Component,
    {
      kind: "struct",
      fields: [
        ["mint", "pubkey"],
        ["classIndex", "u64"],
        ["amount", "u64"],
        ["timeToBuild", { kind: "option", type: "u64" }],
        ["componentScope", "string"],
        ["useUsageIndex", "u16"],
        ["condition", "u8"],
        ["inherited", "u8"],
      ],
    },
  ],
  [
    BasicItemEffect,
    {
      kind: "struct",
      fields: [
        ["amount", "u64"],
        ["stat", "string"],
        ["itemEffectType", "u8"],
        ["activeDuration", { kind: "option", type: "u64" }],
        ["stakingAmountNumerator", { kind: "option", type: "u64" }],
        ["stakingAmountDivisor", { kind: "option", type: "u64" }],
        ["stakingDurationNumerator", { kind: "option", type: "u64" }],
        ["stakingDurationDivisor", { kind: "option", type: "u64" }],
        ["maxUses", { kind: "option", type: "u64" }],
      ],
    },
  ],
  [
    ItemClassConfig,
    {
      kind: "struct",
      fields: [
        ["usageRoot", { kind: "option", type: Root }],
        ["usageStateRoot", { kind: "option", type: Root }],
        ["componentRoot", { kind: "option", type: Root }],
        ["usages", { kind: "option", type: [ItemUsage] }],
        ["components", { kind: "option", type: [Component] }],
      ],
    },
  ],
  [
    ItemClassSettings,
    {
      kind: "struct",
      fields: [
        ["freeBuild", { kind: "option", type: InheritedBoolean }],
        ["childrenMustBeEditions", { kind: "option", type: InheritedBoolean }],
        ["builderMustBeHolder", { kind: "option", type: InheritedBoolean }],
        ["updatePermissiveness", { kind: "option", type: [Permissiveness] }],
        ["buildPermissiveness", { kind: "option", type: [Permissiveness] }],
        ["stakingWarmUpDuration", { kind: "option", type: "u64" }],
        ["stakingCooldownDuration", { kind: "option", type: "u64" }],
        ["stakingPermissiveness", { kind: "option", type: [Permissiveness] }],
        ["unstakingPermissiveness", { kind: "option", type: [Permissiveness] }],
        [
          "childUpdatePropagationPermissiveness",
          { kind: "option", type: [ChildUpdatePropagationPermissiveness] },
        ],
      ],
    },
  ],
]);
