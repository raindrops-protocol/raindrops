import { web3 } from "@project-serum/anchor";
import { NamespaceAndIndex } from "./common";
import * as pids from "../constants/programIds";

export class PermissivenessSettings {
  namespacePermissiveness: Permissiveness;
  itemPermissiveness: Permissiveness;
  playerPermissiveness: Permissiveness;
  matchPermissiveness: Permissiveness;
  missionPermissiveness: Permissiveness;
  cachePermissiveness: Permissiveness;
}

export enum Permissiveness {
  All,
  Whitelist,
  Blacklist,
  Namespace,
}

// conver enum to an anchor compatible type
export function convertPermissiveness(p: Permissiveness): {} {
  switch (p) {
    case Permissiveness.All:
      return { all: {} };
    case Permissiveness.Whitelist:
      return { whitelist: {} };
    case Permissiveness.Blacklist:
      return { blacklist: {} };
    case Permissiveness.Namespace:
      return { namespace: {} };
    default:
      throw new Error("Invalid Permissiveness");
  }
}

export class ArtifactFilter {
  filter: Filter;
  tokenType: TokenType;
}

export class Filter {
  readonly filter: {} | null;

  constructor(
    filterType: FilterType,
    filterData: FilterNamespaces | FilterCategories | FilterKey
  ) {
    switch (filterType) {
      case FilterType.FilterNamespaces:
        const filterNs = filterData as FilterNamespaces;
        this.filter = { namespace: { namespaces: filterNs.namespaces } };
        break;
      case FilterType.FilterCategories:
        const filterCategories = filterData as FilterCategories;
        this.filter = {
          category: {
            namespace: filterCategories.namespace,
            category: filterCategories.category,
          },
        };
        break;
      case FilterType.FilterKey:
        const filterKeys = filterData as FilterKey;
        this.filter = {
          key: {
            key: filterKeys.key,
            mint: filterKeys.mint,
            metadata: filterKeys.metadata,
            edition: filterKeys.edition,
          },
        };
        break;
    }
  }
}

export enum FilterType {
  FilterNamespaces,
  FilterCategories,
  FilterKey,
}

export class FilterNamespaces {
  readonly namespaces: Array<web3.PublicKey>;

  constructor(namespaces: Array<web3.PublicKey>) {
    this.namespaces = namespaces;
  }
}

export interface FilterCategories {
  namespace: web3.PublicKey;
  category: Array<string> | null;
}

export interface FilterKey {
  key: web3.PublicKey;
  mint: web3.PublicKey;
  metadata: web3.PublicKey;
  edition: web3.PublicKey | null;
}

export enum TokenType {
  Player,
  Item,
  Mission,
  Namespace,
}

// conver enum to an anchor compatible type
export function convertTokenType(tokenType: TokenType): {} {
  switch (tokenType) {
    case TokenType.Item:
      return { item: {} };
    case TokenType.Mission:
      return { mission: {} };
    case TokenType.Namespace:
      return { namespace: {} };
    case TokenType.Player:
      return { player: {} };
    default:
      throw new Error("Invalid TokenType");
  }
}

export class Namespace {
  key: web3.PublicKey;
  namespaces: NamespaceAndIndex[] | null;
  mint: web3.PublicKey | null;
  metadata: web3.PublicKey | null;
  masterEdition: web3.PublicKey | null;
  uuid: string | null;
  prettyName: string | null;
  artifactsAdded: number;
  maxPages: number;
  fullPages: number[];
  artifactsCached: number;
  permissivenessSettings: PermissivenessSettings | null;
  bump: number;
  whitelistedStakingMints: web3.PublicKey[];
  gatekeeper: web3.PublicKey | null;

  constructor(key, data) {
    this.key = key;
    this.namespaces = data.namespaces;
    this.mint = data.mint;
    this.metadata = data.metadata;
    this.masterEdition = data.masterEdition;
    this.uuid = data.uuid;
    this.prettyName = data.prettyName;
    this.artifactsAdded = data.artifactsAdded.toNumber();
    this.maxPages = data.maxPages.toNumber();
    this.fullPages = data.fullPages;
    this.artifactsCached = data.artifactsCached.toNumber();
    this.permissivenessSettings = data.permissivenessSettings;
    this.bump = data.bump;
    this.whitelistedStakingMints = data.whitelistedStakingMints;
    this.gatekeeper = data.gatekeeper;
  }

  print(log) {
    log.info("Namespace:", this.key.toBase58());

    log.info(`Namespaces: ${this.namespaces ? "[" : "[]"}`);
    if (this.namespaces) {
      this.namespaces.map((n) => {
        log.info(`{`);
        log.info(`\tnamespace: ${n.namespace.toBase58()}`);
        log.info(`\tindex: ${n.index}`);
        log.info(`\tinherited: ${Object.keys(n.inherited).join(", ")}`);
        log.info(`}`);
      });
      log.info("]");
    }

    log.info(
      "Mint:",
      this.mint ? this.mint.toBase58() : "Not cached on object"
    );
    log.info(
      "Metadata:",
      this.metadata ? this.metadata.toBase58() : "Not cached on object"
    );
    log.info(
      "Master Edition:",
      this.masterEdition
        ? this.masterEdition.toBase58()
        : "Not cached on object"
    );
    log.info("UUID:", this.uuid ? this.uuid : "Not cached on object");
    log.info(
      "Pretty Name:",
      this.prettyName ? this.prettyName : "Not cached on object"
    );
    log.info(
      "Artifacts Added:",
      this.artifactsAdded ? this.artifactsAdded : "Not cached on object"
    );
    log.info(
      "Max Pages:",
      this.maxPages ? this.maxPages : "Not cached on object"
    );
    log.info(
      "Aritfacts Cached:",
      this.artifactsCached ? this.artifactsCached : "Not cached on object"
    );

    log.info("Permissiveness Settings: {");
    log.info(
      `\tNamespace Permissiveness: ${Object.keys(
        this.permissivenessSettings.namespacePermissiveness
      ).join(", ")}`
    );
    log.info(
      `\tItem Permissiveness: ${Object.keys(
        this.permissivenessSettings.itemPermissiveness
      ).join(", ")}`
    );
    log.info(
      `\tPlayer Permissiveness: ${Object.keys(
        this.permissivenessSettings.playerPermissiveness
      ).join(", ")}`
    );
    log.info(
      `\tMatch Permissiveness: ${Object.keys(
        this.permissivenessSettings.matchPermissiveness
      ).join(", ")}`
    );
    log.info(
      `\tMission Permissiveness: ${Object.keys(
        this.permissivenessSettings.missionPermissiveness
      ).join(", ")}`
    );
    log.info(
      `\tCache Permissiveness: ${Object.keys(
        this.permissivenessSettings.cachePermissiveness
      ).join(", ")}`
    );
    log.info("}");

    log.info("Bump:", this.bump ? this.bump : "Not cached on object");

    log.info(
      `Whitelist Staking Mints: [${
        this.whitelistedStakingMints?.length > 0 ? "" : "]"
      }`
    );
    if (this.whitelistedStakingMints?.length > 0) {
      this.whitelistedStakingMints.map((wlStakingMint) => {
        log.info(`\t${wlStakingMint.toBase58()}`);
      });
      log.info("]");
    }
  }
}

export class NamespaceGatekeeper {
  address: web3.PublicKey;
  artifactFilters: [];
  namespace: web3.PublicKey;
  bump: number;

  constructor(address, data) {
    this.address = address;
    this.artifactFilters = data.artifactFilters;
    this.namespace = data.namespace;
    this.bump = data.bump;
  }
}

export class NamespaceIndex {
  address: web3.PublicKey;
  namespace: web3.PublicKey;
  bump: number;
  page: number;
  caches: web3.PublicKey[];

  constructor(address, data) {
    this.address = address;
    this.namespace = data.namespace;
    this.bump = data.bump;
    this.page = data.page;
    this.caches = data.caches;
  }
}

export enum RaindropsProgram {
  Item,
  Namespace,
  Matches,
  Staking,
  Player,
}

export namespace RaindropsProgram {
  export function getRaindropsProgram(program: RaindropsProgram): web3.PublicKey {
    switch(program) {
      case RaindropsProgram.Item:
        return pids.ITEM_ID;
      case RaindropsProgram.Namespace:
        return pids.NAMESPACE_ID;
      case RaindropsProgram.Matches:
        return pids.MATCHES_ID;
      case RaindropsProgram.Player:
        return pids.PLAYER_ID;
      case RaindropsProgram.Staking:
        return pids.STAKING_ID;
      default:
        throw new Error(`Unknown RaindropsProgram: ${program}`);
    };
  }
}