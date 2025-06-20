const { ethers } = require('ethers');

// ========== CONFIGURATION ==========
const CONFIG = {
  BRIDGE_AMOUNT: ethers.parseUnits('0.000001', 18) // 0.000001 SEI
};

// ========== UTILITIES ==========
class Utils {
  static generateSeiPayload(walletAddress, destinationAddress) {
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

  static generateInstructionPayload(walletAddress, destinationAddress) {
    const operand = this.generateSeiPayload(walletAddress, destinationAddress);
    return [0, 2, operand]; // instructionType, instructionVersion, operand
  }
}

// ========== MAIN APPLICATION ==========
(async () => {
  try {
    const walletAddress = '0xa8068e71a3F46C888C39EA5deBa318C16393573B';
    const destinationAddress = '0xa8068e71a3F46C888C39EA5deBa318C16393573B'; // Replace with actual destination
    
    const instruction = Utils.generateInstructionPayload(walletAddress, destinationAddress);
    
    console.log('Generated Instruction:', instruction);
    
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
})();
