import "server-only";
import { PublicKey, SystemProgram, Transaction, VersionedTransaction, type Keypair } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ATA_RENT, conn, JUP_KEY, PAYOUT_MODE, payoutKeypair } from "./config";
import { PER_BALL, TOKENS } from "./tables";
import type { Round } from "./round";

/**
 * Achète les 5 tokens d'un tirage avec Jupiter et les fait arriver directement dans le wallet du joueur.
 * Mode simulate : aucun achat, on chiffre seulement ce qu'on aurait reçu avec de vrais devis Jupiter.
 */
export type Buy = { sym: string; mint: string; lamports: number; out?: string; tx?: string; error?: string };

const SOL = "So11111111111111111111111111111111111111112";
const JUP = JUP_KEY ? "https://api.jup.ag/swap/v1" : "https://lite-api.jup.ag/swap/v1";
const jupHeaders = (): Record<string, string> => (JUP_KEY ? { "x-api-key": JUP_KEY } : {});

async function quote(mint: string, lamports: number) {
  const q = new URLSearchParams({ inputMint: SOL, outputMint: mint, amount: String(lamports), slippageBps: "300", restrictIntermediateTokens: "true" });
  const r = await fetch(`${JUP}/quote?${q}`, { headers: jupHeaders(), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`quote ${r.status}`);
  return r.json();
}

async function sendSigned(tx: VersionedTransaction | Transaction, kp: Keypair) {
  const c = conn();
  if (tx instanceof VersionedTransaction) tx.sign([kp]); else tx.sign(kp);
  const sig = await c.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  const bh = await c.getLatestBlockhash("confirmed");
  const res = await c.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  if (res.value.err) throw new Error("tx failed " + sig);
  return sig;
}

/** Ordre des tokens propre à ce tirage, dérivé de la même graine (prouvable aussi). */
function pickTokens(r: Round) {
  const ranked = TOKENS.map((t, i) => ({ t, k: (r.u! * 1e9 + i * 7919) % TOKENS.length + i / 100 }));
  return ranked.sort((a, b) => a.k - b.k).slice(0, PER_BALL).map((x) => x.t);
}

export async function payout(r: Round): Promise<Partial<Round>> {
  const value = r.value!;
  const tokens = pickTokens(r);
  const player = new PublicKey(r.player);

  if (PAYOUT_MODE !== "live") {
    const share = Math.floor(value / tokens.length);
    const buys: Buy[] = await Promise.all(tokens.map(async (t) => {
      try { const q = await quote(t.mint, share); return { sym: t.sym, mint: t.mint, lamports: share, out: String(q.outAmount) }; }
      catch (e) { return { sym: t.sym, mint: t.mint, lamports: share, error: (e as Error).message }; }
    }));
    return { buys, simulated: true };
  }

  const kp = payoutKeypair();
  const c = conn();
  // 1. les comptes de tokens du joueur (créés s'ils n'existent pas, payés par le wallet de gains)
  // boule d'essai : valeur trop petite pour ouvrir des comptes et acheter, on la rend directement en SOL
  if (value < 5_000_000) {
    const { blockhash } = await c.getLatestBlockhash("confirmed");
    const refundTx = await sendSigned(new Transaction({ feePayer: kp.publicKey, recentBlockhash: blockhash }).add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: player, lamports: value })), kp);
    return { buys: [], refundTx, refunded: value, simulated: false };
  }
  const mintInfos = await c.getMultipleAccountsInfo(tokens.map((t) => new PublicKey(t.mint)));
  const progs = mintInfos.map((m) => (m?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID));
  const atas = tokens.map((t, i) => getAssociatedTokenAddressSync(new PublicKey(t.mint), player, true, progs[i]));
  const existing = await c.getMultipleAccountsInfo(atas);
  const missing = atas.map((a, i) => ({ a, i })).filter(({ i }) => !existing[i]);
  let ataTx: string | undefined;
  let rent = 0;
  if (missing.length) {
    rent = missing.length * (await c.getMinimumBalanceForRentExemption(165));
    const { blockhash } = await c.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: kp.publicKey, recentBlockhash: blockhash });
    missing.forEach(({ a, i }) => tx.add(createAssociatedTokenAccountIdempotentInstruction(kp.publicKey, a, player, new PublicKey(tokens[i].mint), progs[i])));
    ataTx = await sendSigned(tx, kp);
  }
  // 2. la valeur à acheter (moins l'ouverture des comptes si ATA_RENT=deduct : ce SOL reste au joueur, il le récupère en fermant le compte)
  const spend = Math.max(0, value - (ATA_RENT === "deduct" ? rent : 0));
  const share = Math.floor(spend / tokens.length);
  // part trop petite pour un achat sensé (< 0,0005 SOL par token) : tout est rendu en SOL, rien n'est acheté
  if (share < 500_000) {
    const { blockhash } = await c.getLatestBlockhash("confirmed");
    const refundTx = await sendSigned(new Transaction({ feePayer: kp.publicKey, recentBlockhash: blockhash }).add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: player, lamports: value })), kp);
    return { buys: [], ataTx, refundTx, refunded: value, simulated: false };
  }
  // 3. un achat Jupiter par token, livré directement dans le compte du joueur
  const buys: Buy[] = [];
  let unspent = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    try {
      const q = await quote(t.mint, share);
      const s = await fetch(`${JUP}/swap`, {
        method: "POST", headers: { "Content-Type": "application/json", ...jupHeaders() }, signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ quoteResponse: q, userPublicKey: kp.publicKey.toBase58(), destinationTokenAccount: atas[i].toBase58(), wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 200_000, priorityLevel: "high" } } }),
      });
      if (!s.ok) throw new Error(`swap ${s.status}`);
      const { swapTransaction } = await s.json();
      const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
      const sig = await sendSigned(tx, kp);
      buys.push({ sym: t.sym, mint: t.mint, lamports: share, out: String(q.outAmount), tx: sig });
    } catch (e) {
      unspent += share;
      buys.push({ sym: t.sym, mint: t.mint, lamports: share, error: (e as Error).message.slice(0, 120) });
    }
  }
  // 4. ce qui n'a pas pu être acheté est rendu en SOL : le joueur reçoit toujours sa valeur
  let refundTx: string | undefined;
  if (unspent > 0) {
    const { blockhash } = await c.getLatestBlockhash("confirmed");
    refundTx = await sendSigned(new Transaction({ feePayer: kp.publicKey, recentBlockhash: blockhash }).add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: player, lamports: unspent })), kp);
  }
  return { buys, ataTx, refundTx, refunded: unspent || undefined, simulated: false };
}
