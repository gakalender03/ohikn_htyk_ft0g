const { ethers } = require('ethers');

// Define UCS03 ABI
const UCS03_ABI = [{
  inputs: [
    {internalType: 'uint32', name: 'channelId', type: 'uint32'},
    {internalType: 'uint64', name: 'timeoutHeight', type: 'uint64'},
    {internalType: 'uint64', name: 'timeoutTimestamp', type: 'uint64'},
    {internalType: 'bytes32', name: 'salt', type: 'bytes32'},
    {
      components: [
        {internalType: 'uint8', name: 'version', type: 'uint8'},
        {internalType: 'uint8', name: 'opcode', type: 'uint8'},
        {internalType: 'bytes', name: 'operand', type: 'bytes'}
      ],
      internalType: 'struct Instruction',
      name: 'instruction',
      type: 'tuple'
    }
  ],
  name: 'send',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function'
}];

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
