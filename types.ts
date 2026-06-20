export interface EjaculationRecord {
  /** YYYY-MM-DD */
  date: string;
  volume: number;
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
