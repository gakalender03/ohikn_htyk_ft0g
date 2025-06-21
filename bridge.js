const { sendTestETH } = require('./seitocorn.js');
const { ethers } = require('ethers');

(async () => {
  try {
    const privateKey = '0x81f8cb133e86d1ab49dd619581f2d37617235f59f1398daee26627fdeb427fbe'; // replace with your test PK
    const wallet = new ethers.Wallet(privateKey);
    const recipient = (await wallet.getAddress()).toLowerCase(); // await the promise and then lowercase

    const txHash = await sendTestETH({
      privateKey,
      recipient
    });

    console.log('Sent test ETH with tx:', txHash);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
