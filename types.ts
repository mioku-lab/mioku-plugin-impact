export interface UserData {
  jjLength: number;
  /** unix seconds */
  lastMasturbationTime: number;
}

export interface GroupData {
  allow: boolean;
}

export interface EjaculationRecord {
  /** YYYY-MM-DD */
  date: string;
  volume: number;
}

export interface ImpactStore {
  /** key: userId(string) */
  users: Record<string, UserData>;
  /** key: groupId(string) */
  groups: Record<string, GroupData>;
  /** key: userId(string) -> records */
  ejaculations: Record<string, EjaculationRecord[]>;
}

export interface RankEntry {
  userId: number;
  jjLength: number;
}

export interface CooldownState {
  pk: Map<string, number>;
  dj: Map<string, number>;
  suo: Map<string, number>;
  fuck: Map<string, number>;
}
