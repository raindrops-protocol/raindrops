import { BN, web3 } from "@project-serum/anchor";
import {
  ChildUpdatePropagationPermissiveness,
  NamespaceAndIndex,
  Permissiveness,
} from "./common";

export class ArtifactClassData {
  childrenMustBeEditions: boolean | null;
  builderMustBeHolder: boolean | null;
  updatePermissiveness: Permissiveness[] | null;
  buildPermissiveness: Permissiveness[] | null;
  stakingWarmUpDuration: BN | null;
  stakingCooldownDuration: BN | null;
  stakingPermissiveness: Permissiveness[] | null;
  unstakingPermissiveness: Permissiveness[] | null;
  childUpdatePropagationPermissiveness:
    | ChildUpdatePropagationPermissiveness[]
    | null;

  constructor(args: {
    childrenMustBeEditions: boolean | null;
    builderMustBeHolder: boolean | null;
    updatePermissiveness: Permissiveness[] | null;
    buildPermissiveness: Permissiveness[] | null;
    stakingWarmUpDuration: BN | null;
    stakingCooldownDuration: BN | null;
    stakingPermissiveness: Permissiveness[] | null;
    unstakingPermissiveness: Permissiveness[] | null;
    childUpdatePropagationPermissiveness:
      | ChildUpdatePropagationPermissiveness[]
      | null;
  }) {
    this.childrenMustBeEditions = args.childrenMustBeEditions;
    this.builderMustBeHolder = args.builderMustBeHolder;
    this.updatePermissiveness = args.updatePermissiveness;
    this.buildPermissiveness = args.buildPermissiveness;
    this.stakingWarmUpDuration = args.stakingWarmUpDuration;
    this.stakingCooldownDuration = args.stakingCooldownDuration;
    this.stakingPermissiveness = args.stakingPermissiveness;
    this.unstakingPermissiveness = args.unstakingPermissiveness;
    this.childUpdatePropagationPermissiveness =
      args.childUpdatePropagationPermissiveness;
  }
}

export class ArtifactClass {
  namespaces: NamespaceAndIndex[] | null;
  parent: web3.PublicKey | null;
  mint: web3.PublicKey | null;
  metadata: web3.PublicKey | null;
  edition: web3.PublicKey | null;
  bump: number;
  existingChildren: BN;
  data: ArtifactClassData;

  constructor(args: {
    namespaces: NamespaceAndIndex[] | null;
    parent: web3.PublicKey | null;
    mint: web3.PublicKey | null;
    metadata: web3.PublicKey | null;
    edition: web3.PublicKey | null;
    bump: number;
    existingChildren: BN;
    data: ArtifactClassData;
  }) {
    this.namespaces = args.namespaces;
    this.parent = args.parent;
    this.mint = args.mint;
    this.metadata = args.metadata;
    this.edition = args.edition;
    this.bump = args.bump;
    this.existingChildren = args.existingChildren;
    this.data = args.data;
  }
}

export class StakingCounter {
  bump: number;
  eventStart: BN;
  eventType: BN;

  constructor(args: { bump: number; eventStart: BN; eventType: BN }) {
    this.bump = args.bump;
    this.eventStart = args.eventStart;
    this.eventType = args.eventType;
  }
}

export class Artifact {
  namespaces: NamespaceAndIndex[] | null;
  parent: web3.PublicKey | null;
  mint: web3.PublicKey | null;
  metadata: web3.PublicKey | null;
  edition: web3.PublicKey | null;
  bump: number;
  tokenStaked: BN;

  constructor(args: {
    namespaces: NamespaceAndIndex[] | null;
    parent: web3.PublicKey | null;
    mint: web3.PublicKey | null;
    metadata: web3.PublicKey | null;
    edition: web3.PublicKey | null;
    bump: number;
    tokenStaked: BN;
  }) {
    this.namespaces = args.namespaces;
    this.parent = args.parent;
    this.mint = args.mint;
    this.metadata = args.metadata;
    this.edition = args.edition;
    this.bump = args.bump;
    this.tokenStaked = args.tokenStaked;
  }
}
