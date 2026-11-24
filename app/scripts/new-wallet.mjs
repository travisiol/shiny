// Crée le wallet de gains du serveur `[F-115]`.
// La clé secrète est écrite dans .env.local (jamais envoyé sur GitHub) et n'est jamais affichée.
// Seule l'adresse publique s'affiche : c'est elle qu'on finance depuis Phantom.
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "node:fs";

const FILE = new URL("../.env.local", import.meta.url);
const env = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8") : "";
if (/^PAYOUT_SECRET=.+$/m.test(env) && !process.argv.includes("--force")) {
  const secret = env.match(/^PAYOUT_SECRET=(.+)$/m)[1].trim();
  console.log("Un wallet de gains existe déjà. Adresse publique :", Keypair.fromSecretKey(bs58.decode(secret)).publicKey.toBase58());
  console.log("(Pour en créer un autre : npm run wallet:new -- --force. L'ancien serait perdu s'il n'est pas sauvegardé.)");
  process.exit(0);
}
const kp = Keypair.generate();
const line = `PAYOUT_SECRET=${bs58.encode(kp.secretKey)}`;
const next = /^PAYOUT_SECRET=.*$/m.test(env) ? env.replace(/^PAYOUT_SECRET=.*$/m, line) : env + (env && !env.endsWith("\n") ? "\n" : "") + line + "\n";
fs.writeFileSync(FILE, next);
console.log("Wallet de gains créé. Adresse publique :", kp.publicKey.toBase58());
console.log("La clé secrète est dans .env.local (PAYOUT_SECRET). Ne la partage jamais.");
