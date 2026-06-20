export type ImpactCommand =
  | { type: "pk" }
  | { type: "dajiao" }
  | { type: "suo" }
  | { type: "queryjj" }
  | { type: "rank" }
  | { type: "yinpa"; subject: "member" | "owner" | "admin" }
  | { type: "open_module"; enable: boolean }
  | { type: "query_injection"; mode: "today" | "history" }
  | { type: "none" };

const YINPA_RE =
  /^(?:日群友|透群友|日群主|透群主|日管理|透管理)(?:\s|$|@)/u;

const OPEN_MODULE_RE =
  /^(?:开始银趴|关闭银趴|开启淫趴|禁止淫趴|开启银趴|禁止银趴)\s*$/u;

const RANK_HEADS = new Set([
  "jj排行榜",
  "jj排名",
  "jj榜单",
  "jjrank",
  "JJ排行榜",
  "JJ排名",
  "JJ榜单",
  "JJrank",
  "JJRANK",
]);

/**
 * 把消息文本解析成 impact 命令。
 * 仅看消息开头（去掉前导空白），命中失败返回 { type: "none" }。
 */
export function parseImpactCommand(text: string): ImpactCommand {
  const head = text.replace(/^\s+/, "");
  if (!head) return { type: "none" };

  // 银趴开关：完整匹配
  const open = head.match(OPEN_MODULE_RE);
  if (open) {
    const word = open[0];
    const enable = word.startsWith("开启") || word.startsWith("开始");
    return { type: "open_module", enable };
  }

  // 透/日 系列
  const yinpa = head.match(YINPA_RE);
  if (yinpa) {
    const word = yinpa[0];
    const subject: "owner" | "admin" | "member" = word.includes("群主")
      ? "owner"
      : word.includes("管理")
      ? "admin"
      : "member";
    return { type: "yinpa", subject };
  }

  // pk / 对决：要求形如 "pk @某人" 或 "pk"。具体的 at 校验放到 handler。
  if (/^(pk|PK|对决)(\s|@|$)/.test(head)) {
    return { type: "pk" };
  }

  // 打胶 / 开导：完整匹配
  if (/^(打胶|开导)\s*$/.test(head)) {
    return { type: "dajiao" };
  }

  // 嗦牛子
  if (/^嗦牛子(\s|@|$)/.test(head)) {
    return { type: "suo" };
  }

  // 注入查询 / 摄入查询 / 射入查询
  const inj = head.match(/^(?:注入查询|摄入查询|射入查询)(.*)$/u);
  if (inj) {
    const rest = inj[1] || "";
    const mode = /历史|全部/.test(rest) ? "history" : "today";
    return { type: "query_injection", mode };
  }

  // 排行榜
  for (const word of RANK_HEADS) {
    if (head === word || head.startsWith(`${word} `) || head.startsWith(`${word}\n`)) {
      return { type: "rank" };
    }
  }

  // 只匹配 "查询" + 空白/at/结束，避免误吞太多文本
  if (/^查询(\s|@|$)/.test(head)) {
    return { type: "queryjj" };
  }

  return { type: "none" };
}
