export interface ImpactConfig {
  /** 打胶 / 开导 冷却时间（秒） */
  djCd: number;
  /** pk / 对决 冷却时间（秒） */
  pkCd: number;
  /** 嗦牛子 冷却时间（秒） */
  suoCd: number;
  /** 透群友 / 日群友 冷却时间（秒） */
  fuckCd: number;
  /** 开启后每天 0 点对超过一天没活跃的用户随机扣 0–1cm */
  isalive: boolean;
}

export const DEFAULT_CONFIG: ImpactConfig = {
  djCd: 300,
  pkCd: 60,
  suoCd: 300,
  fuckCd: 3600,
  isalive: false,
};

export function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function numOrDefault(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function normalizeImpactConfig(config: any): ImpactConfig {
  const c = config || {};
  return {
    djCd: numOrDefault(c.djCd, DEFAULT_CONFIG.djCd),
    pkCd: numOrDefault(c.pkCd, DEFAULT_CONFIG.pkCd),
    suoCd: numOrDefault(c.suoCd, DEFAULT_CONFIG.suoCd),
    fuckCd: numOrDefault(c.fuckCd, DEFAULT_CONFIG.fuckCd),
    isalive: typeof c.isalive === "boolean" ? c.isalive : DEFAULT_CONFIG.isalive,
  };
}
