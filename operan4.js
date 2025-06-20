const { ethers } = require('ethers');

// Assuming provider is already initialized elsewhere
// const provider = new ethers.JsonRpcProvider('YOUR_RPC_URL');

function generateSendPayload(provider) {
  // Calculate timeoutHeight with BigInt
  const timeoutHeight = (BigInt(Date.now()) * 1000000n + 50000000000000n).toString();

  // Get current timestamp (seconds)
  const timestamp = Math.floor(Date.now() / 1000);

  // Generate the salt using keccak256 hash
  const salt = ethers.keccak256(ethers.solidityPack(['address', 'uint256'], [provider.address, timestamp]));

  // Your other decoded values
  const channelId = 2;
  const timeoutTimestamp = 0;

  const instruction = {
    version: 0,
    opcode: 2,
    operand: '0x00000000000000000000000000000000000000000000000000000000000002c0000000000000000000000000000000000000000000000000000000000000014'
  };

  // Generate the encoded payload
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
// Assuming 'provider' is already initialized with a valid Ethereum provider
// const encodedPayload = generateSendPayload(provider);
// console.log(encodedPayload);
