import { checkCooldown, markCooldown } from "../state";
import { getRandomNum, pickJj, roundTo } from "../utils";
import type { HandlerContext } from "./types";

export async function handleDajiao(h: HandlerContext): Promise<void> {
  const { ctx, db, cd, config, event } = h;
  const uid = String(event.user_id ?? "").trim();
  const cdState = checkCooldown(cd.dj, uid, config.djCd);
  if (!cdState.ok) {
    await event.reply(
      [
        ctx.segment.at(uid),
        ctx.segment.text(
          `你已经打不动了喵, 请等待${roundTo(cdState.remaining, 3)}秒后再打喵`,
        ),
      ],
      false,
    );
    return;
  }

  markCooldown(cd.dj, uid);

  if (db.isUserInTable(uid)) {
    const delta = getRandomNum();
    await db.addJjLength(uid, delta);
    await event.reply(
      [
        ctx.segment.at(uid),
        ctx.segment.text(
          `打胶结束喵, 你的${pickJj()}很满意喵, 长了${delta}cm喵, 目前长度为${db.getJjLength(uid)}cm喵`,
        ),
      ],
      false,
    );
  } else {
    await db.addNewUser(uid);
    await event.reply(
      [
        ctx.segment.at(uid),
        ctx.segment.text(
          `你还没有创建${pickJj()}, 咱帮你创建了喵, 目前长度是10cm喵`,
        ),
      ],
      false,
    );
  }
}
