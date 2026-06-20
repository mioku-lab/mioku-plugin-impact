import { checkCooldown, clearCooldown, markCooldown } from "../state";
import { getAtUserId, getRandomNum, pickJj, roundTo } from "../utils";
import type { HandlerContext } from "./types";

export async function handleSuo(h: HandlerContext): Promise<void> {
  const { ctx, db, cd, config, event } = h;
  const uid = String(event.user_id);
  const cdState = checkCooldown(cd.suo, uid, config.suoCd);
  if (!cdState.ok) {
    await event.reply(
      [
        ctx.segment.at(Number(event.user_id)),
        ctx.segment.text(
          `你已经嗦不动了喵, 请等待${roundTo(cdState.remaining, 3)}秒后再嗦喵`,
        ),
      ],
      false,
    );
    return;
  }
  markCooldown(cd.suo, uid);

  const at = getAtUserId(event.message);
  if (at == null) {
    if (db.isUserInTable(Number(uid))) {
      const delta = getRandomNum();
      await db.addJjLength(Number(uid), delta);
      await event.reply(
        [
          ctx.segment.at(Number(event.user_id)),
          ctx.segment.text(
            `你的${pickJj()}很满意喵, 嗦长了${delta}cm喵, 目前长度为${db.getJjLength(
              Number(uid),
            )}cm喵`,
          ),
        ],
        false,
      );
    } else {
      await db.addNewUser(Number(uid));
      clearCooldown(cd.suo, uid);
      await event.reply(
        [
          ctx.segment.at(Number(event.user_id)),
          ctx.segment.text(
            `你还没有创建${pickJj()}喵, 咱帮你创建了喵, 目前长度是10cm喵`,
          ),
        ],
        false,
      );
    }
    return;
  }

  if (db.isUserInTable(at)) {
    const delta = getRandomNum();
    await db.addJjLength(at, delta);
    await event.reply(
      [
        ctx.segment.at(Number(event.user_id)),
        ctx.segment.text(
          `对方的${pickJj()}很满意喵, 嗦长了${delta}cm喵, 目前长度为${db.getJjLength(
            at,
          )}cm喵`,
        ),
      ],
      false,
    );
  } else {
    await db.addNewUser(at);
    clearCooldown(cd.suo, uid);
    await event.reply(
      [
        ctx.segment.at(Number(event.user_id)),
        ctx.segment.text(
          `TA还没有创建${pickJj()}喵, 咱帮TA创建了喵, 目前长度是10cm喵`,
        ),
      ],
      false,
    );
  }
}
