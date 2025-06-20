const { ethers } = require('ethers');

const sourceAddress = '0x141c7d4b196cb0c7b01d743Fbc6116a902379C7238'; // Example address
const tokenSymbol = 'USDC';
const destinationAddress = '0x141c7d4b196cb0c7b01d743Fbc6116a902379C7238'; // Replace with actual destination address

const encodedData = ethers.solidityPacked(
  ['address', 'string', 'address'],
  [sourceAddress, tokenSymbol, destinationAddress]
);

console.log('Encoded Operand:', encodedData);
