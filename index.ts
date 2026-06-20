import type { ConfigService, ScreenshotService } from "mioku";
import { definePlugin, type MiokiContext } from "mioki";
import {
  cloneConfig,
  DEFAULT_CONFIG,
  normalizeImpactConfig,
  type ImpactConfig,
} from "./configs/base";
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
import { parseImpactCommand } from "./router";
import { createCooldownState } from "./state";
import { NOT_ALLOW_TEXT, isGroupEvent } from "./utils";

const impactPlugin = definePlugin({
  name: "impact",
  version: "1.0.0",
  description: "让群友们眼前一黑的淫趴插件（牛子比拼），移植自 nonebot_plugin_impact",

  async setup(ctx: MiokiContext) {
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
    const screenshot = ctx.services?.screenshot as
      | ScreenshotService
      | undefined;
    if (!screenshot) {
      ctx.logger.warn(
        "impact: screenshot 服务未启用, jj排行榜 / 注入查询历史图表将不可用",
      );
    }

    let config: ImpactConfig = cloneConfig(DEFAULT_CONFIG);
    const configService = ctx.services?.config as ConfigService | undefined;
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

    ctx.handle("message", async (event: any) => {
      if (!isGroupEvent(event)) return;
      const text = ctx.text(event);
      if (!text) return;

      const cmd = parseImpactCommand(text);
      if (cmd.type === "none") return;

      const h: HandlerContext = { ctx, db, cd, config, screenshot, event };

      try {
        // open_module 始终可用，不受群开关限制
        if (cmd.type === "open_module") {
          await handleOpenModule(h, cmd.enable);
          return;
        }

        // 其余命令需要群开启了银趴
        if (!db.isGroupAllowed(Number(event.group_id))) {
          await event.reply(
            [ctx.segment.at(Number(event.user_id)), ctx.segment.text(NOT_ALLOW_TEXT)],
            false,
          );
          return;
        }

        switch (cmd.type) {
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
            return await handleYinpa(h, cmd.subject);
          case "query_injection":
            return await handleQueryInjection(h, cmd.mode);
        }
      } catch (error) {
        ctx.logger.error(`impact 命令 ${cmd.type} 执行失败: ${error}`);
        try {
          await event.reply(
            [ctx.segment.text(`淫趴插件出错了喵: ${String(error)}`)],
            false,
          );
        } catch {
          // 忽略二次失败
        }
      }
    });

    ctx.logger.info("impact 插件初始化完成");

    return () => {
      ctx.logger.info("impact 插件已卸载");
    };
  },
});

export default impactPlugin;
