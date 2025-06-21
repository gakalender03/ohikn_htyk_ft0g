const { sendTestETH } = require('./seitocorn.js');
const { ethers } = require('ethers');

(async () => {
  try {
    const privateKey = '0x81f8cb133e86d1ab49dd619581f2d37617235f59f1398daee26627fdeb427fbe'; // replace with your test PK
    const wallet = new ethers.Wallet(privateKey);
    const address = await wallet.getAddress(); // Wait for the address to resolve
    const recipient = address.toLowerCase();   // Now apply .toLowerCase()

    const txHash = await sendTestETH({
      privateKey,
      recipient
    });

    console.log('Sent test ETH with tx:', txHash);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
