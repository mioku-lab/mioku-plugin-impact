import { renderRankChart, type RankRow } from "../image";
import { getStrangerNickname, pickJj } from "../utils";
import type { HandlerContext } from "./types";

export async function handleRank(h: HandlerContext): Promise<void> {
  const { ctx, db, screenshot, event } = h;
  const ranking = db.getRanking();
  if (ranking.length < 5) {
    await event.reply([ctx.segment.text("目前记录的数据量小于5, 无法显示rank喵")], false);
    return;
  }

  if (!screenshot) {
    await event.reply(
      [ctx.segment.text("缺少 screenshot 服务，无法生成排行榜图片喵")],
      false,
    );
    return;
  }

  const top5 = ranking.slice(0, 5);
  const last5 = ranking.slice(-5);

  const myIndex = ranking.findIndex((r) => r.userId === Number(event.user_id));
  if (myIndex < 0) {
    await db.addNewUser(Number(event.user_id));
    await event.reply(
      [
        ctx.segment.at(Number(event.user_id)),
        ctx.segment.text(
          `你还没有创建${pickJj()}看不到rank喵, 咱帮你创建了喵, 目前长度是10cm喵`,
        ),
      ],
      false,
    );
    return;
  }

  const selfId = Number(event.self_id);
  const rows: RankRow[] = await Promise.all(
    [...top5, ...last5].map(async (r) => ({
      name: await getStrangerNickname(ctx, selfId, r.userId),
      userId: r.userId,
      jjLength: r.jjLength,
    })),
  );

  const imagePath = await renderRankChart(screenshot, rows);

  await event.reply(
    [
      ctx.segment.at(Number(event.user_id)),
      ctx.segment.image(imagePath),
      ctx.segment.text(`你的排名为${myIndex + 1}喵`),
    ],
    false,
  );
}
