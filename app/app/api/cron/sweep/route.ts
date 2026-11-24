import { NextResponse } from "next/server";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { conn, CRON_SECRET, PAY_TO, payoutKeypair, RESERVE_SOL, treasury } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/**
 * Option B (PAY_TO=payout) : toutes les heures, le surplus au-dessus de la réserve part vers la trésorerie.
 * Appelé par la tâche horaire Vercel (vercel.json), protégé par CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (PAY_TO !== "payout") return NextResponse.json({ skipped: "PAY_TO=treasury: payments already land on the treasury" });
  const kp = payoutKeypair(), c = conn();
  const bal = await c.getBalance(kp.publicKey);
  const excess = bal - Math.round(RESERVE_SOL * LAMPORTS_PER_SOL) - 10_000_000; // on garde la réserve + 0,01 SOL de frais
  if (excess < 0.05 * LAMPORTS_PER_SOL) return NextResponse.json({ swept: 0 });
  const { blockhash } = await c.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: kp.publicKey, recentBlockhash: blockhash }).add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: treasury(), lamports: excess }));
  tx.sign(kp);
  const sig = await c.sendRawTransaction(tx.serialize());
  return NextResponse.json({ swept: excess / LAMPORTS_PER_SOL, tx: sig });
}
