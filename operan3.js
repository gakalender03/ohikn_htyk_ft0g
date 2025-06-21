import { ethers } from 'ethers';

const seiEvmRpcUrl = 'https://evm-rpc-testnet.sei-apis.com'; // Replace with actual Sei EVM RPC URL

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
