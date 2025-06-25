// Required modules
require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

// Load env vars
const URL_RPC = process.env.URL_RPC;
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split('\n')
  .map(k => k.trim())
  .filter(k => k.length > 0 && k.startsWith('0x'));

// Chain & contract config
const CHAIN_ID = 16601;
const CONTRACT_ADDRESS = '0x5f1d96895e442fc0168fa2f9fb1ebef93cb5035e';
const METHOD_ID = '0xef3e12dc';
const INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';
const EXPLORER_URL = 'https://chainscan-galileo.0g.ai/tx/';

// Colors and logger
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bold: "\x1b[1m"
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  process: (msg) => console.log(`\n${colors.white}[➤] ${msg}${colors.reset}`),
  debug: (msg) => console.log(`${colors.gray}[…] ${msg}${colors.reset}`),
  bye: (msg) => console.log(`${colors.yellow}[…] ${msg}${colors.reset}`),
  critical: (msg) => console.log(`${colors.red}${colors.bold}[❌] ${msg}${colors.reset}`),
  summary: (msg) => console.log(`${colors.white}[✓] ${msg}${colors.reset}`),
  section: (msg) => {
    const line = '='.repeat(50);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    if (msg) console.log(`${colors.cyan}${msg}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
  },
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`--------------------------------------------`);
    console.log(` 0G Storage Scan Auto Bot - Airdrop Insiders`);
    console.log(`--------------------------------------------${colors.reset}\n`);
  }
};

const IMAGE_SOURCES = [
  { url: 'https://picsum.photos/800/600', responseType: 'arraybuffer' },
  { url: 'https://loremflickr.com/800/600', responseType: 'arraybuffer' }
];

function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

function createAxiosInstance() {
  return axios.create({
    headers: {
      'User-Agent': getRandomUserAgent(),
      'accept': 'application/json, text/plain, */*',
      'Referer': 'https://storagescan-galileo.0g.ai/'
    }
  });
}

async function fetchRandomImage() {
  const source = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
  logger.loading('Fetching random image...');
  const axiosInstance = createAxiosInstance();
  const response = await axiosInstance.get(source.url, {
    responseType: source.responseType,
    maxRedirects: 5
  });
  logger.success('Image fetched');
  return response.data;
}

async function checkFileExists(fileHash) {
  try {
    const axiosInstance = createAxiosInstance();
    const res = await axiosInstance.get(`${INDEXER_URL}/file/info/${fileHash}`);
    return res.data.exists || false;
  } catch {
    return false;
  }
}

async function prepareImageData(imageBuffer) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const salt = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const hashInput = Buffer.concat([
      Buffer.from(imageBuffer),
      Buffer.from(salt),
      Buffer.from(timestamp)
    ]);
    const hash = '0x' + crypto.createHash('sha256').update(hashInput).digest('hex');
    if (!(await checkFileExists(hash))) {
      return {
        root: hash,
        data: Buffer.from(imageBuffer).toString('base64')
      };
    }
  }
  throw new Error('Failed to generate unique file hash');
}

function getRandomTransferValue() {
  const min = 0.0000001;
  const max = 0.0000004;
  const rand = Math.random() * (max - min) + min;
  return ethers.parseEther(rand.toFixed(18));
}

async function uploadToStorage(imageData, wallet, provider) {
  logger.loading(`Checking balance for ${wallet.address}...`);
  const balance = await provider.getBalance(wallet.address);
  const value = getRandomTransferValue();
  const gasPrice = ethers.parseUnits('0.002', 'gwei');

  if (balance < value) throw new Error('Insufficient balance');
  logger.success(`Balance OK: ${ethers.formatEther(balance)} OG`);

  const axiosInstance = createAxiosInstance();
  await axiosInstance.post(`${INDEXER_URL}/file/segment`, {
    root: imageData.root,
    index: 0,
    data: imageData.data,
    proof: { siblings: [imageData.root], path: [] }
  });
  logger.success('Segment uploaded');

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

  const gasLimit = 1000000n;
  const tx = await wallet.sendTransaction({
    to: CONTRACT_ADDRESS,
    data,
    value,
    gasPrice,
    gasLimit,
    chainId: CHAIN_ID
  });

  logger.info(`Tx sent: ${tx.hash}`);
  logger.info(`Explorer: ${EXPLORER_URL}${tx.hash}`);

  const receipt = await tx.wait();
  if (receipt.status === 1) {
    logger.success(`Tx confirmed in block ${receipt.blockNumber}`);
    logger.success(`Root hash: ${imageData.root}`);
  } else {
    throw new Error('Transaction failed');
  }
}

async function main() {
  try {
    logger.banner();
    if (!URL_RPC || PRIVATE_KEYS.length === 0) throw new Error('Missing RPC or keys');

    const provider = new ethers.JsonRpcProvider(URL_RPC);
    const network = await provider.getNetwork();
    if (BigInt(network.chainId) !== BigInt(CHAIN_ID)) throw new Error('Wrong chain ID');
    logger.success(`Connected to chainId ${network.chainId}`);

    const block = await provider.getBlockNumber();
    logger.success(`Synced at block ${block}`);

    const wallets = PRIVATE_KEYS.map(key => new ethers.Wallet(key, provider));
    const txPerWallet = 1000;
    const totalWallets = wallets.length;

    for (let round = 1; round <= txPerWallet; round++) {
      logger.section(`Batch ${round}`);
      for (let i = 0; i < totalWallets; i++) {
        const wallet = wallets[i];
        logger.process(`Tx #${round} from Wallet #${i + 1} [${wallet.address}]`);
        try {
          const image = await fetchRandomImage();
          const data = await prepareImageData(image);
          await uploadToStorage(data, wallet, provider);
        } catch (e) {
          logger.error(`Wallet ${wallet.address} failed: ${e.message}`);
        }
      }
    }

    logger.bye('All batches complete. Bye bang!');
    process.exit(0);
  } catch (e) {
    logger.critical(`Fatal: ${e.message}`);
    process.exit(1);
  }
}

main();
