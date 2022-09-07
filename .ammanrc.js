// const { LOCALHOST, tmpLedgerDir } = import('@metaplex-foundation/amman');

// console.log(LOCALHOST)
const LOCALHOST = "http://localhost:8899";
const WSLOCALHOST = "ws://localhost:8900/";

module.exports = {
  validator: {
    killRunningValidators: true,
    programs: [
      {
        label: "Token Metadata Program",
        programId: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
        deployPath: localDeployPath("mpl_token_metadata"),
      },
      {
        label: "Raindrops protocol Item Program",
        programId: "itemX1XWs9dK8T2Zca4vEEPfCAhRc7yvYFntPjTTVx6",
        deployPath: localDeployPath("raindrops-protocol-item"),
      },
      {
        label: "Raindrops protocol Player Program",
        programId: "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98",
        deployPath: localDeployPath("raindrops-protocol-player"),
      },
      {
        label: "Raindrops protocol Namespace Program",
        programId: "nameAxQRRBnd4kLfsVoZBBXfrByZdZTkh8mULLxLyqV",
        deployPath: localDeployPath("raindrops-protocol-namespace"),
      },
      {
        label: "Raindrops protocol Staking Program",
        programId: "stk9HFnKhZN2PZjnn5C4wTzmeiAEgsDkbqnHkNjX1Z4",
        deployPath: localDeployPath("raindrops-protocol-staking"),
      },
    ],
    jsonRpcUrl: LOCALHOST,
    websocketUrl: WSLOCALHOST,
    commitment: "singleGossip",
    ledgerDir: ".anchor/ledger",
    resetLedger: true,
    verifyFees: false,
    detached: process.env.CI != null,
  },
  relay: {
    enabled: process.env.CI == null,
    killlRunningRelay: true,
    // accountProviders: {
    //   "nameAxQRRBnd4kLfsVoZBBXfrByZdZTkh8mULLxLyqV": {
    //     fromAccountInfo
    //   }
    // },
  },
  storage: {
    enabled: process.env.CI == null,
    storageId: "mock-storage",
    clearOnStart: false,
  },
};

function localDeployPath(program) {
  switch (program) {
    case "mpl_token_metadata":
      return "../metaplex-program-library/target/deploy/mpl_token_metadata.so";
    case "raindrops-protocol-item":
      return "rust/target/deploy/raindrops_item.so";
    case "raindrops-protocol-player":
      return "rust/target/deploy/raindrops_player.so";
    case "raindrops-protocol-namespace":
      return "rust/target/deploy/raindrops_namespace.so";
    case "raindrops-protocol-staking":
      return "rust/target/deploy/raindrops_staking.so";
    default:
      throw new Error(`Unknown program ${program}`);
  }
}
