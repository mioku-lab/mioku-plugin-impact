import { checkCooldown, clearCooldown, markCooldown } from "../state";
import { getAtUserId, getRandomNum, pickJj, roundTo } from "../utils";
import type { HandlerContext } from "./types";

export async function handlePk(h: HandlerContext): Promise<void> {
  const { ctx, db, cd, config, event } = h;
  const uid = String(event.user_id);
  const cdState = checkCooldown(cd.pk, uid, config.pkCd);
  if (!cdState.ok) {
    await event.reply(
      [
        ctx.segment.at(Number(event.user_id)),
        ctx.segment.text(
          `你已经pk不动了喵, 请等待${roundTo(cdState.remaining, 3)}秒后再pk喵`,
        ),
      ],
      false,
    );
    return;
  }

  const at = getAtUserId(event.message);
  if (at == null) {
    // pk 必须带 @，无 @ 时不响应
    return;
  }
  if (at === Number(uid)) {
    await event.reply(
      [
        ctx.segment.at(Number(event.user_id)),
        ctx.segment.text("你不能pk自己喵"),
      ],
      false,
    );
    return;
  }

  markCooldown(cd.pk, uid);

  const meIn = db.isUserInTable(Number(uid));
  const otherIn = db.isUserInTable(at);
  if (!meIn || !otherIn) {
    if (!meIn) await db.addNewUser(Number(uid));
    if (!otherIn) await db.addNewUser(at);
    clearCooldown(cd.pk, uid);
    await event.reply(
      [
        ctx.segment.at(Number(event.user_id)),
        ctx.segment.text(
          `你或对面还没有创建${pickJj()}喵, 咱全帮你创建了喵, 你们的${pickJj()}长度都是10cm喵`,
        ),
      ],
      false,
    );
    return;
  }

  const win = Math.random() > 0.5;
  const delta = getRandomNum();
  if (win) {
    await db.addJjLength(Number(uid), delta / 2);
    await db.addJjLength(at, -delta);
    await event.reply(
      [
        ctx.segment.at(Number(event.user_id)),
        ctx.segment.text(
          `对决胜利喵, 你的${pickJj()}增加了${roundTo(
            delta / 2,
            3,
          )}cm喵, 对面则在你的阴影笼罩下减小了${delta}cm喵`,
        ),
      ],
      false,
    );
  } else {
    await db.addJjLength(Number(uid), -delta);
    await db.addJjLength(at, delta / 2);
    await event.reply(
      [
        ctx.segment.at(Number(event.user_id)),
        ctx.segment.text(
          `对决失败喵, 在对面牛子的阴影笼罩下你的${pickJj()}减小了${delta}cm喵, 对面增加了${roundTo(
            delta / 2,
            3,
          )}cm喵`,
        ),
      ],
      false,
    );
  }
}
