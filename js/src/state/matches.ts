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
