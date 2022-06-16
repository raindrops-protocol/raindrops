// const { LOCALHOST, tmpLedgerDir } = import('@metaplex-foundation/amman');

// console.log(LOCALHOST)
const LOCALHOST = "http://localhost:8899";
const WSLOCALHOST = "ws://localhost:8900/";

module.exports = {
  validator: {
    killRunningValidators: true,
    programs: [
      {
        label: 'Token Metadata Program',
        programId: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
        deployPath: localDeployPath('mpl_token_metadata')
      },
      {
        label: 'Raindrops protocol Namespace Program',
        programId: "nameAxQRRBnd4kLfsVoZBBXfrByZdZTkh8mULLxLyqV",
        deployPath: localDeployPath('raindrops-protocol-namespace')
      },
    ],
    jsonRpcUrl: LOCALHOST,
    websocketUrl: WSLOCALHOST,
    commitment: 'singleGossip',
    ledgerDir: '.anchor/ledger',
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
    storageId: 'mock-storage',
    clearOnStart: false,
  },
}

function localDeployPath(program) {
  switch(program) {
    case 'mpl_token_metadata':
      return "../metaplex-program-library/target/deploy/mpl_token_metadata.so";
    case 'raindrops-protocol-namespace':
      return "rust/target/deploy/raindrops_namespace.so";
    default:
      throw new Error(`Unknown program ${program}`);
  }
}
