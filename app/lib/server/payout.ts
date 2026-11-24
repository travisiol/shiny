import "server-only";
import { ComputeBudgetProgram, PublicKey, SystemProgram, Transaction, VersionedTransaction, type Keypair, type TransactionInstruction } from "@solana/web3.js";
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Envoie une transaction signée et la renvoie toutes les 2 s jusqu'à ce qu'elle soit confirmée,
 * ou jusqu'à ce que son blockhash expire (elle ne pourra alors plus jamais passer : on peut en refaire une) `[F-122]`.
 */
async function land(raw: Uint8Array, lastValidBlockHeight: number): Promise<string | null> {
  const c = conn();
  const sig = await c.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 0 });
  for (;;) {
    await wait(2000);
    const st = (await c.getSignatureStatuses([sig])).value[0];
    if (st?.err) throw new Error("tx failed " + sig);
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return sig;
    if ((await c.getBlockHeight("confirmed")) > lastValidBlockHeight) return null; // expirée sans passer
    await c.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }).catch(() => {});
  }
}

/** Transaction simple du wallet de gains (comptes de tokens, remboursement) : frais prioritaires, 3 essais avec un blockhash neuf. */
async function sendIxs(ixs: TransactionInstruction[], kp: Keypair, cuLimit: number) {
  const c = conn();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: kp.publicKey, recentBlockhash: blockhash })
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }))
      .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 400_000 }))
      .add(...ixs);
    tx.sign(kp);
    const sig = await land(tx.serialize(), lastValidBlockHeight);
    if (sig) return sig;
  }
  throw new Error("transaction did not land after 3 tries");
}

const refundSol = (kp: Keypair, player: PublicKey, lamports: number) =>
  sendIxs([SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: player, lamports })], kp, 1_000);

/** Un achat Jupiter livré dans le compte du joueur : nouveau devis + nouvelle transaction si la précédente expire. */
async function buyOne(mint: string, lamports: number, dest: PublicKey, kp: Keypair) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const q = await quote(mint, lamports);
    const s = await fetch(`${JUP}/swap`, {
      method: "POST", headers: { "Content-Type": "application/json", ...jupHeaders() }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ quoteResponse: q, userPublicKey: kp.publicKey.toBase58(), destinationTokenAccount: dest.toBase58(), wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 300_000, priorityLevel: "veryHigh" } } }),
    });
    if (!s.ok) throw new Error(`swap ${s.status}`);
    const { swapTransaction, lastValidBlockHeight } = await s.json();
    const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
    tx.sign([kp]);
    const sig = await land(tx.serialize(), Number(lastValidBlockHeight) || (await conn().getBlockHeight("confirmed")) + 150);
    if (sig) return { sig, out: String(q.outAmount) };
  }
  throw new Error("swap did not land after 3 tries");
}

/** Ordre des tokens propre à ce tirage, dérivé de la même graine (prouvable aussi). */
function pickTokens(r: Round) {
  const ranked = TOKENS.map((t, i) => ({ t, k: (r.u! * 1e9 + i * 7919) % TOKENS.length + i / 100 }));
  return ranked.sort((a, b) => a.k - b.k).slice(0, PER_BALL).map((x) => x.t);
}

/** Avancement de la livraison, enregistré au fur et à mesure pour que la page affiche la barre `[F-123]`. */
export type Progress = (patch: Partial<Round>) => void;

export async function payout(r: Round, progress: Progress = () => {}): Promise<Partial<Round>> {
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
  progress({ stage: "accounts" });
  // 1. les comptes de tokens du joueur (créés s'ils n'existent pas, payés par le wallet de gains)
  const mintInfos = await c.getMultipleAccountsInfo(tokens.map((t) => new PublicKey(t.mint)));
  const progs = mintInfos.map((m) => (m?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID));
  const atas = tokens.map((t, i) => getAssociatedTokenAddressSync(new PublicKey(t.mint), player, true, progs[i]));
  const existing = await c.getMultipleAccountsInfo(atas);
  const missing = atas.map((a, i) => ({ a, i })).filter(({ i }) => !existing[i]);
  let ataTx: string | undefined;
  let rent = 0;
  if (missing.length) {
    rent = missing.length * (await c.getMinimumBalanceForRentExemption(165));
    try {
      ataTx = await sendIxs(missing.map(({ a, i }) => createAssociatedTokenAccountIdempotentInstruction(kp.publicKey, a, player, new PublicKey(tokens[i].mint), progs[i])), kp, 40_000 * missing.length + 10_000);
    } catch {
      // filet de sécurité : sans comptes, pas d'achat possible → la valeur part en SOL dans le wallet du joueur
      progress({ stage: "refunding" });
      const refundTx = await refundSol(kp, player, value);
      return { buys: [], refundTx, refunded: value, simulated: false };
    }
  }
  // 2. la valeur à acheter (moins l'ouverture des comptes si ATA_RENT=deduct : ce SOL reste au joueur, il le récupère en fermant le compte)
  const spend = Math.max(0, value - (ATA_RENT === "deduct" ? rent : 0));
  const share = Math.floor(spend / tokens.length);
  // part trop petite pour un achat sensé (< 0,0002 SOL par token) : tout est rendu en SOL, rien n'est acheté
  if (share < 200_000) {
    if (spend <= 0) return { buys: [], ataTx, simulated: false };
    progress({ stage: "refunding", ataTx });
    const refundTx = await refundSol(kp, player, spend);
    return { buys: [], ataTx, refundTx, refunded: spend, simulated: false };
  }
  // 3. un achat Jupiter par token, livré directement dans le compte du joueur ; les 5 en même temps (~10 s au lieu de ~30 s)
  const live: Buy[] = tokens.map((t) => ({ sym: t.sym, mint: t.mint, lamports: share })); // sans tx ni erreur = en cours
  progress({ stage: "buying", ataTx, buys: live.map((b) => ({ ...b })) });
  const buys: Buy[] = await Promise.all(tokens.map(async (t, i) => {
    let b: Buy;
    try {
      const { sig, out } = await buyOne(t.mint, share, atas[i], kp);
      b = { sym: t.sym, mint: t.mint, lamports: share, out, tx: sig };
    } catch (e) {
      b = { sym: t.sym, mint: t.mint, lamports: share, error: (e as Error).message.slice(0, 120) };
    }
    live[i] = b;
    progress({ buys: live.map((x) => ({ ...x })) }); // un token de plus est arrivé (ou a échoué)
    return b;
  }));
  const unspent = buys.filter((b) => !b.tx).reduce((a, b) => a + b.lamports, 0);
  // 4. ce qui n'a pas pu être acheté est rendu en SOL : le joueur reçoit toujours sa valeur
  let refundTx: string | undefined;
  if (unspent > 0) {
    progress({ stage: "refunding" });
    refundTx = await refundSol(kp, player, unspent);
  }
  return { buys, ataTx, refundTx, refunded: unspent || undefined, simulated: false };
}
