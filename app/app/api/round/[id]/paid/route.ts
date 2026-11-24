import { NextResponse } from "next/server";
import { confirmRound, publicRound, UserError } from "@/lib/server/round";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // vérification du paiement + 5 achats

/** POST { signature } → vérifie le paiement, tire la rareté, achète et envoie les tokens, renvoie le résultat. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { signature } = await req.json();
    return NextResponse.json(publicRound(await confirmRound(id, String(signature))));
  } catch (e) {
    const user = e instanceof UserError;
    if (!user) console.error("paid", e);
    return NextResponse.json({ error: user ? e.message : "Server error" }, { status: user ? 400 : 500 });
  }
}
