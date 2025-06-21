import { sendTestETH } from './seitocorn.js';

const main = async () => {
  const txHash = await sendTestETH({
    sourceChain: 'SEI',
    destChain: 'CORN',
    privateKey: '0x81f8cb133e86d1ab49dd619581f2d37617235f59f1398daee26627fdeb427fbe
  });

  console.log('Tx hash:', txHash);
};

main().catch(console.error);
