const { ethers } = require('ethers');

function generateSendPayload() {
  // Your decoded values from the hex:
  const channelId = 32;
  const timeoutHeight = 1;
  const timeoutTimestamp = 32;
  const salt = '0x0000000000000000000000000000000000000000000000000000000000000001';

  const instruction = {
    version: 3,
    opcode: 6,
    operand: '0x00000000000000000000000000000000000000000000000000000000000002c0000000000000000000000000000000000000000000000000000000000000014'
  };

  return ethers.AbiCoder.defaultAbiCoder().encode(
    [
      'uint32',
      'uint64',
      'uint64',
      'bytes32',
      'tuple(uint8 version, uint8 opcode, bytes operand)'
    ],
    [
      channelId,
      timeoutHeight,
      timeoutTimestamp,
      salt,
      [instruction.version, instruction.opcode, instruction.operand]
    ]
  );
}

// Usage example:
const encodedPayload = generateSendPayload();
console.log(encodedPayload);
