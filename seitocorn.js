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
    _instruction_hash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({
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
    }) + Date.now())),
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

  // Construct the instruction payload
  const instructionPayload = {
    instruction: {
      _index: "",
      _instruction_hash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({
        opcode: 2,
        operand: {
          _type: "Batch",
          instructions: [instructionData]
        },
        version: 0
      }) + Date.now())),
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

  // Define the ABI types in a simplified way
  const types = {
    FungibleAssetOrder: [
      { name: "_type", type: "string" },
      { name: "baseAmount", type: "bytes32" },
      { name: "baseToken", type: "address" },
      { name: "baseTokenDecimals", type: "uint8" },
      { name: "baseTokenName", type: "string" },
      { name: "baseTokenPath", type: "string" },
      { name: "baseTokenSymbol", type: "string" },
      { name: "quoteAmount", type: "bytes32" },
      { name: "quoteToken", type: "address" },
      { name: "receiver", type: "string" },
      { name: "sender", type: "string" }
    ],
    Instruction: [
      { name: "_index", type: "string" },
      { name: "_instruction_hash", type: "bytes32" },
      { name: "opcode", type: "uint8" },
      { name: "operand", type: "FungibleAssetOrder" },
      { name: "version", type: "uint8" }
    ],
    BatchOperand: [
      { name: "_type", type: "string" },
      { name: "instructions", type: "Instruction[]" }
    ],
    MainInstruction: [
      { name: "_index", type: "string" },
      { name: "_instruction_hash", type: "bytes32" },
      { name: "opcode", type: "uint8" },
      { name: "operand", type: "BatchOperand" },
      { name: "version", type: "uint8" }
    ],
    Payload: [
      { name: "instruction", type: "MainInstruction" },
      { name: "path", type: "string" },
      { name: "salt", type: "bytes32" }
    ]
  };

  // Flatten the structure for encoding
  const flattenedPayload = {
    instruction: {
      _index: instructionPayload.instruction._index,
      _instruction_hash: instructionPayload.instruction._instruction_hash,
      opcode: instructionPayload.instruction.opcode,
      operand: {
        _type: instructionPayload.instruction.operand._type,
        instructions: instructionPayload.instruction.operand.instructions.map(inst => ({
          _index: inst._index,
          _instruction_hash: inst._instruction_hash,
          opcode: inst.opcode,
          operand: inst.operand,
          version: inst.version
        }))
      },
      version: instructionPayload.instruction.version
    },
    path: instructionPayload.path,
    salt: instructionPayload.salt
  };

  // Encode using the ABI coder
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedInstruction = abiCoder.encode(
    [
      "tuple(" +
        "string _index, " +
        "bytes32 _instruction_hash, " +
        "uint8 opcode, " +
        "tuple(" +
          "string _type, " +
          "tuple(" +
            "string _index, " +
            "bytes32 _instruction_hash, " +
            "uint8 opcode, " +
            "tuple(" +
              "string _type, " +
              "bytes32 baseAmount, " +
              "address baseToken, " +
              "uint8 baseTokenDecimals, " +
              "string baseTokenName, " +
              "string baseTokenPath, " +
              "string baseTokenSymbol, " +
              "bytes32 quoteAmount, " +
              "address quoteToken, " +
              "string receiver, " +
              "string sender" +
            ") operand, " +
            "uint8 version" +
          ")[] instructions" +
        ") operand, " +
        "uint8 version" +
      ") instruction, " +
      "string path, " +
      "bytes32 salt"
    ],
    [flattenedPayload]
  );

  // Encode the full payload
  const payload = abiCoder.encode(
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
