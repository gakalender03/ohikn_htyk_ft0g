const { ethers } = require('ethers');

// UCS03 send function parameters
const channelId = 1; // uint32
const timeoutHeight = 10000; // uint64
const timeoutTimestamp = Math.floor(Date.now() / 1000) + 3600; // Current time + 1 hour
const salt = ethers.hexlify(ethers.randomBytes(32)); // bytes32

// Instruction parameters
const version = 1; // uint8
const opcode = 1; // uint8
const sourceAddress = '0xC56311F6ec6AB9b4E4C494350580146393a35EA4';
const tokenSymbol = 'USDC';
const destinationAddress = '0xC56311F6ec6AB9b4E4C494350580146393a35EA4';

// Encode the operand
const operand = ethers.AbiCoder.defaultAbiCoder().encode(
  ['address', 'string', 'address'],
  [sourceAddress, tokenSymbol, destinationAddress]
);

// Create instruction tuple
const instruction = {
  version,
  opcode,
  operand
};

// Encode the full function call
const ucs03Interface = new ethers.Interface(UCS03_ABI);
const encodedSendCall = ucs03Interface.encodeFunctionData('send', [
  channelId,
  timeoutHeight,
  timeoutTimestamp,
  salt,
  instruction
]);

console.log('Encoded UCS03 send call:', encodedSendCall);
