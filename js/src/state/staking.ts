import { BN, web3 } from "@project-serum/anchor";
import { InheritanceState, NamespaceAndIndex, Permissiveness } from "./common";

export enum ChildUpdatePropagationPermissivenessType {
  DefaultItemCategory,
  Usages,
  Components,
  UpdatePermissiveness,
  BuildPermissiveness,
  ChildUpdatePropagationPermissiveness,
  ChildrenMustBeEditionsPermissiveness,
  BuilderMustBeHolderPermissiveness,
  StakingPermissiveness,
  Namespaces,
  UsagePermissiveness,
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

export class ArtifactClassData {
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

  constructor(args: {
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
  }) {
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

export class ArtifactClass {
  namespaces: null | NamespaceAndIndex[];
  parent: null | web3.PublicKey;
  mint: null | web3.PublicKey;
  metadata: null | web3.PublicKey;
  edition: null | web3.PublicKey;
  bump: number;
  existingChildren: BN;
  data: ArtifactClassData;

  constructor(args: {
    namespaces: null | NamespaceAndIndex[];
    parent: null | web3.PublicKey;
    mint: null | web3.PublicKey;
    metadata: null | web3.PublicKey;
    edition: null | web3.PublicKey;
    bump: number;
    existingChildren: BN;
    data: ArtifactClassData;
  }) {
    this.namespaces = args.namespaces;
    this.parent = args.parent;
    this.mint = args.mint;
    this.metadata = args.metadata;
    this.edition = args.edition;
    this.bump = args.bump;
    this.existingChildren = args.existingChildren;
    this.data = args.data;
  }
}

export class StakingCounter {
  bump: number;
  eventStart: BN;
  eventType: BN;

  constructor(args: { bump: number; eventStart: BN; eventType: BN }) {
    this.bump = args.bump;
    this.eventStart = args.eventStart;
    this.eventType = args.eventType;
  }
}

export class Artifact {
  namespaces: null | NamespaceAndIndex[];
  parent: null | web3.PublicKey;
  mint: null | web3.PublicKey;
  metadata: null | web3.PublicKey;
  edition: null | web3.PublicKey;
  bump: number;
  tokenStaked: BN;

  constructor(args: {
    namespaces: null | NamespaceAndIndex[];
    parent: null | web3.PublicKey;
    mint: null | web3.PublicKey;
    metadata: null | web3.PublicKey;
    edition: null | web3.PublicKey;
    bump: number;
    tokenStaked: BN;
  }) {
    this.namespaces = args.namespaces;
    this.parent = args.parent;
    this.mint = args.mint;
    this.metadata = args.metadata;
    this.edition = args.edition;
    this.bump = args.bump;
    this.tokenStaked = args.tokenStaked;
  }
}
