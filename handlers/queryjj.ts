import { getAtUserId, pickJj } from "../utils";
import type { HandlerContext } from "./types";

export async function handleQueryJj(h: HandlerContext): Promise<void> {
  const { ctx, db, event } = h;
  const uid = Number(event.user_id);
  const at = getAtUserId(event.message);

  if (at == null) {
    if (db.isUserInTable(uid)) {
      await event.reply(
        [
          ctx.segment.at(uid),
          ctx.segment.text(`你的${pickJj()}目前长度为${db.getJjLength(uid)}cm喵`),
        ],
        false,
      );
    } else {
      await db.addNewUser(uid);
      await event.reply(
        [
          ctx.segment.at(uid),
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
    await event.reply(
      [
        ctx.segment.at(uid),
        ctx.segment.text(`TA的${pickJj()}目前长度为${db.getJjLength(at)}cm喵`),
      ],
      false,
    );
  } else {
    await db.addNewUser(at);
    await event.reply(
      [
        ctx.segment.at(uid),
        ctx.segment.text(
          `TA还没有创建${pickJj()}喵, 咱帮他创建了喵, 目前长度是10cm喵`,
        ),
      ],
      false,
    );
  }
}
