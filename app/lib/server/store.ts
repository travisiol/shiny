import "server-only";
import fs from "node:fs";
import path from "node:path";
import { IS_PROD } from "./config";

/**
 * Stockage clé → valeur des tirages.
 * En ligne : Upstash Redis (REST). En local sans Upstash : fichiers JSON dans .data/.
 */
const URL_ = process.env.UPSTASH_REDIS_REST_URL?.trim();
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
export const HAS_DB = !!(URL_ && TOKEN);

async function redis(cmd: (string | number)[]) {
  const r = await fetch(URL_!, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd), cache: "no-store" });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

const DIR = path.join(process.cwd(), ".data");
const file = (k: string) => path.join(DIR, k.replace(/[^a-zA-Z0-9_-]/g, "_") + ".json");

function assertUsable() {
  if (!HAS_DB && IS_PROD) throw new Error("Base de données manquante (UPSTASH_REDIS_REST_URL / TOKEN)");
}

export async function get<T>(k: string): Promise<T | null> {
  assertUsable();
  if (HAS_DB) { const v = await redis(["GET", k]); return v ? JSON.parse(v) : null; }
  try { return JSON.parse(fs.readFileSync(file(k), "utf8")); } catch { return null; }
}

export async function set(k: string, v: unknown, ttlSec?: number) {
  assertUsable();
  if (HAS_DB) { await redis(ttlSec ? ["SET", k, JSON.stringify(v), "EX", ttlSec] : ["SET", k, JSON.stringify(v)]); return; }
  fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(file(k), JSON.stringify(v, null, 1));
}

export async function del(k: string) {
  assertUsable();
  if (HAS_DB) { await redis(["DEL", k]); return; }
  try { fs.unlinkSync(file(k)); } catch {}
}

/** Pose k seulement s'il n'existe pas encore. true = posé (personne ne l'avait). Sert de verrou anti-rejeu. */
export async function claim(k: string, v: string): Promise<boolean> {
  assertUsable();
  if (HAS_DB) return (await redis(["SET", k, v, "NX"])) === "OK";
  fs.mkdirSync(DIR, { recursive: true });
  try { fs.writeFileSync(file(k), JSON.stringify(v), { flag: "wx" }); return true; } catch { return false; }
}

/** Ajoute n à un compteur qui expire (plafond horaire). Renvoie le nouveau total. */
export async function incr(k: string, n: number, ttlSec: number): Promise<number> {
  assertUsable();
  if (HAS_DB) { const v = Number(await redis(["INCRBYFLOAT", k, n])); await redis(["EXPIRE", k, ttlSec]); return v; }
  const cur = (await get<number>(k)) ?? 0; await set(k, cur + n); return cur + n;
}

/** Liste des derniers tirages (registre public). */
export async function pushLog(id: string) {
  if (HAS_DB) { await redis(["LPUSH", "log", id]); await redis(["LTRIM", "log", 0, 199]); return; }
  const l = (await get<string[]>("log")) ?? []; l.unshift(id); await set("log", l.slice(0, 200));
}
export async function readLog(): Promise<string[]> {
  if (HAS_DB) return (await redis(["LRANGE", "log", 0, 49])) ?? [];
  return ((await get<string[]>("log")) ?? []).slice(0, 50);
}
