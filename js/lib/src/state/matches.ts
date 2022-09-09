import { web3, BN } from "@project-serum/anchor";
import { u64 } from "@solana/spl-token";
import { Callback, NamespaceAndIndex, Root } from "./common";

export class Match {
  key: web3.PublicKey;
  namespaces: NamespaceAndIndex[] | null;
  winOracle: web3.PublicKey;
  winOracleCooldown: number;
  lastOracleCheck: number;
  authority: web3.PublicKey;
  state: AnchorMatchState;
  leaveAllowed: boolean;
  minimumAllowedEntryTime: number | null;
  bump: number;
  currentTokenTransferIndex: u64;
  tokenTypesAdded: number;
  tokenTypesRemoved: number;
  tokenEntryValidation: AnchorTokenEntryValidation[] | null;
  tokenEntryValidationRoot: Root | null;
  joinAllowedDuringStart: boolean;

  constructor(key, data) {
    this.key = key;
    this.namespaces = data.namespaces;
    this.winOracle = data.winOracle;
    this.winOracleCooldown = data.winOracleCooldown;
    this.lastOracleCheck = data.lastOracleCheck;
    this.authority = data.authority;
    this.state = data.state;
    this.leaveAllowed = data.leaveAllowed;
    this.minimumAllowedEntryTime = data.minimumAllowedEntryTime;
    this.bump = data.bump;
    this.currentTokenTransferIndex = data.currentTokenTransferIndex;
    this.tokenTypesAdded = data.tokenTypesAdded;
    this.tokenTypesRemoved = data.tokenTypesRemoved;
    this.tokenEntryValidation = data.tokenEntryValidation;
    this.tokenEntryValidationRoot = data.tokenEntryValidationRoot;
    this.joinAllowedDuringStart = data.joinAllowedDuringStart;
  }
}

export class WinOracle {
  key: web3.PublicKey;
  finalized: boolean;
  tokenTransferRoot: Root | null;
  tokenTransfers: AnchorTokenDelta[] | null;

  constructor(key, data) {
    this.key = key;
    this.finalized = data.finalized;
    this.tokenTransferRoot = data.tokenTransferRoot;
    this.tokenTransfers = data.tokenTransfers;
  }
}

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

export function transformTokenValidations(args: {
  tokenEntryValidation: AnchorTokenEntryValidation[] | null;
}) {
  if (args.tokenEntryValidation) {
    args.tokenEntryValidation = args.tokenEntryValidation.map((r) => {
      const newRFilter = { ...r.filter };
      Object.keys(newRFilter).forEach((k) => {
        Object.keys(newRFilter[k]).forEach((y) => {
          if (typeof newRFilter[k][y] === "string") {
            newRFilter[k][y] = new web3.PublicKey(newRFilter[k][y]);
          }
        });
      });

      r.filter = newRFilter;

      if (r.validation) {
        if (typeof r.validation.key === "string") {
          r.validation.key = new web3.PublicKey(r.validation.key);
          r.validation.code = new BN(r.validation.code);
        }
      }
      return r;
    });
  }
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
