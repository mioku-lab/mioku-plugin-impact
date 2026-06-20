import { Database } from "bun:sqlite";
import * as path from "path";
import { ensureDataDir } from "mioku";
import type {
  EjaculationRecord,
  RankEntry,
} from "./types";
import { getToday, nowSeconds } from "./utils";

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
  close(): void;
}

interface UserRow {
  user_id: number;
  jj_length: number;
  last_masturbation_time: number;
}

export async function initImpactDatabase(): Promise<ImpactDatabase> {
  const dir = ensureDataDir("impact");
  const dbPath = path.join(dir, "impact.db");
  const db = new Database(dbPath);

  db.exec("PRAGMA journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      jj_length REAL NOT NULL,
      last_masturbation_time INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      group_id INTEGER PRIMARY KEY,
      allow INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ejaculations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      volume REAL NOT NULL,
      UNIQUE(user_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_ejaculations_user ON ejaculations(user_id, date);
  `);

  const stmts = {
    insertUser: db.prepare(`
      INSERT INTO users (user_id, jj_length, last_masturbation_time)
      VALUES ($userId, $jjLength, $lastMasturbationTime)
      ON CONFLICT(user_id) DO NOTHING
    `),
    upsertActivity: db.prepare(`
      INSERT INTO users (user_id, jj_length, last_masturbation_time)
      VALUES ($userId, $jjLength, $lastMasturbationTime)
      ON CONFLICT(user_id) DO UPDATE SET
        last_masturbation_time = $lastMasturbationTime
    `),
    getUser: db.prepare(
      `SELECT jj_length, last_masturbation_time FROM users WHERE user_id = $userId`,
    ),
    updateJjLength: db.prepare(`
      UPDATE users
      SET jj_length = $jjLength, last_masturbation_time = $lastMasturbationTime
      WHERE user_id = $userId
    `),
    getGroup: db.prepare(
      `SELECT allow FROM groups WHERE group_id = $groupId`,
    ),
    upsertGroup: db.prepare(`
      INSERT INTO groups (group_id, allow) VALUES ($groupId, $allow)
      ON CONFLICT(group_id) DO UPDATE SET allow = $allow
    `),
    upsertEjaculation: db.prepare(`
      INSERT INTO ejaculations (user_id, date, volume)
      VALUES ($userId, $date, $volume)
      ON CONFLICT(user_id, date) DO UPDATE SET volume = volume + $volume
    `),
    getEjaculationData: db.prepare(`
      SELECT date, volume FROM ejaculations
      WHERE user_id = $userId
      ORDER BY date ASC
    `),
    getTodayEjaculation: db.prepare(`
      SELECT volume FROM ejaculations
      WHERE user_id = $userId AND date = $date
    `),
    selectAllUsers: db.prepare(
      `SELECT user_id, jj_length, last_masturbation_time FROM users`,
    ),
    decrementJjLength: db.prepare(
      `UPDATE users SET jj_length = $jjLength WHERE user_id = $userId`,
    ),
  };

  return {
    isUserInTable(userId) {
      return stmts.getUser.get({ $userId: userId }) != null;
    },

    async addNewUser(userId) {
      stmts.insertUser.run({
        $userId: userId,
        $jjLength: DEFAULT_JJ_LENGTH,
        $lastMasturbationTime: nowSeconds(),
      });
    },

    async updateActivity(userId) {
      stmts.upsertActivity.run({
        $userId: userId,
        $jjLength: DEFAULT_JJ_LENGTH,
        $lastMasturbationTime: nowSeconds(),
      });
    },

    getJjLength(userId) {
      const row = stmts.getUser.get({ $userId: userId }) as
        | Pick<UserRow, "jj_length">
        | null;
      return row?.jj_length ?? 0;
    },

    async addJjLength(userId, delta) {
      const row = stmts.getUser.get({ $userId: userId }) as
        | Pick<UserRow, "jj_length">
        | null;
      if (!row) return;
      stmts.updateJjLength.run({
        $userId: userId,
        $jjLength: roundTo3(row.jj_length + delta),
        $lastMasturbationTime: nowSeconds(),
      });
    },

    isGroupAllowed(groupId) {
      const row = stmts.getGroup.get({ $groupId: groupId }) as
        | { allow: number }
        | null;
      return Boolean(row?.allow);
    },

    async setGroupAllow(groupId, allow) {
      stmts.upsertGroup.run({
        $groupId: groupId,
        $allow: allow ? 1 : 0,
      });
    },

    async insertEjaculation(userId, volume) {
      stmts.upsertEjaculation.run({
        $userId: userId,
        $date: getToday(),
        $volume: roundTo3(volume),
      });
    },

    getEjaculationData(userId) {
      const rows = stmts.getEjaculationData.all({ $userId: userId }) as Array<
        Pick<EjaculationRecord, "date" | "volume">
      >;
      return rows.map((row) => ({ date: row.date, volume: row.volume }));
    },

    getTodayEjaculationVolume(userId) {
      const row = stmts.getTodayEjaculation.get({
        $userId: userId,
        $date: getToday(),
      }) as { volume: number } | null;
      return row?.volume ?? 0;
    },

    async punishInactiveUsers() {
      const now = nowSeconds();
      const rows = stmts.selectAllUsers.all({}) as UserRow[];
      let touched = 0;
      const tx = db.transaction(() => {
        for (const row of rows) {
          if (
            now - row.last_masturbation_time > 86400 &&
            row.jj_length > 1
          ) {
            stmts.decrementJjLength.run({
              $userId: row.user_id,
              $jjLength: roundTo3(row.jj_length - Math.random()),
            });
            touched += 1;
          }
        }
      });
      tx();
      return touched;
    },

    getRanking() {
      const rows = stmts.selectAllUsers.all({}) as UserRow[];
      return rows
        .map((row) => ({ userId: row.user_id, jjLength: row.jj_length }))
        .sort((a, b) => b.jjLength - a.jjLength);
    },

    close() {
      db.close();
    },
  };
}

function roundTo3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
