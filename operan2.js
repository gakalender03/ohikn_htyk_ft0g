const { ethers } = require('ethers');

// Define the full structure to match your desired output
const dataToEncode = {
  field1: ethers.toBeHex(32, 32), // 0x20 (32 in hex)
  field2: 1,
  field3: ethers.toBeHex(32, 32), // Another 0x20
  field4: 1,
  field5: 3,
  field6: ethers.toBeHex(96, 32), // 0x60 (96 in hex)
  field7: ethers.toBeHex(704, 32), // 0x2c0 (704 in hex)
  field8: ethers.toBeHex(320, 32), // 0x140 (320 in hex)
  field9: ethers.toBeHex(384, 32), // 0x180 (384 in hex)
  field10: ethers.toBeHex(448, 32), // 0x1c0 (448 in hex)
  bigValue: ethers.toBeHex("1000000000000", 32), // 0xe8d4a51000
  someFlag: 2,
  anotherOffset: ethers.toBeHex(576, 32), // 0x240 (576 in hex)
  smallValue: 18,
  zeroValue: 0,
  anotherPointer: ethers.toBeHex(640, 32), // 0x280 (640 in hex)
  sameBigValue: ethers.toBeHex("1000000000000", 32), // Same as before
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
};

// Encode the complex structure
const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
  [
    'uint256', 'uint256', 'uint256', 'uint256', 'uint256',
    'uint256', 'uint256', 'uint256', 'uint256', 'uint256',
    'uint256', 'uint256', 'uint256', 'uint256', 'uint256',
    'uint256', 'address[]', 'string[]', 'address'
  ],
  [
    dataToEncode.field1,
    dataToEncode.field2,
    dataToEncode.field3,
    dataToEncode.field4,
    dataToEncode.field5,
    dataToEncode.field6,
    dataToEncode.field7,
    dataToEncode.field8,
    dataToEncode.field9,
    dataToEncode.field10,
    dataToEncode.bigValue,
    dataToEncode.someFlag,
    dataToEncode.anotherOffset,
    dataToEncode.smallValue,
    dataToEncode.zeroValue,
    dataToEncode.anotherPointer,
    dataToEncode.sameBigValue,
    dataToEncode.addresses,
    dataToEncode.strings,
    dataToEncode.finalAddress
  ]
);

console.log('Encoded Data:', encodedData);
