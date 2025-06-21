const { sendTestETH } = require('./seitocorn.js');
const { ethers } = require('ethers');

(async () => {
  try {
    const privateKey = '0x81f8cb133e86d1ab49dd619581f2d37617235f59f1398daee26627fdeb427fbe'; // replace with your test PK
    const wallet = new ethers.Wallet(privateKey);

    // Get the sender address
    const sender = await wallet.getAddress();
    if (typeof sender !== 'string') {
      throw new Error('Expected wallet.getAddress() to return a string');
    }
    const senderLowercase = sender.toLowerCase();

    // Define the recipient address (replace with the actual recipient address)
    const recipient = '0xa8068e71a3F46C888C39EA5deBa318C16393573B'; // Example recipient address

    console.log('Sender Address:', senderLowercase);
    console.log('Recipient Address:', recipient);

    const txHash = await sendTestETH({
      privateKey,
      recipient // Pass the recipient address here
    });

    console.log('Sent test ETH with tx:', txHash);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
