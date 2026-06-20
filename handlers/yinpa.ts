import { isOwner } from "mioki";
import { checkCooldown, clearCooldown, markCooldown } from "../state";
import {
  getAtUserId,
  getAvatarUrl,
  getSenderName,
  roundTo,
} from "../utils";
import type { HandlerContext } from "./types";

interface PrepMember {
  user_id: number;
  role: "owner" | "admin" | "member";
  card?: string;
  nickname?: string;
}

const SLEEP_BEFORE_REPLY_MS = 2000;

/**
 * 透/日 系列命令。subject 由命令文本决定：
 *   含"群主" → owner，含"管理" → admin，否则 → member。
 * 行为与 nonebot_plugin_impact.handle.Impart.yinpa 对齐。
 */
export async function handleYinpa(
  h: HandlerContext,
  subject: "owner" | "admin" | "member",
): Promise<void> {
  const { ctx, db, cd, config, event } = h;
  const uid = Number(event.user_id);
  const uidKey = String(uid);

  const cdState = checkCooldown(cd.fuck, uidKey, config.fuckCd);
  // 主人不受 CD 限制
  if (!cdState.ok && !isOwner(event)) {
    await event.reply(
      [
        ctx.segment.at(uid),
        ctx.segment.text(
          `你已经榨不出来任何东西了, 请先休息${roundTo(cdState.remaining, 3)}秒`,
        ),
      ],
      false,
    );
    return;
  }
  markCooldown(cd.fuck, uidKey);

  const reqUserCard = getSenderName(event);
  const selfId = Number(event.self_id);
  let prepList: PrepMember[];
  try {
    const raw = await ctx
      .pickBot(selfId)
      .api("get_group_member_list", { group_id: Number(event.group_id) });
    prepList = (raw as PrepMember[]) ?? [];
  } catch (err) {
    clearCooldown(cd.fuck, uidKey);
    ctx.logger.error(`impact: 获取群成员列表失败: ${err}`);
    await event.reply([ctx.segment.text("喵喵喵? 拿不到群成员列表了！")], false);
    return;
  }

  let lucky: number | null;
  if (subject === "owner") {
    lucky = await pickOwner(prepList, uid, reqUserCard, ctx, event);
  } else if (subject === "admin") {
    lucky = await pickAdmin(prepList, uid, reqUserCard, ctx, event);
  } else {
    lucky = await pickMember(prepList, uid, reqUserCard, ctx, event);
  }
  if (lucky == null) {
    // pickXxx 内部已 finish 并清掉 CD
    clearCooldown(cd.fuck, uidKey);
    return;
  }

  // 1.0 ~ 100.0 ml 随机，保留 3 位
  const volume = roundTo(1 + Math.random() * 99, 3);
  await db.insertEjaculation(lucky, volume);

  await sleep(SLEEP_BEFORE_REPLY_MS);

  await db.updateActivity(lucky);
  await db.updateActivity(uid);

  const luckyMember = prepList.find((p) => p.user_id === lucky);
  const luckyCard =
    String(luckyMember?.card || "").trim() ||
    String(luckyMember?.nickname || "").trim() ||
    "群友";
  const todayTotal = db.getTodayEjaculationVolume(lucky);
  const seconds = 1 + Math.floor(Math.random() * 20);

  await event.reply(
    [
      ctx.segment.text(
        `好欸！${reqUserCard}(${uid})用时${seconds}秒 \n给 ${luckyCard}(${lucky}) 注入了${volume}毫升的脱氧核糖核酸, 当日总注入量为：${todayTotal}毫升\n`,
      ),
      ctx.segment.image(getAvatarUrl(lucky)),
    ],
    false,
  );
}

async function pickOwner(
  prepList: PrepMember[],
  uid: number,
  reqUserCard: string,
  ctx: any,
  event: any,
): Promise<number | null> {
  // 找不到群主时回退到自己
  const owner = prepList.find((p) => p.role === "owner");
  const lucky = owner?.user_id ?? uid;
  if (lucky === uid) {
    await event.reply([ctx.segment.text("你透你自己?")], false);
    return null;
  }
  await event.reply(
    [ctx.segment.text(`现在咱将把群主\n送给${reqUserCard}色色！`)],
    false,
  );
  return lucky;
}

async function pickAdmin(
  prepList: PrepMember[],
  uid: number,
  reqUserCard: string,
  ctx: any,
  event: any,
): Promise<number | null> {
  let admins = prepList.filter((p) => p.role === "admin").map((p) => p.user_id);
  if (admins.includes(uid)) {
    // 自己是管理的话移除自己
    admins = admins.filter((id) => id !== uid);
  }
  if (admins.length === 0) {
    await event.reply([ctx.segment.text("喵喵喵? 找不到群管理!")], false);
    return null;
  }
  const lucky = admins[Math.floor(Math.random() * admins.length)];
  await event.reply(
    [ctx.segment.text(`现在咱将随机抽取一位幸运管理\n送给${reqUserCard}色色！`)],
    false,
  );
  return lucky;
}

async function pickMember(
  prepList: PrepMember[],
  uid: number,
  reqUserCard: string,
  ctx: any,
  event: any,
): Promise<number | null> {
  const at = getAtUserId(event.message);
  if (at != null) {
    // 有 @ 就直接指定目标，不播报抽取提示
    return at;
  }
  let candidates = prepList.map((p) => p.user_id);
  candidates = candidates.filter((id) => id !== uid);
  if (candidates.length === 0) {
    await event.reply([ctx.segment.text("喵喵喵? 群里没有别的群友了!")], false);
    return null;
  }
  const lucky = candidates[Math.floor(Math.random() * candidates.length)];
  await event.reply(
    [ctx.segment.text(`现在咱将随机抽取一位幸运群友\n送给${reqUserCard}色色！`)],
    false,
  );
  return lucky;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
