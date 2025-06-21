const { DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const { toBech32 } = require("@cosmjs/encoding");

async function getBabylonAddress(privateKeyHex) {
  const wallet = await DirectSecp256k1Wallet.fromKey(
    Uint8Array.from(Buffer.from(privateKeyHex, "hex")),
    "bbn" // Babylon prefix
  );
  const [account] = await wallet.getAccounts();
  return account.address;
}

// Example usage:
const privateKey = "0x81f8cb133e86d1ab49dd619581f2d37617235f59f1398daee26627fdeb427fbe"; // 64-character hex string
getBabylonAddress(privateKey).then(address => console.log("Babylon address:", address));
