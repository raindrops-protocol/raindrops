import { web3, BN } from "@project-serum/anchor";

export abstract class Instructable {
  public abstract toInstruction();
}

export class Permissiveness implements Instructable {
  inherited: InheritanceState;
  permissivenessType: PermissivenessType;

  constructor(args: {
    inherited: InheritanceState;
    permissivenessType: PermissivenessType;
  }) {
    this.inherited = args.inherited;
    this.permissivenessType = args.permissivenessType;
  }

  toInstruction(): InstructablePermissiveness {
    return {
      inherited: InheritanceState.toInstruction(this.inherited),
      permissivenessType: PermissivenessType.toInstruction(this.permissivenessType),
    }
  }
}
export interface InstructablePermissiveness {
  inherited: InstructableInheritanceState;
  permissivenessType: InstructablePermissivenessType;
}

export class ChildUpdatePropagationPermissiveness implements Instructable {
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

  toInstruction(): InstructableChildUpdatePropagationPermissiveness {
    return {
      ...this,
      inherited: InheritanceState.toInstruction(this.inherited),
      childUpdatePropagationPermissivenessType: ChildUpdatePropagationPermissivenessType.toInstruction(
        this.childUpdatePropagationPermissivenessType
      ),
    }
  }
}
export interface InstructableChildUpdatePropagationPermissiveness {
  overridable: boolean;
  inherited: InstructableInheritanceState;
  childUpdatePropagationPermissivenessType: InstructableChildUpdatePropagationPermissivenessType;
}

export class InheritedBoolean implements Instructable {
  inherited: InheritanceState;
  boolean: boolean;

  constructor(args: { inherited: InheritanceState; boolean: boolean }) {
    this.inherited = args.inherited;
    this.boolean = args.boolean;
  }

  toInstruction(): InstructableInheritedBoolean {
    return {
      ...this,
      inherited: InheritanceState.toInstruction(this.inherited),
    }
  }
}
export interface InstructableInheritedBoolean {
  inherited: InstructableInheritanceState;
  boolean: boolean;
}

export enum PermissivenessType {
  TokenHolder,
  ParentTokenHolder,
  UpdateAuthority,
  Anybody,
}
export namespace PermissivenessType {
  export function toInstruction(state: PermissivenessType): InstructablePermissivenessType {
    switch (state) {
      case PermissivenessType.TokenHolder:
        return { tokenHolder: true };
      case PermissivenessType.ParentTokenHolder:
        return { parentTokenHolder: true };
      case PermissivenessType.UpdateAuthority:
        return { updateAuthority: true };
      case PermissivenessType.Anybody:
        return { anybody: true };
      default:
        throw new Error(`Unknown PermissivenessType: ${state}`);
    }
  }
}
export interface InstructablePermissivenessType {
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
export namespace ChildUpdatePropagationPermissivenessType {
  export function toInstruction(state: ChildUpdatePropagationPermissivenessType): InstructableChildUpdatePropagationPermissivenessType {
    switch (state) {
      case ChildUpdatePropagationPermissivenessType.Usages:
        return { usages: true };
      case ChildUpdatePropagationPermissivenessType.Components:
        return { components: true };
      case ChildUpdatePropagationPermissivenessType.UpdatePermissiveness:
        return { updatePermissiveness: true };
      case ChildUpdatePropagationPermissivenessType.BuildPermissiveness:
        return { buildPermissiveness: true };
      case ChildUpdatePropagationPermissivenessType.ChildUpdatePropagationPermissiveness:
        return { childUpdatePropagationPermissiveness: true };
      case ChildUpdatePropagationPermissivenessType.ChildrenMustBeEditionsPermissiveness:
        return { childrenMustBeEditionsPermissiveness: true };
      case ChildUpdatePropagationPermissivenessType.BuilderMustBeHolderPermissiveness:
        return { builderMustBeHolderPermissiveness: true };
      case ChildUpdatePropagationPermissivenessType.StakingPermissiveness:
        return { stakingPermissiveness: true };
      case ChildUpdatePropagationPermissivenessType.Namespaces:
        return { namespaces: true };
      case ChildUpdatePropagationPermissivenessType.FreeBuildPermissiveness:
        return { freeBuildPermissiveness: true };
      default:
        throw new Error(`Unknown ChildUpdatePropagationPermissivenessType: ${state}`);
    }
  }
}
export interface InstructableChildUpdatePropagationPermissivenessType {
  usages?: boolean;
  components?: boolean;
  updatePermissiveness?: boolean;
  buildPermissiveness?: boolean;
  childUpdatePropagationPermissiveness?: boolean;
  childrenMustBeEditionsPermissiveness?: boolean;
  builderMustBeHolderPermissiveness?: boolean;
  stakingPermissiveness?: boolean;
  namespaces?: boolean;
  freeBuildPermissiveness?: boolean;
}

export enum InheritanceState {
  NotInherited,
  Inherited,
  Overridden,
}
export namespace InheritanceState {
  export function toInstruction(state: InheritanceState): InstructableInheritanceState {
    switch (state) {
      case InheritanceState.NotInherited:
        return { notInherited: true };
      case InheritanceState.Inherited:
        return { inherited: true };
      case InheritanceState.Overridden:
        return { overridden: true };
      default:
        throw new Error(`Unknown inheritance state: ${state}`);
    }
  }
}
export interface InstructableInheritanceState {
  notInherited?: boolean;
  inherited?: boolean;
  overridden?: boolean;
}

export class Root implements Instructable {
  inherited: InheritanceState;
  root: web3.PublicKey;

  constructor(args: { inherited: InheritanceState; root: web3.PublicKey }) {
    this.inherited = args.inherited;
    this.root = args.root;
  }

  toInstruction(): InstructableRoot {
    return {
      ...this,
      inherited: InheritanceState.toInstruction(this.inherited),
    }
  }
}
export interface InstructableRoot {
  inherited: InstructableInheritanceState;
  root: web3.PublicKey;
}

export class Callback implements Instructable {
  key: web3.PublicKey;
  code: BN;

  constructor(args: { key: web3.PublicKey; code: BN }) {
    this.key = args.key;
    this.code = args.code;
  }

  toInstruction(): InstructableCallback {
    return this;
  }
}
export interface InstructableCallback {
  key: web3.PublicKey;
  code: BN;
}

export class NamespaceAndIndex implements Instructable {
  namespace: web3.PublicKey;
  indexed: boolean;
  inherited: InheritanceState;

  constructor(args: {
    namespace: web3.PublicKey;
    indexed: boolean;
    inherited: InheritanceState;
  }) {
    this.namespace = args.namespace;
    this.indexed = args.indexed;
    this.inherited = args.inherited;
  }

  toInstruction(): InstructableNamespaceAndIndex {
    return {
      ...this,
      inherited: InheritanceState.toInstruction(this.inherited),
    }
  }
}

export interface InstructableNamespaceAndIndex {
  namespace: web3.PublicKey;
  indexed: boolean;
  inherited: InstructableInheritanceState;
}
