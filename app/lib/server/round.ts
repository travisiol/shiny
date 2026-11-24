import "server-only";
import crypto from "node:crypto";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction, type ParsedInstruction, type PartiallyDecodedInstruction } from "@solana/web3.js";
import { conn, FAKE_PAYMENTS, HOURLY_CAP_SOL, PAYOUT_MODE, payTo, payoutKeypair } from "./config";
import * as db from "./store";
import { BALLS, MULT, rarityFor, type Ball, type Rarity } from "./tables";
import { payout, type Buy } from "./payout";

/**
 * Un tirage, de bout en bout `[F-115]` :
 *  1. createRound : graine secrète tirée, son empreinte donnée AVANT le paiement, transaction de paiement préparée
 *  2. confirmRound : paiement vérifié sur la chaîne, tirage = HMAC(graine, signature), gains achetés et envoyés, graine révélée
 */
export type RoundStatus = "open" | "paid" | "done" | "refunded" | "failed";
export type Round = {
  id: string; ball: Ball; player: string; price: number; createdAt: number;
  seedHash: string; seed: string; status: RoundStatus;
  signature?: string; u?: number; rarity?: Rarity; mult?: number; value?: number;
  buys?: Buy[]; ataTx?: string; refundTx?: string; refunded?: number; simulated?: boolean; error?: string; doneAt?: number;
};

const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const ROUND_TTL = 60 * 60 * 24 * 30; // un mois
const hourKey = () => "cap:" + new Date().toISOString().slice(0, 13);

export class UserError extends Error {}

/** Le service peut-il prendre un tirage de cette boule ? (réserve suffisante pour le pire cas x10, plafond horaire) */
export async function canServe(ball: Ball): Promise<string | null> {
  const worst = BALLS[ball].lamports * MULT.Jackpot;
  if (PAYOUT_MODE === "live") {
    const bal = await conn().getBalance(payoutKeypair().publicKey);
    if (bal < worst + 0.05 * LAMPORTS_PER_SOL) return "The machine is being refilled. Try again in a few minutes.";
  }
  const spent = (await db.get<number>(hourKey())) ?? 0;
  if (spent + worst / LAMPORTS_PER_SOL > HOURLY_CAP_SOL) return "The machine is cooling down. Try again in a few minutes.";
  return null;
}

export async function createRound(ball: Ball, playerStr: string) {
  let player: PublicKey;
  try { player = new PublicKey(playerStr); } catch { throw new UserError("Bad wallet address"); }
  const busy = await canServe(ball);
  if (busy) throw new UserError(busy);

  const id = crypto.randomBytes(9).toString("base64url");
  const seed = crypto.randomBytes(32).toString("hex");
  const seedHash = crypto.createHash("sha256").update(seed).digest("hex");
  const price = BALLS[ball].lamports;
  const round: Round = { id, ball, player: player.toBase58(), price, createdAt: Date.now(), seedHash, seed, status: "open" };
  await db.set("round:" + id, round, ROUND_TTL);

  // la transaction à signer : prix exact vers le wallet de paiement + mémo du tirage (lien paiement ↔ tirage)
  const { blockhash } = await conn().getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: player, recentBlockhash: blockhash })
    .add(SystemProgram.transfer({ fromPubkey: player, toPubkey: payTo(), lamports: price }))
    .add(new TransactionInstruction({ programId: MEMO, keys: [], data: Buffer.from(`shiny:${id}:${seedHash.slice(0, 16)}`) }));
  const transaction = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
  return { id, seedHash, price, transaction };
}

/** Vérifie le paiement sur la chaîne (attend jusqu'à ~40 s qu'il soit visible). */
async function verifyPayment(r: Round, signature: string) {
  if (FAKE_PAYMENTS && signature.startsWith("SIM-")) return;
  let tx = null;
  for (let i = 0; i < 20 && !tx; i++) {
    tx = await conn().getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null);
    if (!tx) await new Promise((res) => setTimeout(res, 2000));
  }
  if (!tx) throw new UserError("Payment not found on chain yet");
  if (tx.meta?.err) throw new UserError("Payment failed on chain");
  if (tx.blockTime && tx.blockTime * 1000 < r.createdAt - 60_000) throw new UserError("Payment is older than this round");
  const ix = tx.transaction.message.instructions as (ParsedInstruction | PartiallyDecodedInstruction)[];
  const dest = payTo().toBase58();
  const paid = ix.some((i) => "parsed" in i && i.program === "system" && i.parsed?.type === "transfer"
    && i.parsed.info.source === r.player && i.parsed.info.destination === dest && Number(i.parsed.info.lamports) === r.price);
  const memo = ix.some((i) => "parsed" in i && (i.program === "spl-memo") && String(i.parsed).includes(`shiny:${r.id}`));
  if (!paid) throw new UserError("Payment does not match this round");
  if (!memo) throw new UserError("Payment is not linked to this round");
}

/** Tirage prouvable : u = 48 premiers bits de HMAC-SHA256(graine, signature du paiement) / 2^48. */
export function drawU(seed: string, signature: string) {
  const h = crypto.createHmac("sha256", seed).update(signature).digest();
  return h.readUIntBE(0, 6) / 2 ** 48;
}

export async function confirmRound(id: string, signature: string): Promise<Round> {
  const r = await db.get<Round>("round:" + id);
  if (!r) throw new UserError("Round not found");
  // tirage payé mais jamais livré (envoi tombé en panne) : on relance la livraison, avec le même tirage `[F-122]`
  if (r.status === "failed" && signature === r.signature && !delivered(r)) return redeliver(r);
  if (r.status !== "open") return r; // déjà traité : on renvoie le résultat
  if (typeof signature !== "string" || signature.length < 20 || signature.length > 120) throw new UserError("Bad signature");

  // une signature ne sert qu'une fois, un tirage n'est traité qu'une fois
  if (!(await db.claim("lock:" + id, signature))) { const cur = await db.get<Round>("round:" + id); return cur ?? r; }
  await verifyPayment(r, signature).catch(async (e) => { await db.del("lock:" + id); throw e; });
  if (!(await db.claim("sig:" + signature, id))) { await db.del("lock:" + id); throw new UserError("This payment was already used"); }

  r.signature = signature;
  r.u = drawU(r.seed, signature);
  r.rarity = rarityFor(r.ball, r.u);
  r.mult = MULT[r.rarity];
  r.value = Math.floor(r.price * r.mult);
  r.status = "paid";
  await db.set("round:" + id, r, ROUND_TTL);

  try {
    await db.incr(hourKey(), r.value / LAMPORTS_PER_SOL, 3600);
    const res = await payout(r);
    Object.assign(r, res, { status: "done" });
  } catch (e) {
    r.status = "failed";
    r.error = (e as Error).message.slice(0, 300);
  }
  r.doneAt = Date.now();
  await db.set("round:" + id, r, ROUND_TTL);
  await db.pushLog(id);
  return r;
}

const delivered = (r: Round) => !!(r.refundTx || r.buys?.some((b) => b.tx));

async function redeliver(r: Round): Promise<Round> {
  if (!(await db.claim("deliver:" + r.id, "1"))) return r; // une livraison est déjà en cours
  try {
    r.status = "paid"; r.error = undefined;
    await db.set("round:" + r.id, r, ROUND_TTL);
    try {
      const res = await payout(r);
      Object.assign(r, res, { status: "done" });
    } catch (e) {
      r.status = "failed";
      r.error = (e as Error).message.slice(0, 300);
    }
    r.doneAt = Date.now();
    await db.set("round:" + r.id, r, ROUND_TTL);
    return r;
  } finally {
    await db.del("deliver:" + r.id);
  }
}

/** Ce que tout le monde peut voir d'un tirage. La graine n'est révélée qu'une fois le tirage fait. */
export function publicRound(r: Round) {
  const revealed = r.status !== "open";
  return {
    id: r.id, ball: r.ball, status: r.status, player: r.player, price: r.price / LAMPORTS_PER_SOL,
    seedHash: r.seedHash, seed: revealed ? r.seed : undefined, signature: r.signature,
    rarity: r.rarity, mult: r.mult, value: r.value !== undefined ? r.value / LAMPORTS_PER_SOL : undefined,
    buys: r.buys, refunded: r.refunded !== undefined ? r.refunded / LAMPORTS_PER_SOL : undefined, simulated: r.simulated,
    error: r.status === "failed" ? "Delivery failed on our side. Your payment is safe: tap Try again to finish it." : undefined,
  };
}
