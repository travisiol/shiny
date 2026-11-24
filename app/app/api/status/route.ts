import { NextResponse } from "next/server";
import { PAYOUT_MODE } from "@/lib/server/config";
import { canServe } from "@/lib/server/round";

export const dynamic = "force-dynamic";

/** GET → la machine est-elle ouverte, boule par boule ? (aucune adresse de wallet ici) */
export async function GET() {
  const balls = ["MINI", "MEGA", "GOLD"] as const;
  const status = await Promise.all(balls.map(async (b) => [b, (await canServe(b).catch(() => "Unavailable")) ?? "open"]));
  return NextResponse.json({ mode: PAYOUT_MODE, balls: Object.fromEntries(status) });
}
