const { ethers } = require('ethers');

// Define the complete structure to encode
const data = {
  header: [
    ethers.toBeHex(32, 32),    // 0x20 (position of first dynamic data)
    1,                         // Some value
    ethers.toBeHex(32, 32),    // Another 0x20 pointer
    1,                         // Another value
    3,                         // Count or flag
    ethers.toBeHex(96, 32),    // 0x60 pointer
    ethers.toBeHex(704, 32),   // 0x2c0 pointer
    ethers.toBeHex(320, 32),   // 0x140 pointer
    ethers.toBeHex(384, 32),   // 0x180 pointer
    ethers.toBeHex(448, 32),   // 0x1c0 pointer
    ethers.toBeHex("1000000000000", 32),  // 0xe8d4a51000
    2,                         // Some flag
    ethers.toBeHex(576, 32),   // 0x240 pointer
    18,                        // Some value
    0,                         // Zero value
    ethers.toBeHex(640, 32)    // 0x280 pointer
  ],
  fixedValues: [
    ethers.toBeHex("1000000000000", 32)  // Same big value
  ],
  dynamicData: {
    addresses: [
      '0x4a8068e71a3f46c888c39ea5deba318c16393573',
      '0x4a8068e71a3f46c888c39ea5deba318c16393573',
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    ],
    strings: [
      'SEI',
      'Sei'
    ],
    finalAddress: '0xe86bed5b0813430df660d17363b89fe9bd8232d8'
  }
};

// Encode in two parts to avoid argument count mismatch
const headerTypes = Array(16).fill('uint256');
const fixedTypes = ['uint256'];
const dynamicTypes = ['address[]', 'string[]', 'address'];

// Encode header and fixed values
const staticPart = ethers.AbiCoder.defaultAbiCoder().encode(
  [...headerTypes, ...fixedTypes],
  [...data.header, ...data.fixedValues]
);

// Encode dynamic part
const dynamicPart = ethers.AbiCoder.defaultAbiCoder().encode(
  dynamicTypes,
  [data.dynamicData.addresses, data.dynamicData.strings, data.dynamicData.finalAddress]
);

// Combine the parts (this is simplified - actual combination needs offset adjustments)
const fullEncoded = staticPart + dynamicPart.slice(2);

console.log('Full Encoded Data:', fullEncoded);
