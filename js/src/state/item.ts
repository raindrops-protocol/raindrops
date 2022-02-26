import { BN, Program, web3 } from "@project-serum/anchor";
import { deserializeUnchecked } from "borsh";
import { extendBorsh } from "../utils/borsh";
import {
  Callback,
  InheritanceState,
  InheritedBoolean,
  NamespaceAndIndex,
  Permissiveness,
  PermissivenessType,
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

export class ItemClassSettings {
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
    childUpdatePropagationPermissiveness:
      | null
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
}

export class ItemClassData {
  settings: ItemClassSettings;
  config: ItemClassConfig;

  constructor(args: { settings: ItemClassSettings; config: ItemClassConfig }) {
    this.settings = args.settings;
    this.config = args.config;
  }
}
export class ItemClassConfig {
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
}

export class Component {
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
}

export enum ComponentCondition {
  Consumed,
  Presence,
  Absence,
  Cooldown,
  CooldownAndConsume,
}

export interface AnchorComponentCondition {
  consumed?: boolean;
  presence?: boolean;
  absence?: boolean;
  cooldown?: boolean;
  cooldownAndConsume?: boolean;
}

export class ChildUpdatePropagationPermissiveness {
  overridable: boolean;
  inherited: InheritanceState;
  childUpdatePropagationPermissivenessType: ChildUpdatePropagationPermissivenessType;

  constructor(args: {
    overridable: boolean;
    inherited: InheritanceState;
    childUpdatePropagationPermissivenessType: ChildUpdatePropagationPermissivenessType;
  }) {
    this.overridable = args.overridable;
    this.inherited = args.inherited;
    this.childUpdatePropagationPermissivenessType =
      args.childUpdatePropagationPermissivenessType;
  }
}

export class DNPItem {
  key: web3.PublicKey;
  inherited: InheritanceState;

  constructor(args: { key: web3.PublicKey; inherited: InheritanceState }) {
    this.key = args.key;
    this.inherited = args.inherited;
  }
}

export class ItemUsage {
  index: number;
  basicItemEffects: null | BasicItemEffect[];
  usagePermissiveness: PermissivenessType[];
  inherited: InheritanceState;
  itemClassType: ItemClassType;
  callback: null | Callback;
  validation: null | Callback;
  doNotPairWithSelf: InheritedBoolean;
  dnp: null | DNPItem[];

  constructor(args: {
    index: number;
    basicItemEffects: null | BasicItemEffect[];
    usagePermissiveness: PermissivenessType[];
    inherited: InheritanceState;
    itemClassType: ItemClassType;
    callback: null | Callback;
    validation: null | Callback;
    doNotPairWithSelf: InheritedBoolean;
    dnp: null | DNPItem[];
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
}

export class ItemClass {
  program: Program | null;
  key: BN;
  namespaces: NamespaceAndIndex[] | null;
  parent: web3.PublicKey | null;
  mint: web3.PublicKey | null;
  metadata: web3.PublicKey | null;
  edition: web3.PublicKey | null;
  bump: number;
  existingChildren: BN;
  itemClassData: ItemClassData;

  constructor(args: {
    key: BN;
    namespaces: NamespaceAndIndex[] | null;
    parent: web3.PublicKey | null;
    mint: web3.PublicKey | null;
    metadata: web3.PublicKey | null;
    edition: web3.PublicKey | null;
    bump: number;
    existingChildren: BN;
    itemClassData: ItemClassData;
  }) {
    this.key = args.key;
    this.namespaces = args.namespaces;
    this.parent = args.parent;
    this.mint = args.mint;
    this.metadata = args.metadata;
    this.edition = args.edition;
    this.bump = args.bump;
    this.existingChildren = args.existingChildren;
    this.itemClassData = args.itemClassData;
  }
}

export class ItemClassType {
  wearable?: Wearable;
  consumable?: Consumable;

  constructor(args: { wearable?: Wearable; consumable?: Consumable }) {
    this.wearable = args.wearable;
    this.consumable = args.consumable;
  }
}

export class Wearable {
  bodyPart: string[];
  limitPerPart: BN;

  constructor(args: { bodyPart: string[]; limitPerPart: BN }) {
    this.bodyPart = args.bodyPart;
    this.limitPerPart = args.limitPerPart;
  }
}

export class Consumable {
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
}

export enum ItemUsageType {
  Exhaustion,
  Destruction,
  Infinite,
}

export class BasicItemEffect {
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
  FreeBuildPermissiveness,
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
