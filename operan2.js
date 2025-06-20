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

/*  static generateInstructionPayload(senderAddress, destinationAddress) {
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
  } */

  
  static generateSeiPayload(walletAddress, destinationAddress) {
    // This generates the proper SEI payload structure
    const cleanAddress = (addr) => addr.startsWith('0x') ? addr.substring(2) : addr;
    const addressHex = cleanAddress(walletAddress);
    
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(bytes32,bytes32,bytes32,bytes32,bytes32)', 'tuple(bytes32,bytes32,bytes32,bytes32,bytes32)'],
      [
        [
          ethers.zeroPadValue(ethers.toUtf8Bytes('sourceAddress'), 32),
          ethers.zeroPadValue('0x' + cleanAddress(walletAddress), 32),
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
  }

  static generateStandardPayload(walletAddress, destinationAddress, options = {}) {
    const cleanAddress = (addr) => addr.startsWith('0x') ? addr.substring(2) : addr;
    const addressHex = cleanAddress(walletAddress);
    
    if (options.token === 'usdc') {
      // USDC payload structure
      return '0x0000000000000000000000000000000000000000000000000000000000000020' +
        '0000000000000000000000000000000000000000000000000000000000000001' +
        '0000000000000000000000000000000000000000000000000000000000000020' +
        '0000000000000000000000000000000000000000000000000000000000000001' +
        '0000000000000000000000000000000000000000000000000000000000000003' +
        '0000000000000000000000000000000000000000000000000000000000000060' +
        '00000000000000000000000000000000000000000000000000000000000002c0' +
        '0000000000000000000000000000000000000000000000000000000000000140' +
        '0000000000000000000000000000000000000000000000000000000000000180' +
        '00000000000000000000000000000000000000000000000000000000000001c0' +
        ethers.hexlify(ethers.toBeArray(CONFIG.BRIDGE_AMOUNT)).replace(/0x/, '').padStart(64, '0') + // amount
        '0000000000000000000000000000000000000000000000000000000000000002' +
        '0000000000000000000000000000000000000000000000000000000000000024' +
        '0000000000000000000000000000000000000000000000000000000000000012' +
        '0000000000000000000000000000000000000000000000000000000000000000' +
        '0000000000000000000000000000000000000000000000000000000000000028' +
        ethers.hexlify(ethers.toBeArray(CONFIG.BRIDGE_AMOUNT)).replace(/0x/, '').padStart(64, '0') + // amount
        '0000000000000000000000000000000000000000000000000000000000000014' +
        addressHex.padStart(64, '0') + // source address
        '0000000000000000000000000000000000000000000000000000000000000000' +
        '0000000000000000000000000000000000000000000000000000000000000014' +
        addressHex.padStart(64, '0') + // destination address
        '0000000000000000000000000000000000000000000000000000000000000000' +
        '0000000000000000000000000000000000000000000000000000000000000014' +
        'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000' +
        '0000000000000000000000000000000000000000000000000000000000000003' +
        '5345490000000000000000000000000000000000000000000000000000000000' + // SEI
        '0000000000000000000000000000000000000000000000000000000000000003' +
        '5365690000000000000000000000000000000000000000000000000000000000' + // Sei
        '0000000000000000000000000000000000000000000000000000000000000014' +
        cleanAddress(destinationAddress).padStart(64, '0') + // final destination
        '000000000000000000000000';
    } else if (options.token === 'weth') {
      // WETH payload structure (similar to USDC but with WETH token details)
      // ... similar structure as USDC but with WETH addresses and denom
    }
  }

  static generateInstructionPayload(walletAddress, destinationAddress, options = {}) {
    let operand;
    
    if (options.seiSpecific) {
      operand = this.generateSeiPayload(walletAddress, destinationAddress);
    } else {
      operand = this.generateStandardPayload(walletAddress, destinationAddress, options);
    }

    return [0, 2, operand]; // instructionType, instructionVersion, operand
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
  // ...
  const instruction = Utils.generateInstructionPayload(
    wallet.address, 
    destinationAddress,
    { seiSpecific: false } // Set to true for original SEI format
  );
  
  const data = iface.encodeFunctionData("send", [
    channelId,
    timeoutHeight,
    timeoutTimestamp,
    salt,
    instruction
  ]);
  // ...




      this.logger.loading("Sending transaction...");
      const tx = await wallet.sendTransaction({
        to: CONFIG.CONTRACT_ADDRESS,
        value: CONFIG.BRIDGE_AMOUNT,
        data,
        gasLimit: CONFIG.GAS_LIMIT,
        gasPrice: CONFIG.GAS_PRICE
      });
      
      this.logger.success(`Transaction sent: ${CONFIG.EXPLORER_URL}/tx/${tx.hash}`);

     console.log(instruction) ;
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
