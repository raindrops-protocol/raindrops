import { web3, BN } from "@project-serum/anchor";

export interface AnchorMatchState {
  draft?: boolean;
  initialized?: boolean;
  started?: boolean;
  finalized?: boolean;
  paidOut?: boolean;
  deactivated?: boolean;
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
