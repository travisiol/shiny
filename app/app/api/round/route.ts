import { NextResponse } from "next/server";
import { createRound, UserError } from "@/lib/server/round";
import { isBall } from "@/lib/server/tables";

export const dynamic = "force-dynamic";

/** POST { ball, player } → un tirage ouvert : empreinte de la graine + transaction de paiement à signer. */
export async function POST(req: Request) {
  try {
    const { ball, player } = await req.json();
    if (!isBall(ball)) return NextResponse.json({ error: "Unknown ball" }, { status: 400 });
    return NextResponse.json(await createRound(ball, String(player)));
  } catch (e) {
    const user = e instanceof UserError;
    if (!user) console.error("round", e);
    return NextResponse.json({ error: user ? e.message : "Server error" }, { status: user ? 400 : 500 });
  }
}
