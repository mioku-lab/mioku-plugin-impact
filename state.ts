import type { CooldownState } from "./types";
import { nowSeconds } from "./utils";

export function createCooldownState(): CooldownState {
  return {
    pk: new Map(),
    dj: new Map(),
    suo: new Map(),
    fuck: new Map(),
  };
}

/**
 * 检查 CD 是否已过；返回 { ok, remaining }，remaining 单位秒。
 * ok 为 true 表示允许执行，调用方应自行 markUsed。
 */
export function checkCooldown(
  bucket: Map<string, number>,
  uid: string,
  cdSeconds: number,
): { ok: boolean; remaining: number } {
  const last = bucket.get(uid);
  if (last == null) return { ok: true, remaining: 0 };
  const elapsed = nowSeconds() - last;
  if (elapsed >= cdSeconds) return { ok: true, remaining: 0 };
  return { ok: false, remaining: cdSeconds - elapsed };
}

export function markCooldown(bucket: Map<string, number>, uid: string): void {
  bucket.set(uid, nowSeconds());
}

export function clearCooldown(bucket: Map<string, number>, uid: string): void {
  bucket.delete(uid);
}
