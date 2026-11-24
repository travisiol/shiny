import "server-only";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

/** Réglages du serveur, lus une fois. Voir .env.local.example. */
const env = (k: string, d = "") => (process.env[k] ?? d).trim();
const num = (k: string, d: number) => (Number.isFinite(Number(process.env[k])) && process.env[k] !== "" ? Number(process.env[k]) : d);

export const IS_PROD = process.env.NODE_ENV === "production";
export const RPC_URL = env("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com") || "https://api.mainnet-beta.solana.com";
export const JUP_KEY = env("JUPITER_API_KEY");
export const PAY_TO = env("PAY_TO", "treasury") === "payout" ? "payout" : "treasury";
export const PAYOUT_MODE = env("PAYOUT_MODE", "simulate") === "live" ? "live" : "simulate";
export const RESERVE_SOL = num("RESERVE_SOL", 80);
export const HOURLY_CAP_SOL = num("HOURLY_PAYOUT_CAP_SOL", 60);
export const ATA_RENT = env("ATA_RENT", "deduct") === "house" ? "house" : "deduct";
export const CRON_SECRET = env("CRON_SECRET");
/**
 * Réserve exigée avant de vendre une boule, en multiples de son prix (10 = couvre un Jackpot x10).
 * 0 = aucune vérification : toutes les boules sont vendues ; si un gain dépasse le solde, la livraison attend un rechargement `[F-128]`.
 */
export const COVER_MULT = num("COVER_MULT", 10);
/** Faux paiements « SIM-… » : seulement en local, jamais en production. */
export const FAKE_PAYMENTS = !IS_PROD && env("DEV_FAKE_PAYMENTS") === "true";

let _conn: Connection | null = null;
export const conn = () => (_conn ??= new Connection(RPC_URL, { commitment: "confirmed" }));

let _payout: Keypair | null = null;
export function payoutKeypair(): Keypair {
  if (_payout) return _payout;
  const s = env("PAYOUT_SECRET");
  if (!s) throw new Error("PAYOUT_SECRET manquant (npm run wallet:new)");
  return (_payout = Keypair.fromSecretKey(bs58.decode(s)));
}

export function treasury(): PublicKey {
  const t = env("TREASURY_WALLET");
  if (!t) throw new Error("TREASURY_WALLET manquant");
  return new PublicKey(t);
}

/** Le wallet qui reçoit les paiements (jamais affiché sur le site : il n'apparaît que dans la transaction à signer). */
export const payTo = (): PublicKey => (PAY_TO === "payout" ? payoutKeypair().publicKey : treasury());
