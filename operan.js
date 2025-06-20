const { ethers } = require('ethers');

const sourceAddress = '0xC56311F6ec6AB9b4E4C494350580146393a35EA4'; // Example address
const tokenSymbol = 'USDC';
const destinationAddress = '0xC56311F6ec6AB9b4E4C494350580146393a35EA4'; // Replace with actual destination address

const encodedData = ethers.solidityPacked(
  ['address', 'string', 'address'],
  [sourceAddress, tokenSymbol, destinationAddress]
);

console.log('Encoded Operand:', encodedData);
