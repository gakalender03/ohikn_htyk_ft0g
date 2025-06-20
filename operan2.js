const { ethers } = require('ethers');
const axios = require('axios');

// ========== CONFIGURATION ==========
const CONFIG = {
  SEI_RPC: 'https://evm-rpc-testnet.sei-apis.com', // Sei testnet RPC
  UNION_GRAPHQL: 'https://graphql.union.build/v1/graphql',
  CONTRACT_ADDRESS: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03', // Union Bridge contract address
  GAS_LIMIT: 300000, // Increased gas limit
  EXPLORER_URL: 'https://seitrace.com', // Replace with Sei/Corn explorer if available
};

// ========== UTILITIES ==========
class Utils {
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static timelog() {
    return new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  }

  // Helper to generate dynamic instruction payload
  static generateInstructionPayload(senderAddress, destinationAddress, amount) {
    // Remove '0x' prefix if present
    const cleanAddress = (addr) => addr.startsWith('0x') ? addr.substring(2) : addr;
    
    // Convert amount to 32-byte hex string
    const amountHex = ethers.toBeHex(amount, 32);
    
    // Encode the payload using ABI coder
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      [
        'tuple(bytes32,bytes32,bytes32,bytes32,bytes32)',
        'tuple(bytes32,bytes32,bytes32,bytes32,bytes32)'
      ],
      [
        [
          ethers.zeroPadValue(ethers.toUtf8Bytes('sourceAddress'), 32),
          ethers.zeroPadValue('0x' + cleanAddress(senderAddress), 32),
          ethers.zeroPadValue(ethers.toUtf8Bytes('amount'), 32),
          ethers.zeroPadValue(ethers.toUtf8Bytes(amount.toString()), 32),
          ethers.zeroPadValue(ethers.toUtf8Bytes('tokenAddress'), 32)
        ],
        [
          ethers.zeroPadValue('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 32), // Native token
          ethers.zeroPadValue(ethers.toUtf8Bytes('destinationAddress'), 32),
          ethers.zeroPadValue('0x' + cleanAddress(destinationAddress), 32),
          ethers.zeroPadValue(ethers.toUtf8Bytes('denom'), 32),
          ethers.zeroPadValue(ethers.toUtf8Bytes('SEI'), 32)
        ]
      ]
    );

    return [
      0,    // instructionType (uint8)
      2,    // instructionVersion (uint8)
      payload
    ];
  }

}

// ========== LOGGER ==========
class Logger {
  log(msg, color = 'white') {
    console.log(`[${color}] ${msg}`);
  }

  info(msg) { this.log(`[ℹ] ${msg}`, 'green'); }
  warn(msg) { this.log(`[⚠] ${msg}`, 'yellow'); }
  error(msg) { this.log(`[✗] ${msg}`, 'red'); }
  success(msg) { this.log(`[✓] ${msg}`, 'green'); }
  loading(msg) { this.log(`[⟳] ${msg}`, 'cyan'); }
}

// ========== TRANSACTION MANAGER ==========
class TransactionManager {
  constructor(provider, logger) {
    this.provider = provider;
    this.logger = logger;
  }

  async sendTransaction(wallet, to, amount, options = {}) {
    try {
      // Estimate gas
      const gasLimit = await wallet.estimateGas({
        to: to,
        value: amount,
        ...options
      });
      this.logger.info(`Estimated gas: ${gasLimit}`);

      const tx = await wallet.sendTransaction({
        to: to,
        value: amount,
        gasLimit: gasLimit, // Use estimated gas
        ...options
      });
      const receipt = await tx.wait();
      return { success: true, receipt };
    } catch (error) {
      this.logger.error(`Transaction failed: ${error.message}`);
      return { success: false, error };
    }
  }
}

// ========== BRIDGE MANAGER ==========
class BridgeManager {
  constructor(provider, logger) {
    this.provider = provider;
    this.logger = logger;
    this.txManager = new TransactionManager(provider, this.logger);
  }

  async bridgeTokens(wallet, amount, destinationAddress) {
    try {
      this.logger.info(`Bridging ${ethers.formatUnits(amount, 18)} SEI to ${destinationAddress}`);
      this.logger.info(`Wallet: ${wallet.address}`);

      // 1. channelId type uint32 with data 2
      const channelId = 2;

      // 2. timeoutHeight type uint64 with data 0
      const timeoutHeight = 0;

      // 3. timeoutTimestamp type uint64 with current timestamp in nanoseconds
      const timeoutTimestamp = BigInt(Math.floor(Date.now() / 1000)) * BigInt(1000000000);

      // 4. salt type bytes32 with random data
      const salt = ethers.keccak256(ethers.solidityPacked(
        ['address', 'uint256'],
        [wallet.address, timeoutTimestamp]
      ));

      // 5. Generate dynamic instruction payload
      const instruction = Utils.generateInstructionPayload(wallet.address, destinationAddress, amount);

      // Encode the function call
      const iface = new ethers.Interface([
        "function send(uint32 channelId, uint64 timeoutHeight, uint64 timeoutTimestamp, bytes32 salt, (uint8,uint8,bytes) instruction)"
      ]);

      const data = iface.encodeFunctionData("send", [
        channelId,
        timeoutHeight,
        timeoutTimestamp,
        salt,
        instruction
      ]);

      this.logger.info(`Encoded data: ${data}`);

      // Execute bridge transaction
      this.logger.loading("Executing bridge transaction...");
      const bridgeTx = await this.txManager.sendTransaction(
        wallet,
        CONFIG.CONTRACT_ADDRESS,
        amount,
        { data }
      );

      if (bridgeTx.success) {
        this.logger.success(`Bridge tx: ${CONFIG.EXPLORER_URL}/tx/${bridgeTx.receipt.hash}`);
        await this.pollPacketHash(bridgeTx.receipt.hash);
      } else {
        throw new Error("Bridge transaction failed");
      }
    } catch (error) {
      this.logger.error(`Bridge failed: ${error.message}`);
      throw error;
    }
  }

  async pollPacketHash(txHash, retries = 30, intervalMs = 5000) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.post(CONFIG.UNION_GRAPHQL, {
          query: `query ($submission_tx_hash: String!) {
            v2_transfers(args: {p_transaction_hash: $submission_tx_hash}) {
              packet_hash
            }
          }`,
          variables: { submission_tx_hash: txHash }
        });

        const packetHash = response.data?.data?.v2_transfers[0]?.packet_hash;
        if (packetHash) {
          this.logger.success(`Packet tracked: https://app.union.build/explorer/transfers/${packetHash}`);
          return;
        }
      } catch (error) {
        this.logger.warn(`Retrying packet hash lookup... (${i + 1}/${retries})`);
      }
      await Utils.delay(intervalMs);
    }
    throw new Error("Packet hash not found");
  }
}

// ========== MAIN APPLICATION ==========
class App {
  constructor() {
    this.logger = new Logger();
  }

  async init() {
    try {
      this.logger.info('Initializing bridge application...');

      // Setup provider and wallet (replace with your private key)
      const provider = new ethers.JsonRpcProvider(CONFIG.SEI_RPC);
      const wallet = new ethers.Wallet('0x81f8cb133e86d1ab49dd619581f2d37617235f59f1398daee26627fdeb427fbe', provider); // Replace with your actual private key

      // Initialize bridge manager
      const bridgeManager = new BridgeManager(provider, this.logger);

      // Set amount to bridge (0.0001 SEI)
      const amount = ethers.parseUnits('0.000001', 18); // 0.0001 SEI

      // Destination address
      const destinationAddress = '0xe86bed5b0813430df660d17363b89fe9bd8232d8'; // Replace with actual destination address

      // Execute bridge
      await bridgeManager.bridgeTokens(wallet, amount, destinationAddress);

      this.logger.info('Bridge completed successfully!');
    } catch (error) {
      this.logger.error(`Fatal error: ${error.message}`);
      process.exit(1);
    }
  }
}

// ========== START APPLICATION ==========
new App().init();
