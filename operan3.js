// Import ethers.js using CommonJS syntax
const { ethers } = require('ethers');

// Replace with the actual Sei EVM RPC URL (for testing purposes)
const seiEvmRpcUrl = 'https://rpc.ankr.com/corn_testnet'; // Example: 'https://sei-evm-rpc-url.com'

// Create a provider to connect to Sei EVM
const provider = new ethers.JsonRpcProvider(seiEvmRpcUrl);

async function getSeiChainId() {
  try {
    const network = await provider.getNetwork();
    console.log(`Sei EVM Chain ID: ${network.chainId}`);
  } catch (error) {
    console.error('Failed to fetch chain ID:', error);
  }
}

getSeiChainId();
