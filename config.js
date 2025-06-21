const { ethers } = require('ethers');

const CHAINS = {
  SEI: 1328,        // Sei Testnet
  CORN: 21000001    // Corn Testnet
};

const RPC_URLS = {
  SEI: 'https://evm-rpc-testnet.sei-apis.com',
  CORN: 'https://rpc.ankr.com/corn_testnet'
};

const TOKENS = {
  
    SEI: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'// Replace with actual
    
//    CORN: {
  //    contractAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Replace with actual
 //   }
  
};

const UNION_CONTRACT = {
  SEI: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03'
//  CORN: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03'
};

const EXPLORERS = {
  SEI: 'https://seitrace.com',
//  CORN: 'https://corn-testnet.etherscan.io'
};

const GAS_SETTINGS = {
  defaultGasLimit: 300000,
  minMaxFeePerGas: ethers.parseUnits("1.2", "gwei"),
  minPriorityFee: ethers.parseUnits("1.1", "gwei"),
  retryDelay: 5000,
  maxFeeBuffer: 1.0,
  maxPriorityBuffer: 1.0
};

const RPC_TIMEOUTS = {
  connection: 15000,
  request: 30000
};

const TRANSACTION_SETTINGS = {
  maxRetries: 5,
  confirmationTimeout: 120000,
  blockConfirmations: 2
};

const BRIDGE_SETTINGS = {
  minApprovalAmount: ethers.parseUnits("1000", "ether"),
  operationTimeout: 300000
};

const validateGasSettings = () => {
  console.log("Active Gas Settings:", {
    maxFee: ethers.formatUnits(GAS_SETTINGS.minMaxFeePerGas, "gwei") + " gwei",
    priorityFee: ethers.formatUnits(GAS_SETTINGS.minPriorityFee, "gwei") + " gwei",
    gasLimit: GAS_SETTINGS.defaultGasLimit
  });
};

const getWalletBalance = async (provider, chain, token) => {
  const walletAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; // Replace with real wallet
  const tokenContract = new ethers.Contract(
    TOKENS[token][chain].contractAddress,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  const balance = await tokenContract.balanceOf(walletAddress);
  return ethers.formatUnits(balance, 18); // assuming 18 decimals
};

module.exports = {
  CHAINS,
  RPC_URLS,
  TOKENS,
  UNION_CONTRACT,
  EXPLORERS,
  GAS_SETTINGS,
  RPC_TIMEOUTS,
  TRANSACTION_SETTINGS,
  BRIDGE_SETTINGS,
  validateGasSettings,
  getWalletBalance
};
