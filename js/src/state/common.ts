import { web3, BN } from "@project-serum/anchor";

export interface Permissiveness {
  inherited: InheritanceState;
  permissivenessType: PermissivenessType;
}

export enum PermissivenessType {
  TokenHolder,
  ParentTokenHolder,
  UpdateAuthority,
  Anybody,
}

export enum InheritanceState {
  NotInherited,
  Inherited,
  Overridden,
}

export interface Root {
  inherited: InheritanceState;
  root: Uint8Array[];
}

export interface Callback {
  program: web3.PublicKey;
  enum: BN;
}
