import "server-only";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

/** Tables de tirage v3 (ECONOMIE.md `[F-111]`). Les mêmes chiffres sont affichés sur le site. */
export type Rarity = "Common" | "Rare" | "Epic" | "Legendary" | "Jackpot";
export type Ball = "MINI" | "MEGA" | "GOLD" | "TEST";

export const MULT: Record<Rarity, number> = { Common: 0.5, Rare: 1, Epic: 1.8, Legendary: 5, Jackpot: 10 };

export const BALLS: Record<Ball, { lamports: number; odds: [Rarity, number][] }> = {
  MINI: { lamports: 0.1 * LAMPORTS_PER_SOL, odds: [["Common", 0.55], ["Rare", 0.33], ["Epic", 0.1], ["Legendary", 0.017], ["Jackpot", 0.003]] },
  MEGA: { lamports: 0.5 * LAMPORTS_PER_SOL, odds: [["Common", 0.664], ["Rare", 0.211], ["Epic", 0.09], ["Legendary", 0.027], ["Jackpot", 0.008]] },
  GOLD: { lamports: 1 * LAMPORTS_PER_SOL, odds: [["Common", 0.762], ["Rare", 0.118], ["Epic", 0.07], ["Legendary", 0.038], ["Jackpot", 0.012]] },
  // boule d'essai privée (lien avec clé TEST_KEY) : 0,01 SOL, les chances de la Mini
  TEST: { lamports: 0.01 * LAMPORTS_PER_SOL, odds: [["Common", 0.55], ["Rare", 0.33], ["Epic", 0.1], ["Legendary", 0.017], ["Jackpot", 0.003]] },
};

export const isBall = (b: unknown): b is Ball => typeof b === "string" && b in BALLS;

/** u dans [0, 1) → rareté, en suivant les probabilités cumulées de la boule. */
export function rarityFor(ball: Ball, u: number): Rarity {
  let acc = 0;
  for (const [r, p] of BALLS[ball].odds) {
    acc += p;
    if (u < acc) return r;
  }
  return BALLS[ball].odds[BALLS[ball].odds.length - 1][0];
}

/** Les tokens qu'on peut tirer : liquides, achetables par Jupiter. */
export const TOKENS: { sym: string; mint: string }[] = [
  { sym: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { sym: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
  { sym: "POPCAT", mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr" },
  { sym: "FARTCOIN", mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump" },
  { sym: "PENGU", mint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv" },
];
export const PER_BALL = 5;
