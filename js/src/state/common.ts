import { web3, BN } from "@project-serum/anchor";

export interface Permissiveness {
  inherited: InheritanceState;
  permissivenessType: PermissivenessType;
}

export interface PermissivenessType {
  tokenHolder?: boolean;
  parentTokenHolder?: boolean;
  updateAuthority?: boolean;
  anybody?: boolean;
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
  key: web3.PublicKey;
  code: BN;
}
