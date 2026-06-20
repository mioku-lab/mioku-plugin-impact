import type { MiokiContext } from "mioki";

export const JJ_VARIABLES = ["牛子", "牛牛", "丁丁", "JJ"] as const;

export const NOT_ALLOW_TEXT =
  '群内还未开启淫趴游戏, 请管理员或群主发送"开启淫趴"以开启该功能';

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function getToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function pickJj(): string {
  return JJ_VARIABLES[Math.floor(Math.random() * JJ_VARIABLES.length)];
}

/**
 * 获取一个随机数：0.1 概率落在 [1, 2)，0.9 概率落在 [0, 1)。保留 3 位小数。
 */
export function getRandomNum(): number {
  const seed = Math.random();
  const value = seed > 0.1 ? Math.random() : 1 + Math.random();
  return Math.round(value * 1000) / 1000;
}

export function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/**
 * 提取消息里第一个 @ 的 QQ 号，忽略 @全体。
 * 找不到返回 undefined。
 */
export function getAtUserId(message: any): number | undefined {
  if (!Array.isArray(message)) return undefined;
  for (const seg of message) {
    if (seg?.type !== "at") continue;
    const raw = seg?.qq ?? seg?.data?.qq;
    if (raw == null || raw === "all") continue;
    const qq = Number(raw);
    if (Number.isFinite(qq)) return qq;
  }
  return undefined;
}

export function isGroupEvent(event: any): boolean {
  return event?.message_type === "group" && event?.group_id != null;
}

export function isGroupAdmin(event: any): boolean {
  const role = event?.sender?.role;
  return role === "admin" || role === "owner";
}

export function getSenderName(event: any): string {
  const card = String(event?.sender?.card || "").trim();
  if (card) return card;
  const nickname = String(event?.sender?.nickname || "").trim();
  if (nickname) return nickname;
  return String(event?.user_id ?? "群友");
}

export async function getStrangerNickname(
  ctx: MiokiContext,
  selfId: number,
  userId: number,
): Promise<string> {
  try {
    const info = (await ctx
      .pickBot(selfId)
      .api("get_stranger_info", { user_id: userId, no_cache: false })) as
      | { nickname?: string }
      | undefined;
    const name = String(info?.nickname || "").trim();
    if (name) return name;
  } catch {
    // 接口不可用就回退到 QQ 号
  }
  return String(userId);
}

export function getAvatarUrl(userId: number): string {
  return `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`;
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
