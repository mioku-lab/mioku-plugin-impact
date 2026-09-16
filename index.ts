import { definePlugin, type CommandDefinition, type MiokuContext } from "mioku";
import {
  cloneConfig,
  DEFAULT_CONFIG,
  normalizeImpactConfig,
  type ImpactConfig,
} from "./configs/base";
import { getService, Services } from "mioku";
import { initImpactDatabase, type ImpactDatabase } from "./db";
import { handleDajiao } from "./handlers/dajiao";
import { handleOpenModule } from "./handlers/open-module";
import { handlePk } from "./handlers/pk";
import { handleQueryInjection } from "./handlers/query-injection";
import { handleQueryJj } from "./handlers/queryjj";
import { handleRank } from "./handlers/rank";
import { handleSuo } from "./handlers/suo";
import { handleYinpa } from "./handlers/yinpa";
import type { HandlerContext } from "./handlers/types";
import { createCooldownState } from "./state";
import { NOT_ALLOW_TEXT, isGroupEvent } from "./utils";

type HandlerType =
  | "pk"
  | "dajiao"
  | "suo"
  | "queryjj"
  | "rank"
  | "yinpa"
  | "open_module"
  | "query_injection";

const impactPlugin = definePlugin({
  name: "impact",

  async setup(ctx: MiokuContext) {
    ctx.logger.info("impact 插件正在初始化...");

    let db: ImpactDatabase;
    try {
      db = await initImpactDatabase();
    } catch (error) {
      ctx.logger.error(`impact 数据库初始化失败: ${error}`);
      return () => {
        ctx.logger.info("impact 插件已卸载");
      };
    }

    const cd = createCooldownState();
    const screenshot = getService(ctx, Services.Screenshot);
    if (!screenshot) {
      ctx.logger.warn(
        "impact: screenshot 服务未启用, jj排行榜 / 注入查询历史图表将不可用",
      );
    }

    let config: ImpactConfig = cloneConfig(DEFAULT_CONFIG);
    const configService = getService(ctx, Services.Config);
    if (configService) {
      await configService.registerConfig("impact", "base", config);
      const persisted = await configService.getConfig("impact", "base");
      if (persisted) {
        config = normalizeImpactConfig(persisted);
      }
      configService.onConfigChange("impact", "base", (next) => {
        config = normalizeImpactConfig(next);
      });
    } else {
      ctx.logger.warn("config 服务未加载，impact 插件将使用默认配置");
    }

    if (config.isalive) {
      ctx.cron("0 0 * * *", async () => {
        try {
          const touched = await db.punishInactiveUsers();
          if (touched > 0) {
            ctx.logger.info(`impact: 已对 ${touched} 个不活跃用户随机扣减长度`);
          }
        } catch (error) {
          ctx.logger.error(`impact 不活跃惩罚执行失败: ${error}`);
        }
      });
    }

    const run = (type: HandlerType) => async (event: any, extra?: unknown) => {
      if (!isGroupEvent(event)) return;
      const h: HandlerContext = { ctx, db, cd, config, screenshot, event };
      try {
        if (type === "open_module") {
          await handleOpenModule(h, extra as boolean);
          return;
        }
        if (!db.isGroupAllowed(Number(event.group_id))) {
          await event.reply(
            [ctx.segment.at(String(event.user_id)), ctx.segment.text(NOT_ALLOW_TEXT)],
            false,
          );
          return;
        }
        switch (type) {
          case "pk":
            return await handlePk(h);
          case "dajiao":
            return await handleDajiao(h);
          case "suo":
            return await handleSuo(h);
          case "queryjj":
            return await handleQueryJj(h);
          case "rank":
            return await handleRank(h);
          case "yinpa":
            return await handleYinpa(h, extra as "owner" | "admin" | "member");
          case "query_injection":
            return await handleQueryInjection(h, extra as "today" | "history");
        }
      } catch (error) {
        ctx.logger.error(`impact 命令 ${type} 执行失败: ${error}`);
        try {
          await event.reply(
            [ctx.segment.text(`淫趴插件出错了喵: ${String(error)}`)],
            false,
          );
        } catch {
          // 忽略二次失败
        }
      }
    };

    const cmd = (command: CommandDefinition) =>
      ctx.command({ ...command, prefixes: false });

    cmd({
      id: "开启淫趴",
      name: "开启淫趴",
      match: /^(?:开始银趴|关闭银趴|开启淫趴|禁止淫趴|开启银趴|禁止银趴)\s*$/,
      permission: "admin",
      description: "在本群开启或关闭淫趴功能",
      usage: "开启淫趴 / 关闭银趴",
      handler: ({ event, match }) =>
        run("open_module")(event, match![0].startsWith("开启") || match![0].startsWith("开始")),
    });
    cmd({
      id: "日透",
      name: "日群友",
      match: /^(日群友|透群友|日群主|透群主|日管理|透管理)(?:\s|$|@)/,
      description: "随机或定向选取一位幸运儿进行注入，按命令决定身份",
      usage: "日群友 / 透群友 @某人 / 透群主 / 透管理",
      handler: ({ event, match }) => {
        const word = match![1];
        const subject = word.includes("群主") ? "owner" : word.includes("管理") ? "admin" : "member";
        return run("yinpa")(event, subject);
      },
    });
    cmd({
      id: "pk",
      name: "pk",
      match: /^(?:pk|PK|对决)(?:\s|@|$)/,
      description: "和 @ 的群友进行牛子对决，胜者抢走败者的随机长度",
      usage: "pk @某人",
      handler: ({ event }) => run("pk")(event),
    });
    cmd({
      id: "打胶",
      name: "打胶",
      match: /^(?:打胶|开导)\s*$/,
      description: "给自己的牛子增加一段随机长度",
      handler: ({ event }) => run("dajiao")(event),
    });
    cmd({
      id: "嗦牛子",
      name: "嗦牛子",
      match: /^嗦牛子(?:\s|@|$)/,
      description: "嗦自己或被 @ 的群友的牛子，增加随机长度",
      usage: "嗦牛子 / 嗦牛子 @某人",
      handler: ({ event }) => run("suo")(event),
    });
    cmd({
      id: "查询",
      name: "查询",
      match: /^查询(?:\s|@|$)/,
      description: "查询自己或 @ 的群友的牛子长度",
      usage: "查询 / 查询 @某人",
      handler: ({ event }) => run("queryjj")(event),
    });
    cmd({
      id: "注入查询",
      name: "注入查询",
      match: /^(?:注入查询|摄入查询|射入查询)(.*)$/,
      description: "查询当日或全部历史被注入量，加 历史/全部 看走势图",
      usage: "注入查询 / 注入查询 历史 / 注入查询 @某人 全部",
      handler: ({ event, match }) =>
        run("query_injection")(event, /历史|全部/.test(match![1] || "") ? "history" : "today"),
    });
    cmd({
      id: "jj排行榜",
      name: "jj排行榜",
      match: /^(?:jj|JJ)(?:排行榜|排名|榜单|rank|RANK)(?:\s|$)/,
      description: "查看牛子长度前五与倒数五名的图表",
      usage: "jj排行榜 / jjrank",
      handler: ({ event }) => run("rank")(event),
    });

    ctx.logger.info("impact 插件初始化完成");

    return () => {
      ctx.logger.info("impact 插件已卸载");
    };
  },
});

export default impactPlugin;
