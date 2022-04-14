import { web3, BN } from "@project-serum/anchor";
import { Callback } from "./common";

export interface AnchorMatchState {
  draft?: boolean;
  initialized?: boolean;
  started?: boolean;
  finalized?: boolean;
  paidOut?: boolean;
  deactivated?: boolean;
}

export interface AnchorTokenEntryValidation {
  filter: AnchorFilter;
  isBlacklist: boolean;
  validation: null | Callback;
}

export interface AnchorFilter {
  none?: boolean;
  all?: boolean;
  namespace?: { namespace: web3.PublicKey };
  parent?: { key: web3.PublicKey };
  mint?: { mint: web3.PublicKey };
}

export enum MatchState {
  Draft,
  Initialized,
  Started,
  Finalized,
  PaidOut,
  Deactivated,
}

export enum TokenTransferType {
  PlayerToPlayer,
  PlayerToEntrant,
  Normal,
}

export enum TokenType {
  Player,
  Item,
  Any,
}

export interface AnchorTokenTransferType {
  playerToPlayer?: boolean;
  playerToEntrant?: boolean;
  normal?: boolean;
}
export interface AnchorTokenDelta {
  from: web3.PublicKey;
  to: web3.PublicKey | null;
  tokenTransferType: AnchorTokenTransferType;
  mint: web3.PublicKey;
  amount: BN;
}
