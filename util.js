const { ethers } = require('ethers');
const {
  CHAINS,
  RPC_URLS,
  UNION_CONTRACT,
  TOKENS,
  GAS_SETTINGS,
  RPC_TIMEOUTS,
  TRANSACTION_SETTINGS
} require('./config.js');

const providerCache = new Map();

const debugLog = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  const safeData = {
    ...data,
    ...(data.value ? { value: data.value.toString() } : {}),
    ...(data.amount ? { amount: data.amount.toString() } : {})
  };
  console.log(`[${timestamp}] DEBUG: ${message}`, JSON.stringify(safeData, null, 2));
};

const getGasParams = async (provider, overrideSettings = {}) => {
  try {
    const feeData = await provider.getFeeData();
    return {
      maxFeePerGas: overrideSettings.maxFeePerGas || feeData.maxFeePerGas || GAS_SETTINGS.minMaxFeePerGas,
      maxPriorityFeePerGas: overrideSettings.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas || GAS_SETTINGS.minPriorityFee,
      gasLimit: overrideSettings.gasLimit || GAS_SETTINGS.defaultGasLimit
    };
  } catch {
    return {
      maxFeePerGas: GAS_SETTINGS.minMaxFeePerGas,
      maxPriorityFeePerGas: GAS_SETTINGS.minPriorityFee,
      gasLimit: GAS_SETTINGS.defaultGasLimit
    };
  }
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
  debugLog("Connected to RPC", { chainKey, url });
  return provider;
};

const executeTransaction = async (contract, method, args, overrides, operationName) => {
  const txResponse = await contract[method](...args, overrides);
  debugLog("Transaction submitted", {
    operation: operationName,
    hash: txResponse.hash
  });

  const receipt = await txResponse.wait(TRANSACTION_SETTINGS.blockConfirmations);
  debugLog("Transaction mined", {
    status: receipt.status === 1 ? "success" : "failed",
    gasUsed: receipt.gasUsed.toString()
  });

  if (receipt.status !== 1) throw new Error("Transaction failed on-chain");
  return receipt;
};

export const sendToken = async ({
  sourceChain,
  destChain,
  asset,
  amount,
  privateKey,
  gasSettings = {},
  recipient = null,
  referral = null
}) => {
  try {
    if (!CHAINS[sourceChain] || !CHAINS[destChain]) {
      throw new Error(`Invalid chain: ${sourceChain} or ${destChain}`);
    }

    const provider = await getProvider(sourceChain);
    const wallet = new ethers.Wallet(privateKey, provider);
    const senderAddress = await wallet.getAddress();
    const recipientAddress = recipient ? ethers.getAddress(recipient) : senderAddress;

    const gasParams = await getGasParams(provider, gasSettings);
    const bridgeAddress = UNION_CONTRACT[sourceChain];
    if (!bridgeAddress) throw new Error(`Missing bridge contract for ${sourceChain}`);

    const isNative = asset.toLowerCase() === 'native';

    if (isNative) {
      const bridge = new ethers.Contract(
        bridgeAddress,
        [
          'function depositNative(uint16 destChainId, address recipient, address referral) payable',
          'function depositNative(uint16 destChainId, address recipient) payable'
        ],
        wallet
      );

      try {
        return (
          await executeTransaction(
            bridge,
            'depositNative',
            [CHAINS[destChain], recipientAddress, referral || ethers.ZeroAddress],
            { value: ethers.parseEther(amount.toString()), ...gasParams },
            'nativeDeposit'
          )
        ).hash;
      } catch {
        return (
          await executeTransaction(
            bridge,
            'depositNative',
            [CHAINS[destChain], recipientAddress],
            { value: ethers.parseEther(amount.toString()), ...gasParams },
            'nativeDepositFallback'
          )
        ).hash;
      }
    }

    const tokenAddress = TOKENS[asset][sourceChain].contractAddress;
    const erc20 = new ethers.Contract(
      tokenAddress,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function balanceOf(address owner) view returns (uint256)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ],
      wallet
    );

    const decimals = await erc20.decimals().catch(() => 18);
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
    const balance = await erc20.balanceOf(senderAddress);
    if (balance < parsedAmount) {
      throw new Error(`Insufficient balance. Need ${amount}, has ${ethers.formatUnits(balance, decimals)}`);
    }

    const allowance = await erc20.allowance(senderAddress, bridgeAddress);
    if (allowance < parsedAmount) {
      await executeTransaction(
        erc20,
        'approve',
        [bridgeAddress, parsedAmount * 2n],
        { ...gasParams, gasLimit: 100000 },
        'tokenApproval'
      );
    }

    const bridge = new ethers.Contract(
      bridgeAddress,
      [
        'function depositERC20(address token, uint256 amount, uint16 destChainId, address recipient, address referral)',
        'function depositERC20(address token, uint256 amount, uint16 destChainId, address recipient)'
      ],
      wallet
    );

    try {
      return (
        await executeTransaction(
          bridge,
          'depositERC20',
          [tokenAddress, parsedAmount, CHAINS[destChain], recipientAddress, referral || ethers.ZeroAddress],
          { ...gasParams, gasLimit: 300000 },
          'tokenBridgeTransfer'
        )
      ).hash;
    } catch {
      return (
        await executeTransaction(
          bridge,
          'depositERC20',
          [tokenAddress, parsedAmount, CHAINS[destChain], recipientAddress],
          { ...gasParams, gasLimit: 300000 },
          'tokenBridgeTransferFallback'
        )
      ).hash;
    }
  } catch (error) {
    debugLog("Bridge transfer failed", {
      error: {
        message: error.message,
        code: error.code
      }
    });
    throw error;
  }
};
