type ConstraintType = 'MUST' | 'MUST_NOT' | 'SHOULD';
interface Constraint {
  constraintsField: string;
  constraintsInitialValue: any;
  constraintsFinalValue: any;
  constraintsType: ConstraintType;
  constraintsLikeSearch?: boolean;
}
type DatasetValue<T> = { [K in keyof T]: T[K] };
export interface Dataset<T> {
  columns: string[];
  values: DatasetValue<T>[];
}

type DatasetSearch = {
  id: string;
  fields?: string[];
  constraints?: Constraint[];
  orderBy?: string | `${string};asc` | `${string};desc`;
  limit?: number;
  offset?: number;
  expiration?: 'VERYLONG' | 'LONG' | 'MEDIUM' | 'SHORT' | 'NOCACHE';
};
