import type { ScreenshotService } from "mioku";
import type { MiokuContext } from "mioku";
import type { ImpactConfig } from "../configs/base";
import type { ImpactDatabase } from "../db";
import type { CooldownState } from "../types";

export interface HandlerContext {
  ctx: MiokuContext;
  db: ImpactDatabase;
  cd: CooldownState;
  config: ImpactConfig;
  /** 截图服务可能未启用，依赖图片输出的命令需要降级或拒绝 */
  screenshot?: ScreenshotService;
  event: any;
}
