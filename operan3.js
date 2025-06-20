const { ethers } = require('ethers');

// ========== CONFIGURATION ==========
const CONFIG = {
  BRIDGE_AMOUNT: ethers.parseUnits('1', 18) // 1 SEI
};

// Helper function to ensure proper hex formatting
function toValidHex(input) {
  // Remove 0x prefix if present
  let hex = input.startsWith('0x') ? input.slice(2) : input;
  // Ensure even number of characters
  if (hex.length % 2 !== 0) hex = '0' + hex;
  return '0x' + hex;
}

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
          ethers.zeroPadValue(toValidHex('20'), 32), 
          ethers.zeroPadValue(toValidHex('01'), 32), 
          ethers.zeroPadValue(toValidHex('20'), 32), 
          ethers.zeroPadValue(toValidHex('01'), 32), 
          ethers.zeroPadValue(toValidHex('03'), 32), 
          ethers.zeroPadValue(toValidHex('60'), 32), 
          ethers.zeroPadValue(toValidHex('2c0'), 32),
          ethers.zeroPadValue(toValidHex('140'), 32), 
          ethers.zeroPadValue(toValidHex('180'), 32), 
          ethers.zeroPadValue(toValidHex('1c0'), 32), 
          ethers.zeroPadValue(toValidHex('e8d4a51000'), 32), 
          ethers.zeroPadValue(toValidHex('200'), 32), 
          ethers.zeroPadValue(toValidHex('240'), 32), 
          ethers.zeroPadValue(toValidHex('12'), 32), 
          ethers.zeroPadValue(toValidHex('00'), 32), 
          ethers.zeroPadValue(toValidHex('280'), 32), 
          ethers.zeroPadValue(toValidHex('e8d4a51000'), 32), 
          ethers.zeroPadValue(toValidHex('14'), 32), 
          ethers.zeroPadValue(ethers.toUtf8Bytes('sourceAddress'), 32),
          ethers.zeroPadValue(toValidHex(addressHex), 32),
          ethers.zeroPadValue(toValidHex('14'), 32), 
          ethers.zeroPadValue(ethers.toUtf8Bytes('sourceAddress'), 32),
          ethers.zeroPadValue(toValidHex(addressHex), 32), 
          ethers.zeroPadValue(toValidHex('14'), 32)
        ],
        [
          ethers.zeroPadValue(toValidHex('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'), 32),
          ethers.zeroPadValue(toValidHex('03'), 32), 
          ethers.encodeBytes32String("SEI"), 
          ethers.zeroPadValue(toValidHex('03'), 32), 
          ethers.encodeBytes32String("Sei"), 
          ethers.zeroPadValue(toValidHex('14'), 32), 
          ethers.zeroPadValue(toValidHex('e86bed5b0813430df660d17363b89fe9bd8232d8'), 32)
        ]
      ]
    );
  }
}

// ========== MAIN APPLICATION ==========
(async () => {
  try {
    const walletAddress = '0xa8068e71a3F46C888C39EA5deBa318C16393573B';
    const destinationAddress = '0xa8068e71a3F46C888C39EA5deBa318C16393573B';
    
    const payload = Utils.generateSeiPayload(walletAddress, destinationAddress);
    console.log('Generated Payload:', payload);
    
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
})();
