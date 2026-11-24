import { NextResponse } from "next/server";
import * as db from "@/lib/server/store";
import { publicRound, type Round } from "@/lib/server/round";

export const dynamic = "force-dynamic";

/** GET → le tirage tel que tout le monde peut le vérifier (la graine est révélée une fois le tirage fait). */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await db.get<Round>("round:" + id);
  if (!r) return NextResponse.json({ error: "Round not found" }, { status: 404 });
  return NextResponse.json(publicRound(r));
}
