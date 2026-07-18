import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bs58 from "bs58";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const walletPath = path.join(__dirname, "oraclewallet.json");

const walletBytes = JSON.parse(readFileSync(walletPath, "utf8"));
const privateKeyBytes = Uint8Array.from(walletBytes);
const privateKeyBase58 = bs58.encode(privateKeyBytes);

console.log("Private key (base58):", privateKeyBase58);