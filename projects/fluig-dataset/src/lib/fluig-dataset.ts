export type SaveCacheAs = 'LOCAL' | 'SESSION';
export interface ExpirationTimes {
  SHORT: number;
  MEDIUM: number;
  LONG: number;
  VERYLONG: number;
}
export interface FluigDatasetConfig {
  local_or_session: SaveCacheAs;
  default: keyof ExpirationTimes;
  times: ExpirationTimes;
}

export type ConstraintType = 'MUST' | 'MUST_NOT' | 'SHOULD';
export interface Constraint {
  constraintsField: string;
  constraintsInitialValue: any;
  constraintsFinalValue: any;
  constraintsType: ConstraintType;
  constraintsLikeSearch?: boolean;
}
export interface Dataset<T extends Record<string, any>> {
  columns: (keyof T)[];
  values: T[];
}
export type DatasetSearch = {
  id: string;
  fields?: string[];
  constraints?: Constraint[];
  orderBy?: string | `${string};asc` | `${string};desc`;
  limit?: number;
  offset?: number;
  expiration?: 'VERYLONG' | 'LONG' | 'MEDIUM' | 'SHORT' | 'NOCACHE';
};
