import { web3 } from "@project-serum/anchor";

type Cluster = {
  name: string;
  url: string;
};
export const CLUSTERS: Cluster[] = [
  {
    name: "mainnet-beta",
    url: "https://api.metaplex.solana.com/",
  },
  {
    name: "testnet",
    url: web3.clusterApiUrl("testnet"),
  },
  {
    name: "devnet",
    url: web3.clusterApiUrl("devnet"),
  },
];
export const DEFAULT_CLUSTER = CLUSTERS[2];
export function getCluster(name: string): string {
  for (const cluster of CLUSTERS) {
    if (cluster.name === name) {
      return cluster.url;
    }
  }
  return DEFAULT_CLUSTER.url;
}
