const { ethers } = require('ethers');

// ========== CONFIGURATION ==========
const CONFIG = {
  BRIDGE_AMOUNT: ethers.parseUnits('1', 18) // 1 SEI
};

// ========== UTILITIES ==========
class Utils {
  static generateSeiPayload(walletAddress, destinationAddress) {
    const cleanAddress = (addr) => addr.startsWith('0x') ? addr.substring(2) : addr;
    const addressHex = cleanAddress(walletAddress);
    const destinationHex = cleanAddress(destinationAddress);
    
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(bytes32,bytes32,bytes32,bytes32,bytes32)', 'tuple(bytes32,bytes32,bytes32,bytes32,bytes32)'],
      [
        [
          ethers.zeroPadValue('0x20', 32), 
          ethers.zeroPadValue('0x01', 32), 
          ethers.zeroPadValue('0x20', 32), 
          ethers.zeroPadValue('0x01', 32), 
          ethers.zeroPadValue('0x03', 32), 
          ethers.zeroPadValue('0x60', 32), 
          ethers.hexZeroPad('0x2c0', 32), 
          ethers.zeroPadValue('0x140', 32), 
          ethers.zeroPadValue('0x180', 32), 
          ethers.zeroPadValue('0x1c0', 32), 
          ethers.zeroPadValue('0xe8d4a51000', 32), 
          ethers.zeroPadValue('0x200', 32), 
          ethers.zeroPadValue('0x240', 32), 
          ethers.zeroPadValue('0x12', 32), 
          ethers.zeroPadValue('0x0', 32), 
          ethers.zeroPadValue('0x280', 32), 
          ethers.zeroPadValue('0xe8d4a51000', 32), 
          ethers.zeroPadValue('0x14', 32), 
          ethers.zeroPadValue(ethers.toUtf8Bytes('sourceAddress'), 32),
          ethers.zeroPadValue('0x' + addressHex, 32),
          ethers.zeroPadValue('0x14', 32), 
          ethers.zeroPadValue(ethers.toUtf8Bytes('sourceAddress'), 32),
          ethers.zeroPadValue('0x' + addressHex, 32), 
          ethers.zeroPadValue('0x14', 32)
        ],
        [
          ethers.zeroPadValue('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 32),
          ethers.zeroPadValue('0x03', 32), 
          ethers.formatBytes32String("SEI"), 
          ethers.zeroPadValue('0x03', 32), 
          ethers.formatBytes32String("Sei"), 
          ethers.zeroPadValue('0x14', 32), 
          ethers.hexZeroPad('0xe86bed5b0813430df660d17363b89fe9bd8232d8', 32)
        ]
      ]
    );
  }
}

// ========== MAIN APPLICATION ==========
(async () => {
  try {
    const walletAddress = '0xa8068e71a3F46C888C39EA5deBa318C16393573B';
    const destinationAddress = '0xa8068e71a3F46C888C39EA5deBa318C16393573B'; // Replace with actual destination
    
    const payload = Utils.generateSeiPayload(walletAddress, destinationAddress);
    
    console.log('Generated Payload:', payload);
    
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
})();
