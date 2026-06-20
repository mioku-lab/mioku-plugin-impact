import { createDB } from "mioki";
import { ensureDataDir } from "mioku";
import * as path from "path";
import type {
  EjaculationRecord,
  ImpactStore,
  RankEntry,
  UserData,
} from "./types";
import { getToday, nowSeconds } from "./utils";

const DEFAULT_STORE: ImpactStore = {
  users: {},
  groups: {},
  ejaculations: {},
};

export const DEFAULT_JJ_LENGTH = 10.0;

export interface ImpactDatabase {
  isUserInTable(userId: number): boolean;
  addNewUser(userId: number): Promise<void>;
  updateActivity(userId: number): Promise<void>;
  getJjLength(userId: number): number;
  /** 累加长度（可负）。先确保用户存在再调用。 */
  addJjLength(userId: number, delta: number): Promise<void>;
  isGroupAllowed(groupId: number): boolean;
  setGroupAllow(groupId: number, allow: boolean): Promise<void>;
  insertEjaculation(userId: number, volume: number): Promise<void>;
  getEjaculationData(userId: number): EjaculationRecord[];
  getTodayEjaculationVolume(userId: number): number;
  /** 一天没活跃的用户随机扣 0–1cm（仅对 jj_length > 1 的用户生效） */
  punishInactiveUsers(): Promise<number>;
  /** 全表按 jjLength 倒序排列 */
  getRanking(): RankEntry[];
}

export async function initImpactDatabase(): Promise<ImpactDatabase> {
  const dir = ensureDataDir("impact");
  const file = path.join(dir, "impact.json");
  const db = await createDB<ImpactStore>(file, {
    defaultData: structuredClone(DEFAULT_STORE),
  });

  // hand-edited / partial files：兜底
  if (!db.data.users) db.data.users = {};
  if (!db.data.groups) db.data.groups = {};
  if (!db.data.ejaculations) db.data.ejaculations = {};

  function getUserRow(userId: number): UserData | undefined {
    return db.data.users[String(userId)];
  }

  return {
    isUserInTable(userId) {
      return getUserRow(userId) != null;
    },

    async addNewUser(userId) {
      if (getUserRow(userId)) return;
      db.data.users[String(userId)] = {
        jjLength: DEFAULT_JJ_LENGTH,
        lastMasturbationTime: nowSeconds(),
      };
      await db.write();
    },

    async updateActivity(userId) {
      const key = String(userId);
      let row = db.data.users[key];
      if (!row) {
        row = {
          jjLength: DEFAULT_JJ_LENGTH,
          lastMasturbationTime: nowSeconds(),
        };
        db.data.users[key] = row;
      } else {
        row.lastMasturbationTime = nowSeconds();
      }
      await db.write();
    },

    getJjLength(userId) {
      return getUserRow(userId)?.jjLength ?? 0;
    },

    async addJjLength(userId, delta) {
      const row = getUserRow(userId);
      if (!row) return;
      row.jjLength = roundTo3(row.jjLength + delta);
      row.lastMasturbationTime = nowSeconds();
      await db.write();
    },

    isGroupAllowed(groupId) {
      return Boolean(db.data.groups[String(groupId)]?.allow);
    },

    async setGroupAllow(groupId, allow) {
      const key = String(groupId);
      db.data.groups[key] = { allow };
      await db.write();
    },

    async insertEjaculation(userId, volume) {
      const key = String(userId);
      const date = getToday();
      const list = (db.data.ejaculations[key] ??= []);
      const today = list.find((r) => r.date === date);
      if (today) {
        today.volume = roundTo3(today.volume + volume);
      } else {
        list.push({ date, volume: roundTo3(volume) });
      }
      await db.write();
    },

    getEjaculationData(userId) {
      const list = db.data.ejaculations[String(userId)];
      return list ? list.slice() : [];
    },

    getTodayEjaculationVolume(userId) {
      const list = db.data.ejaculations[String(userId)];
      if (!list) return 0;
      const date = getToday();
      const today = list.find((r) => r.date === date);
      return today ? today.volume : 0;
    },

    async punishInactiveUsers() {
      const now = nowSeconds();
      let touched = 0;
      for (const row of Object.values(db.data.users)) {
        if (now - row.lastMasturbationTime > 86400 && row.jjLength > 1) {
          row.jjLength = roundTo3(row.jjLength - Math.random());
          touched += 1;
        }
      }
      if (touched > 0) await db.write();
      return touched;
    },

    getRanking() {
      const rows: RankEntry[] = [];
      for (const [uid, data] of Object.entries(db.data.users)) {
        rows.push({ userId: Number(uid), jjLength: data.jjLength });
      }
      rows.sort((a, b) => b.jjLength - a.jjLength);
      return rows;
    },
  };
}

function roundTo3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
