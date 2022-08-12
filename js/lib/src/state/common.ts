import { web3, BN } from "@project-serum/anchor";

export class Permissiveness {
  inherited: InheritanceState;
  permissivenessType: PermissivenessType;

  constructor(args: {
    inherited: InheritanceState;
    permissivenessType: PermissivenessType;
  }) {
    this.inherited = args.inherited;
    this.permissivenessType = args.permissivenessType;
  }
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

export class InheritedBoolean {
  inherited: InheritanceState;
  boolean: boolean;

  constructor(args: { inherited: InheritanceState; boolean: boolean }) {
    this.inherited = args.inherited;
    this.boolean = args.boolean;
  }
}

export enum PermissivenessType {
  TokenHolder,
  ParentTokenHolder,
  UpdateAuthority,
  Anybody,
}

export interface AnchorPermissivenessType {
  tokenHolder?: boolean;
  parentTokenHolder?: boolean;
  updateAuthority?: boolean;
  anybody?: boolean;
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

export function toAnchor(enumVal: any, enumClass: any): any {
  if (enumVal === undefined || enumVal === null) return null;
  const name = enumClass[enumVal];
  const converted = name.charAt(0).toLowerCase() + name.slice(1);
  return { [converted]: true };
}

export enum InheritanceState {
  NotInherited,
  Inherited,
  Overridden,
}

export interface AnchorInheritanceState {
  notInherited?: boolean;
  inherited?: boolean;
  overridden?: boolean;
}

export class Root {
  inherited: InheritanceState;
  root: web3.PublicKey;

  constructor(args: { inherited: InheritanceState; root: web3.PublicKey }) {
    this.inherited = args.inherited;
    this.root = args.root;
  }
}

export class Callback {
  key: web3.PublicKey;
  code: BN;

  constructor(args: { key: web3.PublicKey; code: BN }) {
    this.key = args.key;
    this.code = args.code;
  }
}

export class NamespaceAndIndex {
  namespace: web3.PublicKey;
  index: number | null;
  inherited: InheritanceState;

  constructor(args: {
    namespace: web3.PublicKey;
    index: number | null;
    inherited: InheritanceState;
  }) {
    this.namespace = args.namespace;
    this.index = args.index;
    this.inherited = args.inherited;
  }
}
