const { ethers } = require('ethers');
const axios = require('axios');

// ========== CONFIGURATION ==========
const CONFIG = {
  SEI_RPC: 'https://evm-rpc-testnet.sei-apis.com',
  UNION_GRAPHQL: 'https://graphql.union.build/v1/graphql',
  CONTRACT_ADDRESS: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03',
  GAS_PRICE: ethers.parseUnits('1.2', 'gwei'), // Fixed 1.2 Gwei
  GAS_LIMIT: 300000, // Fixed gas limit
  EXPLORER_URL: 'https://seitrace.com',
  BRIDGE_AMOUNT: ethers.parseUnits('0.000001', 18) // 0.000001 SEI
};

// ========== UTILITIES ==========
class Utils {
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static generateInstructionPayload(senderAddress, destinationAddress) {
    const cleanAddress = (addr) => addr.startsWith('0x') ? addr.substring(2) : addr;
    
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
          ethers.zeroPadValue(ethers.toUtf8Bytes(CONFIG.BRIDGE_AMOUNT.toString()), 32),
          ethers.zeroPadValue(ethers.toUtf8Bytes('tokenAddress'), 32)
        ],
        [
          ethers.zeroPadValue('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 32),
          ethers.zeroPadValue(ethers.toUtf8Bytes('destinationAddress'), 32),
          ethers.zeroPadValue('0x' + cleanAddress(destinationAddress), 32),
          ethers.zeroPadValue(ethers.toUtf8Bytes('Sei'), 32),
          ethers.zeroPadValue(ethers.toUtf8Bytes('SEI'), 32)
        ]
      ]
    );

    return [0, 2, payload]; // instructionType, instructionVersion, operand
  }
}

// ========== LOGGER ==========
class Logger {
  log(msg, color = 'white') {
    console.log(`[${color}] ${msg}`);
  }
  info(msg) { this.log(`[ℹ] ${msg}`, 'green'); }
  error(msg) { this.log(`[✗] ${msg}`, 'red'); }
  success(msg) { this.log(`[✓] ${msg}`, 'green'); }
  loading(msg) { this.log(`[⟳] ${msg}`, 'cyan'); }
}

// ========== BRIDGE MANAGER ==========
class BridgeManager {
  constructor(provider, logger) {
    this.provider = provider;
    this.logger = logger;
  }

  async bridgeTokens(wallet, destinationAddress) {
    try {
      this.logger.info(`Bridging ${ethers.formatUnits(CONFIG.BRIDGE_AMOUNT, 18)} SEI`);
      this.logger.info(`From: ${wallet.address} to ${destinationAddress}`);

      const channelId = 2;
      const timeoutHeight = 0;
      const timeoutTimestamp = BigInt(Math.floor(Date.now() / 1000)) * BigInt(1000000000);
      const salt = ethers.keccak256(ethers.solidityPacked(
        ['address', 'uint256'], 
        [wallet.address, timeoutTimestamp]
      ));

      const instruction = Utils.generateInstructionPayload(wallet.address, destinationAddress);

      const iface = new ethers.Interface([
        "function send(uint32 channelId, uint64 timeoutHeight, uint64 timeoutTimestamp, bytes32 salt, (uint8,uint8,bytes) instruction)"
      ]);

      const data = iface.encodeFunctionData("send", [
      channelId,
      timeoutHeight,
      timeoutTimestamp,
      salt,
      [instruction.instructionType, instruction.instructionVersion, instruction.operand]
]);


      this.logger.loading("Sending transaction...");
      const tx = await wallet.sendTransaction({
        to: CONFIG.CONTRACT_ADDRESS,
        value: CONFIG.BRIDGE_AMOUNT,
        data,
        gasLimit: CONFIG.GAS_LIMIT,
        gasPrice: CONFIG.GAS_PRICE
      });

      this.logger.success(`Transaction sent: ${CONFIG.EXPLORER_URL}/tx/${tx.hash}`);
      await this.pollPacketHash(tx.hash);
      
    } catch (error) {
      this.logger.error(`Bridge failed: ${error.message}`);
      throw error;
    }
  }

  async pollPacketHash(txHash, retries = 30, interval = 5000) {
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

        if (response.data?.data?.v2_transfers[0]?.packet_hash) {
          const packetHash = response.data.data.v2_transfers[0].packet_hash;
          this.logger.success(`Packet tracked: https://app.union.build/explorer/transfers/${packetHash}`);
          return;
        }
      } catch (error) {
        this.logger.error(`Query failed: ${error.message}`);
      }
      await Utils.delay(interval);
    }
    throw new Error("Packet hash not found after retries");
  }
}

// ========== MAIN APPLICATION ==========
(async () => {
  const logger = new Logger();
  try {
    logger.info('Starting bridge process...');
    
    const provider = new ethers.JsonRpcProvider(CONFIG.SEI_RPC);
    const wallet = new ethers.Wallet('0x81f8cb133e86d1ab49dd619581f2d37617235f59f1398daee26627fdeb427fbe', provider);
    
    const bridgeManager = new BridgeManager(provider, logger);
    const destinationAddress = '0xa8068e71a3F46C888C39EA5deBa318C16393573B'; // Replace with actual destination
    
    await bridgeManager.bridgeTokens(wallet, destinationAddress);
    logger.success('Bridge completed successfully!');
    
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
})();
