import { BN, Program, web3 } from "@project-serum/anchor";
import { deserializeUnchecked } from "borsh";
import { extendBorsh } from "../utils/borsh";
import { NamespaceAndIndex } from "./common";

extendBorsh();

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

export const decodeNamespace = (buffer: Buffer): Namespace => {
  const metadata = deserializeUnchecked(
    NAMESPACE_SCHEMA,
    Namespace,
    buffer,
  ) as Namespace;
  return metadata;
}

export class Namespace {
  program: Program | null;
  key: BN;
  namespaces: NamespaceAndIndex[] | null;
  mint: web3.PublicKey | null;
  metadata: web3.PublicKey | null;
  masterEdition: web3.PublicKey | null;
  uuid: string | null;
  prettyName: string | null;
  artifactsAdded: number;
  highestPage: number;
  artifactsCached: number;
  permissiveSettings: PermissivenessSettings | null;
  bump: number;
  whitelistedStakingMints: web3.PublicKey[] | null;
}

export const NAMESPACE_SCHEMA = new Map<any, any>([
  [
    Namespace,
    {
      kind: "struct",
      fields: [
        ["key", "u64"],
        ["namespaces", { kind: "option", type: [NamespaceAndIndex] }],
        ["mint", "pubkey"],
        ["metadata", "pubkey"],
        ["masterEdition", "pubkey"],
        ["uuid", "string"],
        ["prettyName", "string"],
        ["artifactsAdded", "u64"],
        ["highestPage", "u64"],
        ["artifactsCached", "u64"],
        ["permissivenessSettings", PermissivenessSettings],
        ["bump", "u8"],
        ["whitelistedStakingMints", ["pubkey"] ],
      ]
    }
  ]
])
