const ethers = require('ethers');

const sourceAddress = '0x141c7d4b196cb0c7b01d743fbc6116a902379c7238';
const tokenSymbol = 'USDC';
const destinationAddress = '0x141c7d4b196cb0c7b01d743fbc6116a902379c7238'; // Replace with actual destination address

const encodedData = ethers.utils.solidityPack(
  ['address', 'string', 'address'],
  [sourceAddress, tokenSymbol, destinationAddress]
);

console.log(encodedData); // This would be your operand
