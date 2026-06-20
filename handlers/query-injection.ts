import { renderInjectionChart } from "../image";
import { getAtUserId } from "../utils";
import type { HandlerContext } from "./types";

export async function handleQueryInjection(
  h: HandlerContext,
  mode: "today" | "history",
): Promise<void> {
  const { ctx, db, screenshot, event } = h;
  const at = getAtUserId(event.message);
  const target = at ?? Number(event.user_id);
  // 有 @ 用"该用户"，无 @ 用"您"
  const replay1 = at != null ? "该用户" : "您";

  if (mode === "today") {
    const today = db.getTodayEjaculationVolume(target);
    await event.reply(
      [ctx.segment.text(`${replay1}当日总被注射量为${today}ml`)],
      false,
    );
    return;
  }

  // history / 全部
  const records = db.getEjaculationData(target);
  if (records.length === 0) {
    await event.reply(
      [ctx.segment.text(`${replay1}历史总被注射量为0ml`)],
      false,
    );
    return;
  }

  const injectData = new Map<string, number>();
  let total = 0;
  for (const item of records) {
    total += item.volume;
    injectData.set(item.date, item.volume);
  }

  // 记录少于 2 天，只返回总量
  if (injectData.size < 2) {
    await event.reply(
      [ctx.segment.text(`${replay1}历史总被注射量为${total}ml`)],
      false,
    );
    return;
  }

  if (!screenshot) {
    ctx.logger.warn(
      "impact: screenshot 服务未启用，无法绘制历史走势图，仅返回总量",
    );
    await event.reply(
      [ctx.segment.text(`${replay1}历史总被注射量为${total}ml`)],
      false,
    );
    return;
  }

  // 折线图按日期排序
  const sorted = Array.from(injectData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, volume]) => ({ date, volume }));

  const imagePath = await renderInjectionChart(screenshot, sorted, total);
  await event.reply(
    [
      ctx.segment.text(`${replay1}历史总被注射量为${total}ml`),
      ctx.segment.image(imagePath),
    ],
    false,
  );
}
