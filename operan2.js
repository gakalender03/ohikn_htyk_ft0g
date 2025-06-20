const { ethers } = require('ethers');

async function logInstructionPayload(wallet, destination) {
  const provider = new ethers.providers.JsonRpcProvider(wallet.privatekey);
  
  // Determine destination parameters
  let destinationAddress, channelId;
  if (destination === 'babylon') {
    destinationAddress = wallet.babylonAddress;
    channelId = 7;
    if (!destinationAddress) {
      console.log('Missing babylonAddress');
      return;
    }
  } else if (destination === 'holesky') {
    destinationAddress = provider.address;
    channelId = 8;
  } else {
    console.log('Invalid destination');
    return;
  }

  // Construct the operand
  let operand;
  if (destination === 'babylon') {
    operand = ethers.utils.hexConcat([
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x00000000000000000000000000000014',
      destinationAddress,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x00000000000000000000000000000004',
      '0x5553444300000000000000000000000000000000000000000000000000000000',
      '0x00000000000000000000000000000004',
      '0x5553444300000000000000000000000000000000000000000000000000000000',
      '0x00000000000000000000000000000014'
    ]);
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
const wallet = {
  privatekey: 'YOUR_PRIVATE_KEY',
  babylonAddress: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238' // Example Babylon address
};

logInstructionPayload(wallet, 'babylon');
