const { sendTestETH } = require('./seitocorn.js');

(async () => {
  try {
    const txHash = await sendTestETH({
      privateKey: '0x81f8cb133e86d1ab49dd619581f2d37617235f59f1398daee26627fdeb427fbe', // replace with your test PK
      recipient: '0xa8068e71a3F46C888C39EA5deBa318C16393573B'
    });
    console.log('Sent test ETH with tx:', txHash);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
