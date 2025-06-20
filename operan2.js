const { ethers } = require('ethers');

function logInstructionPayload(destination) {
  const walletAddress = '0xd828acA0FeA5bA986Ec5d512798dDcFe9E4eA7ED'; // Your wallet address

  // Determine destination parameters
  let destinationAddress, channelId;
  if (destination === 'babylon') {
    destinationAddress = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238'; // Example Babylon address
    channelId = 7;
  } else if (destination === 'holesky') {
    destinationAddress = walletAddress; // Use wallet address for Holesky
    channelId = 8;
  } else {
    console.log('Invalid destination');
    return;
  }

  // Construct the operand
  let operand;
  if (destination === 'babylon') {
    // For ethers.js v6, we'll manually concatenate hex strings
    operand = 
      '0x0000000000000000000000000000000000000000000000000000000000000000' +
      '00000000000000000000000000000014' +
      destinationAddress.slice(2) + // Remove 0x prefix
      '0000000000000000000000000000000000000000000000000000000000000000' +
      '00000000000000000000000000000004' +
      '5553444300000000000000000000000000000000000000000000000000000000' +
      '00000000000000000000000000000004' +
      '5553444300000000000000000000000000000000000000000000000000000000' +
      '00000000000000000000000000000014';
  } else {
    operand = '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a';
  }

  // Create instruction
  const instruction = {
    version: 0,
    opcode: 2,
    operand: operand
  };

  // Log the instruction in hex format
  console.log('Instruction Payload:');
  console.log(`Version: 0x${instruction.version.toString(16).padStart(2, '0')}`);
  console.log(`Opcode: 0x${instruction.opcode.toString(16).padStart(2, '0')}`);
  console.log(`Operand: ${instruction.operand}`);
}

// Example usage:
logInstructionPayload('babylon'); // Test with 'babylon' or 'holesky'
