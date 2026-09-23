import type { HandlerContext } from "./types";

export async function handleOpenModule(
  h: HandlerContext,
  enable: boolean,
): Promise<void> {
  const { ctx, db, event } = h;
  await db.setGroupAllow(String(event.group_id ?? "").trim(), enable);
  await event.reply(
    [ctx.segment.text(enable ? "功能已开启喵" : "功能已禁用喵")],
    false,
  );
}
