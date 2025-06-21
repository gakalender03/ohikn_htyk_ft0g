const { ethers } = require('ethers');
const {
  CHAINS,
  RPC_URLS,
  UNION_CONTRACT,
  GAS_SETTINGS,
  RPC_TIMEOUTS,
  TRANSACTION_SETTINGS
} = require('./config.js');

const providerCache = new Map();

const debugLog = (msg, data = {}) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`, JSON.stringify(data, null, 2));
};

const getProvider = async (chainKey) => {
  if (providerCache.has(chainKey)) {
    return providerCache.get(chainKey);
  }

  const url = RPC_URLS[chainKey];
  const provider = new ethers.JsonRpcProvider(url, {
    chainId: CHAINS[chainKey],
    name: chainKey.toLowerCase()
  });

  await Promise.race([
    provider.getBlockNumber(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`RPC timeout after ${RPC_TIMEOUTS.request}ms`)), RPC_TIMEOUTS.request)
    )
  ]);

  providerCache.set(chainKey, provider);
  return provider;
};

const getGasParams = async (provider) => {
  try {
    const feeData = await provider.getFeeData();
    return {
      maxFeePerGas: feeData.maxFeePerGas || GAS_SETTINGS.minMaxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || GAS_SETTINGS.minPriorityFee,
      gasLimit: GAS_SETTINGS.defaultGasLimit
    };
  } catch {
    return {
      maxFeePerGas: GAS_SETTINGS.minMaxFeePerGas,
      maxPriorityFeePerGas: GAS_SETTINGS.minPriorityFee,
      gasLimit: GAS_SETTINGS.defaultGasLimit
    };
  }
};

const executeTx = async (contract, method, args, overrides) => {
  const tx = await contract[method](...args, overrides);
  debugLog('Tx sent', { hash: tx.hash });
  const receipt = await tx.wait(TRANSACTION_SETTINGS.blockConfirmations);
  if (receipt.status !== 1) throw new Error('Tx failed');
  debugLog('Tx confirmed', { hash: tx.hash, blockNumber: receipt.blockNumber });
  return receipt;
};

const sendTestETH = async ({
  sourceChain = 'SEI',
  privateKey,
  channelId = 1,
  timeoutHeight = 0,
  timeoutTimestamp = 0n,
  salt = ethers.ZeroHash,
  instructionData = "0x123456" // dummy data
}) => {
  if (!CHAINS[sourceChain]) {
    throw new Error('Unsupported chain');
  }

  if (!privateKey || !privateKey.match(/^0x[0-9a-fA-F]{64}$/)) {
    throw new Error('Invalid private key');
  }

  const provider = await getProvider(sourceChain);
  const wallet = new ethers.Wallet(privateKey, provider);
  const sender = await wallet.getAddress();
  const bridgeAddr = UNION_CONTRACT[sourceChain];
  const gasParams = await getGasParams(provider);
  const amount = ethers.parseEther('0.000001');

  // Prepare ABI and contract
  const abi = [
    'function send(uint32,uint64,uint64,bytes32,(uint8,uint8,bytes)) payable'
  ];
  const bridge = new ethers.Contract(bridgeAddr, abi, wallet);

  debugLog('Sending with bridge.send()', {
    from: sender,
    channelId,
    timeoutHeight: timeoutHeight.toString(),
    timeoutTimestamp: timeoutTimestamp.toString(),
    amount: '0.000001 ETH'
  });

  // Prepare instruction tuple
  const instruction = [1, 1, instructionData]; // uint8, uint8, bytes

  const tx = await executeTx(
    bridge,
    'send',
    [channelId, timeoutHeight, timeoutTimestamp, salt, instruction],
    {
      value: amount,
      ...gasParams
    }
  );

  return tx.hash;
};

module.exports = {
  sendTestETH
};
