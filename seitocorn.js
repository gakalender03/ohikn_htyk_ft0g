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
  if (providerCache.has(chainKey)) return providerCache.get(chainKey);

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
  recipient,
  amountETH = '0.000001',
  channelId = 2, 
  timeoutHeight, 
  timeoutTimestamp, 
  salt,
  instruction
}) => {
  if (!CHAINS[sourceChain]) throw new Error('Unsupported chain');
  if (!privateKey || !privateKey.match(/^0x[0-9a-fA-F]{64}$/)) {
    throw new Error('Invalid private key');
  }

  const provider = await getProvider(sourceChain);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Verify that wallet.getAddress() returns a string
  const sender = await wallet.getAddress();
  if (typeof sender !== 'string') {
    throw new Error('Expected wallet.getAddress() to return a string');
  }
  const senderLowercase = sender.toLowerCase();

  const bridgeAddr = UNION_CONTRACT[sourceChain];
  const gasParams = await getGasParams(provider);

  // Get current block and calculate timeoutHeight
  const currentBlock = await provider.getBlockNumber();
  const timeoutHeight = 0;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const twoDaysInSeconds = 12 * 24 * 60 * 60;
  const timeoutTimestamp = BigInt(nowInSeconds + twoDaysInSeconds) * BigInt(1000000000);
  const salt = ethers.hexlify(ethers.randomBytes(32));

  // Encode instruction (example: transfer(address,uint256))
  const iface = new ethers.Interface([
    'function transfer(address,uint256)'
  ]);
  const encodedInstruction = iface.encodeFunctionData('transfer', [
    recipient,
    ethers.parseEther(amountETH)
  ]);

  // Wrap as (uint8,uint8,bytes)
  const instruction = [0, 2, encodedInstruction];

  const abi = [
    'function send(uint32,uint64,uint64,bytes32,(uint8,uint8,bytes)) payable'
  ];
  const bridge = new ethers.Contract(bridgeAddr, abi, wallet);

  const value = ethers.parseEther(amountETH);

  debugLog('Sending encoded instruction through bridge', {
    from: senderLowercase,
    recipient,
    amount: `${amountETH} ETH`,
    channelId,
    timeoutHeight: timeoutHeight.toString(),
    encodedInstruction
  });

  const tx = await executeTx(
    bridge,
    'send',
    [channelId, timeoutHeight, timeoutTimestamp, salt, instruction],
    {
      value,
      ...gasParams
    }
  );

  return tx.hash;
};


module.exports = {
  sendTestETH
};
