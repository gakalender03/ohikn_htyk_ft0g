require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const crypto = require('crypto');

const URL_RPC = process.env.URL_RPC;
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split('\n').map(k => k.trim()).filter(k => k.startsWith('0x'));

const CHAIN_ID = 16601;
const CONTRACT_ADDRESS = '0xbD75117F80b4E22698D0Cd7612d92BDb8eaff628';
const METHOD_ID = '0xef3e12dc';
const INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';

const IMAGE_SOURCES = [
  'https://picsum.photos/800/600',
  'https://loremflickr.com/800/600'
];

function getRandomValue() {
  const min = 0.0000001;
  const max = 0.0000004;
  const rand = Math.random() * (max - min) + min;
  return ethers.parseEther(rand.toFixed(18));
}

async function fetchImage() {
  const url = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  return res.data;
}

async function checkFileExists(hash) {
  try {
    const res = await axios.get(`${INDEXER_URL}/file/info/${hash}`);
    return res.data.exists || false;
  } catch {
    return false;
  }
}

async function prepareImageData(buffer) {
  for (let i = 0; i < 5; i++) {
    const salt = crypto.randomBytes(16);
    const now = Buffer.from(Date.now().toString());
    const hash = '0x' + crypto.createHash('sha256').update(Buffer.concat([buffer, salt, now])).digest('hex');
    if (!(await checkFileExists(hash))) {
      return { root: hash, data: Buffer.from(buffer).toString('base64') };
    }
  }
  throw new Error('Cannot generate unique hash');
}

async function upload(wallet, value, data) {
  const tx = await wallet.sendTransaction({
    to: CONTRACT_ADDRESS,
    data,
    value,
    gasPrice: ethers.parseUnits('0.002', 'gwei'),
    gasLimit: 1000000,
    chainId: CHAIN_ID
  });
  await tx.wait();
}

async function processWallet(wallet, idx, provider) {
  try {
    const [balance, nonce] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getTransactionCount(wallet.address),
    ]);

    console.log(`Wallet ${idx + 1} ${wallet.address} balance: ${ethers.formatEther(balance)} OG nonce: ${nonce}`);

    const [image, value] = await Promise.all([
      fetchImage(),
      getRandomValue()
    ]);

    const imgData = await prepareImageData(image);
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

    // Upload to indexer (no await to start sooner)
    const indexerUpload = axios.post(`${INDEXER_URL}/file/segment`, {
      root: imgData.root,
      index: 0,
      data: imgData.data,
      proof: { siblings: [imgData.root], path: [] }
    });

    // Upload to chain
    const txUpload = upload(wallet, value, data);

    await Promise.all([indexerUpload, txUpload]);

  } catch (err) {
    console.log(`✗ Wallet ${idx + 1} failed`);
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(URL_RPC);
  const wallets = PRIVATE_KEYS.map(k => new ethers.Wallet(k, provider));
  const txPerWallet = 5000;

  for (let round = 1; round <= txPerWallet; round++) {
    console.log(`Batch ${round} processing`);

    // Fully parallelized wallet tasks
    await Promise.all(wallets.map((wallet, idx) => processWallet(wallet, idx, provider)));

    console.log(`Batch ${round} completed`);
    console.log('__________________________');
  }

  process.exit(0);
}

main().catch(() => process.exit(1));
