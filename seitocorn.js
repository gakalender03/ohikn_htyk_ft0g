const { ethers } = require('ethers');
const {
  CHAINS,
  RPC_URLS,
  TOKENS,
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

// Function to generate a unique _instruction_hash
const generateInstructionHash = (instructionData, nonce = '') => {
  const serializedData = JSON.stringify(instructionData) + nonce;
  return ethers.keccak256(ethers.toUtf8Bytes(serializedData));
};

const sendTestETH = async ({
  sourceChain = 'SEI',
  privateKey,
  recipient,
  amountETH = '0.000001',
  channelId = 2
}) => {
  if (!CHAINS[sourceChain]) throw new Error('Unsupported chain');
  if (!privateKey || !privateKey.match(/^0x[0-9a-fA-F]{64}$/)) {
    throw new Error('Invalid private key');
  }

  const provider = await getProvider(sourceChain);
  const wallet = new ethers.Wallet(privateKey, provider);

  const sender = await wallet.getAddress();
  const senderLowercase = sender.toLowerCase().replace('0x', '');
  const recipientNoPrefix = recipient.replace('0x', '');

  const customSender = "14" + senderLowercase.slice(0, 40);
  const customReci = "14" + recipientNoPrefix.slice(0, 40);

  const tokenAddr = TOKENS[sourceChain];
  const bridgeAddr = UNION_CONTRACT[sourceChain];
  const quoteToken = '0xe86bed5b0813430df660d17363b89fe9bd8232d8';

  const gasParams = await getGasParams(provider);

  const currentBlock = await provider.getBlockNumber();
  const timeoutHeight = 0;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const twoDaysInSeconds = 12 * 24 * 60 * 60;
  const timeoutTimestamp = BigInt(nowInSeconds + twoDaysInSeconds) * BigInt(1000000000);
  const salt = ethers.hexlify(ethers.randomBytes(32));

  // Construct the instruction data
  const instructionData = {
    _index: "0",
    opcode: 3,
    operand: {
      _type: "FungibleAssetOrder",
      baseAmount: ethers.toBeHex(ethers.parseEther(amountETH)),
      baseToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      baseTokenDecimals: 18,
      baseTokenName: "Sei",
      baseTokenPath: "0x0",
      baseTokenSymbol: "SEI",
      quoteAmount: ethers.toBeHex(ethers.parseEther(amountETH)),
      quoteToken: quoteToken,
      receiver: customReci,
      sender: customSender
    },
    version: 1
  };

  // Generate a unique _instruction_hash
  const nonce = Date.now().toString(); // Use a timestamp as a nonce
  const _instruction_hash = generateInstructionHash(instructionData, nonce);

  // Construct the instruction payload
  const instructionPayload = {
    instruction: {
      _index: "",
      _instruction_hash: _instruction_hash,
      opcode: 2,
      operand: {
        _type: "Batch",
        instructions: [instructionData]
      },
      version: 0
    },
    path: "0x0",
    salt: salt
  };

  // Encode the instruction payload
  const encodedInstruction = ethers.AbiCoder.defaultAbiCoder().encode(
    ['tuple(tuple(string,bytes32,uint8,tuple(string,tuple(string,bytes32,uint8,tuple(string,bytes32,uint8,string,string,string,string,string,address,address),uint8)[],uint8)),string,bytes32)'],
    [instructionPayload]
  );

  // Encode the full payload
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint32', 'uint64', 'uint64', 'bytes32', 'bytes'],
    [channelId, timeoutHeight, timeoutTimestamp, salt, encodedInstruction]
  );

  console.log('Full Payload:', payload);

  const abi = [
    'function send(uint32,uint64,uint64,bytes32,bytes) payable'
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
    [channelId, timeoutHeight, timeoutTimestamp, salt, encodedInstruction],
    {
      value,
      tokenAddr,
      ...gasParams
    }
  );

  return tx.hash;
};

module.exports = {
  sendTestETH
};
