import { isOwner } from "mioki";
import { isGroupAdmin } from "../utils";
import type { HandlerContext } from "./types";

export async function handleOpenModule(
  h: HandlerContext,
  enable: boolean,
): Promise<void> {
  const { ctx, db, event } = h;
  if (!isOwner(event) && !isGroupAdmin(event)) {
    await event.reply(
      [ctx.segment.text("权限不足喵, 仅管理员/群主/主人可以开关淫趴")],
      false,
    );
    return;
  }
  await db.setGroupAllow(Number(event.group_id), enable);
  await event.reply(
    [ctx.segment.text(enable ? "功能已开启喵" : "功能已禁用喵")],
    false,
  );
}
