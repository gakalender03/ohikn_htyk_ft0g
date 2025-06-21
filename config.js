import { ethers } from 'ethers';

// Chain IDs (Updated)
export const CHAINS = {
  SEI: 1328,        // Sei Testnet
  CORN: 21000001    // Corn Testnet
};

// RPC Endpoints (Updated)
export const RPC_URLS = {
  SEI: 'https://evm-rpc-testnet.sei-apis.com',
  CORN: 'https://rpc.ankr.com/corn_testnet'
};

// Token Contracts (Updated with direct use of wallet address in the contract interaction)
export const TOKENS = {
  USDC: {
    SEI: {
      contractAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Replace with actual Sei USDC contract address
    },
    CORN: {
      contractAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Replace with actual Corn USDC contract address
    }
  }
};

// Bridge Contracts (Updated with the specified contract address)
export const UNION_CONTRACT = {
  SEI: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03', // Sei Bridge contract address
  CORN: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03' // Corn Bridge contract address (same for both)
};

// Block Explorers (Updated)
export const EXPLORERS = {
  SEI: 'https://seitrace.com',  // Replace with actual Sei block explorer URL
  CORN: 'https://corn-testnet.etherscan.io' // Replace with Corn block explorer URL
};

// Gas Settings (unchanged, you can keep them as is)
export const GAS_SETTINGS = {
  defaultGasLimit: 300000,
  minMaxFeePerGas: ethers.parseUnits("1.2", "gwei"),  // Fixed 10 Gwei
  minPriorityFee: ethers.parseUnits("1.1", "gwei"),   // Fixed 9.5 Gwei
  retryDelay: 5000,
  maxFeeBuffer: 1.0,  // Disabled buffers
  maxPriorityBuffer: 1.0  // Disabled buffers
};

// Network Timeouts (unchanged)
export const RPC_TIMEOUTS = {
  connection: 15000,
  request: 30000
};

// Transaction Settings (unchanged)
export const TRANSACTION_SETTINGS = {
  maxRetries: 5,
  confirmationTimeout: 120000,
  blockConfirmations: 2
};

// Bridge Settings (unchanged)
export const BRIDGE_SETTINGS = {
  minApprovalAmount: ethers.parseUnits("1000", "ether"),
  operationTimeout: 300000
};

// New: Fee Validator (unchanged)
export const validateGasSettings = () => {
  console.log("Active Gas Settings:", {
    maxFee: ethers.formatUnits(GAS_SETTINGS.minMaxFeePerGas, "gwei") + " gwei",
    priorityFee: ethers.formatUnits(GAS_SETTINGS.minPriorityFee, "gwei") + " gwei",
    gasLimit: GAS_SETTINGS.defaultGasLimit
  });
};

// Optional: Example of interacting with the wallet using token contract
export const getWalletBalance = async (provider, chain, token) => {
  const walletAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; // Directly using the Sei wallet address
  const tokenContract = new ethers.Contract(
    TOKENS[token][chain].contractAddress, 
    ['function balanceOf(address) view returns (uint256)'], 
    provider
  );
  const balance = await tokenContract.balanceOf(walletAddress); // Using the wallet address directly
  return ethers.formatUnits(balance, 18); // assuming 18 decimals for USDC or similar token
};
