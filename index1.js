const { ethers } = require('ethers');
const axios = require('axios');
const crypto = require('crypto');

// Simplified logger
const logger = {
  info: (msg) => console.log(`[✓] ${msg}`),
  error: (msg) => console.log(`[✗] ${msg}`),
  success: (msg) => console.log(`[✅] ${msg}`),
  loading: (msg) => console.log(`[⟳] ${msg}`),
  section: (msg) => console.log(`\n===== ${msg} =====\n`)
};

const CHAIN_ID = 16601;
const URL_RPC = process.env.URL_RPC;
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split('\n')
  .map(k => k.trim())
  .filter(k => k.length > 0 && k.startsWith('0x'));

const CONTRACT_ADDRESS = '0x5f1D96895e442FC0168FA2F9fb1EBeF93Cb5035e';
const METHOD_ID = '0xef3e12dc';
const INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';
const EXPLORER_URL = 'https://chainscan-galileo.0g.ai/tx/';

const provider = new ethers.JsonRpcProvider(URL_RPC);
const BATCH_SIZE = 5; // Wallets per batch
const TX_PER_WALLET = 500; // Transactions per wallet
const GAS_PRICE = ethers.parseUnits('0.002', 'gwei');
const GAS_LIMIT = 300000n;

async function getRandomImage() {
  const response = await axios.get('https://picsum.photos/800/600', {
    responseType: 'arraybuffer'
  });
  return response.data;
}

async function generateFileHash(imageBuffer) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hashInput = Buffer.concat([Buffer.from(imageBuffer), Buffer.from(salt)]);
  return '0x' + crypto.createHash('sha256').update(hashInput).digest('hex');
}

async function uploadFile(wallet, imageData) {
  const contentHash = crypto.randomBytes(32);
  const data = ethers.concat([
    Buffer.from(METHOD_ID.slice(2), 'hex'),
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000020', 'hex'),
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000014', 'hex'),
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000060', 'hex'),
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000080', 'hex'),
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex'),
    contentHash,
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')
  ]);

  // Random value between 0.000001 and 0.000004 ETH
  const minValue = ethers.parseEther('0.000001');
  const maxValue = ethers.parseEther('0.000004');
  const randomValue = minValue + BigInt(Math.floor(Math.random() * Number(maxValue - minValue)));

  const tx = await wallet.sendTransaction({
    to: CONTRACT_ADDRESS,
    data,
    value: randomValue,
    gasPrice: GAS_PRICE,
    gasLimit: GAS_LIMIT
  });

  return tx;
}

async function processWallet(wallet) {
  const results = [];
  const promises = [];

  for (let i = 0; i < TX_PER_WALLET; i++) {
    promises.push(
      (async () => {
        try {
          const image = await getRandomImage();
          const fileHash = await generateFileHash(image);
          const tx = await uploadFile(wallet, fileHash);
          logger.success(`TX sent from ${wallet.address}: ${EXPLORER_URL}${tx.hash}`);
          results.push({ success: true, hash: tx.hash });
        } catch (error) {
          logger.error(`Failed for ${wallet.address}: ${error.message}`);
          results.push({ success: false, error: error.message });
        }
      })()
    );
  }

  // Execute all transactions in parallel
  await Promise.all(promises);

  return results;
}

async function processBatch(wallets) {
  const results = [];
  const promises = wallets.map(wallet => processWallet(wallet));

  // Process all wallets in the batch in parallel
  const batchResults = await Promise.all(promises);
  results.push(...batchResults);

  return results;
}

async function main() {
  try {
    logger.section('Starting 0G Storage Batch Upload');
    logger.info(`Loaded ${PRIVATE_KEYS.length} private keys`);

    // Initialize all wallets
    const wallets = PRIVATE_KEYS.map(key => new ethers.Wallet(key, provider));

    // Process in batches
    for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
      const batch = wallets.slice(i, i + BATCH_SIZE);
      logger.section(`Processing Batch ${Math.floor(i / BATCH_SIZE) + 1}`);

      const results = await processBatch(batch);
      const successCount = results.flat().filter(r => r.success).length;

      logger.info(`Batch completed: ${successCount}/${batch.length * TX_PER_WALLET} successful`);

      // Wait before next batch
      if (i + BATCH_SIZE < wallets.length) {
        logger.loading(`Waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    logger.section('All batches processed');
    logger.success('Done');
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
