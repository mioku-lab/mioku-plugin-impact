import type { MiokuContext } from "mioku";


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
 * 提取消息里第一个 @ 的目标 id，忽略 @全体。
 * 兼容 qq-official 的 target 段。找不到返回 undefined。
 */
export function getAtUserId(message: any): string | undefined {
  if (!Array.isArray(message)) return undefined;
  for (const seg of message) {
    if (seg?.type !== "at") continue;
    const raw = seg?.data?.qq ?? seg?.qq ?? seg?.data?.target ?? seg?.target;
    if (raw == null) continue;
    const id = String(raw).trim();
    if (!id || id === "all") continue;
    return id;
  }
  return undefined;
}

export function isGroupEvent(event: any): boolean {
  return event?.message_type === "group" && event?.group_id != null;
}

export function getSenderName(event: any): string {
  const card = String(event?.sender?.card || "").trim();
  if (card) return card;
  const nickname = String(event?.sender?.nickname || "").trim();
  if (nickname) return nickname;
  return String(event?.user_id ?? "群友");
}

export async function getStrangerNickname(
  bot: import("mioku").Bot | undefined,
  userId: string,
): Promise<string> {
  try {
    const info = bot ? await bot.getFriendInfo(userId) : undefined;
    const name = String(info?.nickname || "").trim();
    if (name) return name;
  } catch {
    // 接口不可用就回退到 QQ 号
  }
  return String(userId);
}

const QQ_AVATAR_ADAPTERS = new Set(["onebotv11", "icqq"]);
const QQ_ID_RE = /^\d{4,12}$/;

/**
 * 生成头像地址。仅在 QQ 系适配器且 id 是 QQ 号时才回退到 qlogo，
 * 其他平台（如 qq-official 的 openid）没有通用头像接口，返回空串由调用方降级。
 */
export function getAvatarUrl(
  userId: string,
  options?: { avatar?: unknown; adapter?: unknown },
): string {
  const direct = String(options?.avatar ?? "").trim();
  if (direct) return direct;
  const id = String(userId ?? "").trim();
  const adapter = String(options?.adapter ?? "").trim().toLowerCase();
  if (adapter && !QQ_AVATAR_ADAPTERS.has(adapter)) return "";
  return QQ_ID_RE.test(id) ? `https://q1.qlogo.cn/g?b=qq&nk=${id}&s=640` : "";
}

export function resolveAvatarUrl(event: any, userId: string): string {
  const id = String(userId ?? "").trim();
  const isSelf = id !== "" && id === String(event?.user_id ?? "").trim();
  const avatar = isSelf ? event?.sender?.avatar ?? event?.avatar : undefined;
  return getAvatarUrl(id, { avatar, adapter: event?.bot?.adapter });
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
