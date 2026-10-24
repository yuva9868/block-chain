try {
  require('@nomicfoundation/hardhat-toolbox');
} catch {
  // Fallback: load individual plugins if toolbox is unavailable
  try { require('@nomicfoundation/hardhat-chai-matchers'); } catch { /* optional */ }
  try { require('@nomicfoundation/hardhat-ethers'); } catch { /* optional */ }
  try { require('hardhat-gas-reporter'); } catch { /* optional */ }
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: process.env.RPC_URL || 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || '',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
};
