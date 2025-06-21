const { ethers } = require('ethers');
import {
  CHAINS,
  RPC_URLS,
  UNION_CONTRACT,
  TOKENS,
  GAS_SETTINGS,
  RPC_TIMEOUTS,
  TRANSACTION_SETTINGS
} from './config.js';

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

export const sendTestETH = async ({
  sourceChain = 'SEI',
  destChain = 'CORN',
  privateKey,
  recipient = null,
  referral = null
}) => {
  if (!CHAINS[sourceChain] || !CHAINS[destChain]) {
    throw new Error('Unsupported chain');
  }

  if (!privateKey || !privateKey.match(/^0x[0-9a-fA-F]{64}$/)) {
    throw new Error('Invalid private key');
  }

  const provider = await getProvider(sourceChain);
  const wallet = new ethers.Wallet(privateKey, provider);
  const sender = await wallet.getAddress();
  const recipientAddr = recipient || sender;
  const bridgeAddr = UNION_CONTRACT[sourceChain];

  const gasParams = await getGasParams(provider);
  const amount = ethers.parseEther('0.000001'); // fixed value

  const bridge = new ethers.Contract(
    bridgeAddr,
    [
      'function depositNative(uint16 destChainId, address recipient, address referral) payable',
      'function depositNative(uint16 destChainId, address recipient) payable'
    ],
    wallet
  );

  debugLog('Initiating test bridge tx', {
    from: sender,
    to: recipientAddr,
    amount: '0.000001 ETH',
    sourceChain,
    destChain
  });

  try {
    const tx = await executeTx(
      bridge,
      'depositNative',
      [CHAINS[destChain], recipientAddr, referral || ethers.ZeroAddress],
      { value: amount, ...gasParams }
    );
    return tx.hash;
  } catch (err) {
    debugLog('Fallback to non-referral bridge method', { reason: err.message });
    const tx = await executeTx(
      bridge,
      'depositNative',
      [CHAINS[destChain], recipientAddr],
      { value: amount, ...gasParams }
    );
    return tx.hash;
  }
};
