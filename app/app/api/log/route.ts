import { NextResponse } from "next/server";
import * as db from "@/lib/server/store";
import { publicRound, type Round } from "@/lib/server/round";

export const dynamic = "force-dynamic";

/** GET → les 50 derniers tirages, avec graine et signature : chacun peut refaire le calcul. */
export async function GET() {
  const ids = await db.readLog();
  const rounds = (await Promise.all(ids.map((id) => db.get<Round>("round:" + id)))).filter(Boolean) as Round[];
  return NextResponse.json(rounds.map(publicRound));
}
