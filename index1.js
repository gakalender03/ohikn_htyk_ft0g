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

//const CONTRACT_ADDRESS = '0x5f1D96895e442FC0168FA2F9fb1EBeF93Cb5035e';
const CONTRACT_ADDRESS = '0xbD75117F80b4E22698D0Cd7612d92BDb8eaff628';
const METHOD_ID = '0xef3e12dc';
const INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';
const EXPLORER_URL = 'https://chainscan-galileo.0g.ai/tx/';

const provider = new ethers.JsonRpcProvider(URL_RPC);
const BATCH_SIZE = 8; // Wallets per batch
const TX_PER_WALLET = 1; // Transactions per wallet
const GAS_PRICE = ethers.parseUnits('0.002', 'gwei');
const GAS_LIMIT = 1000000n;

// Nonce manager to track nonces for each wallet
const nonceManager = new Map();

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

async function uploadFile(wallet, imageData, nonce) {
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
  const minValue = ethers.parseEther('0.0009');
  const maxValue = ethers.parseEther('0.00099');
  const randomValue = minValue + BigInt(Math.floor(Math.random() * Number(maxValue - minValue)));

  const tx = await wallet.sendTransaction({
    to: CONTRACT_ADDRESS,
    data,
    value: randomValue,
    gasPrice: GAS_PRICE,
    gasLimit: GAS_LIMIT,
    nonce: nonce // Use the provided nonce
  });

  return tx;
}

async function processBatch(wallets) {
  const results = [];
  const promises = [];

  for (const wallet of wallets) {
    const nonce = nonceManager.get(wallet.address);
    promises.push(
      (async () => {
        try {
          const image = await getRandomImage();
          const fileHash = await generateFileHash(image);
          const tx = await uploadFile(wallet, fileHash, nonce);
          logger.success(`TX sent from ${wallet.address} (Nonce: ${nonce}): ${EXPLORER_URL}${tx.hash}`);
          results.push({ success: true, hash: tx.hash });
          nonceManager.set(wallet.address, nonce + 1); // Increment nonce
        } catch (error) {
          logger.error(`Failed for ${wallet.address} (Nonce: ${nonce}): ${error.message}`);
          results.push({ success: false, error: error.message });
        }
      })()
    );
  }

  // Execute all transactions in the batch in parallel
  await Promise.all(promises);

  return results;
}

async function main() {
  try {
    logger.section('Starting 0G Storage Batch Upload');
    logger.info(`Loaded ${PRIVATE_KEYS.length} private keys`);

    // Initialize all wallets
    const wallets = PRIVATE_KEYS.map(key => new ethers.Wallet(key, provider));

    // Initialize nonces for all wallets
    for (const wallet of wallets) {
      const nonce = await provider.getTransactionCount(wallet.address, 'latest');
      nonceManager.set(wallet.address, nonce);
    }

    // Process in batches
    for (let i = 0; i < TX_PER_WALLET; i++) {
      logger.section(`Processing Batch ${i + 1}/${TX_PER_WALLET}`);

      // Process a batch of wallets (1 TX per wallet)
      const batch = wallets.slice(0, BATCH_SIZE); // Always process the first 5 wallets
      const results = await processBatch(batch);
      const successCount = results.filter(r => r.success).length;

      logger.info(`Batch completed: ${successCount}/${batch.length} successful`);

      // Wait before next batch
      if (i < TX_PER_WALLET - 1) {
        logger.loading(`Waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
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
