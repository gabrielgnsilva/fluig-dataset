/** @format */

// AI slop that acctually works...
type Without<T, K> = { [P in Exclude<keyof T, keyof K>]?: never };
type XOR<T, U> = (Without<T, U> & U) | (Without<U, T> & T);

/** Special value to represent null in a constraint value */
export const NULL_VALUE = '___NULL___VALUE___' as const;

/**
 * Search type:
 * `MUST`    : Must match the value or range
 * `MUST_NOT`: Must not match the value or range
 * `SHOULD`  : Should match the value or range (optional)
 */
export type ConstraintType = 'MUST' | 'MUST_NOT' | 'SHOULD';

/** Constraint value: string, number or boolean */
export type ConstraintValue = string | number | boolean;

/** Constraint definition */
export interface Constraint {
  field: string;
  initialValue: ConstraintValue | typeof NULL_VALUE;
  finalValue: ConstraintValue | typeof NULL_VALUE;
  type: ConstraintType;
  likeSearch: boolean;
}

/** Options for fetching a dataset */
export type DatasetOptions = {
  /** Fields to be returned */
  fields?: string[];
  /** Constraints/filters to be applied */
  constraints?: Constraint[];
  /** Order by field and direction */
  orderBy?: {
    /** Field to order by */
    field: string;
    /** Direction: `asc` (ascending) or `desc` (descending) */
    direction?: 'asc' | 'desc';
  };
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip (for pagination) */
  offset?: number;
  /** Cache expiration time */
  expiration?: 'VERYLONG' | 'LONG' | 'MEDIUM' | 'SHORT' | 'NOCACHE';
};

/**
 * Constraint as single value, representing `initialValue` and `finalValue`
 *
 * - If `type` is not provided, the `finalValue` will be `___NULL___VALUE___`
 * - If `type` is provided, the `finalValue` will be the same as `initialValue`
 *
 * if `value` is `nullish`, it will be converted to a special
 * string `___NULL___VALUE___` to represent null in Fluig
 */
export type ConstraintValueSingle = {
  value: ConstraintValue | null | undefined;
};

/**
 * Constraint as range, using `from` and optional `to` values,
 * representing `initialValue` and `finalValue` respectively.
 *
 * - If `to` is not provided, the `finalValue` will be `initialValue`
 * - If `to` is provided, the `finalValue` will be `to`
 * - If `type` is not provided, it will default to `MUST`
 *
 * if `from` or `to` are `nullish`, they will be converted to a special
 * string `___NULL___VALUE___` to represent null in Fluig
 */
export type ConstraintValueRange = {
  /** Range with `from` and optional `to` values */
  range: {
    /** Start of the range (initialValue) */
    from: ConstraintValue | null | undefined;
    /** End of the range (finalValue), if not provided, will be the same as `from` */
    to?: ConstraintValue | null | undefined;
  };
};

/** Options for creating a constraint */
export type ConstraintOptions = {
  /** Field to apply the constraint on */
  field: string;
  /**
   * Search type:
   * `MUST`    : Must match the value or range
   * `MUST_NOT`: Must not match the value or range
   * `SHOULD`  : Should match the value or range (optional)
   *
   * If not provided, it will default to `MUST` when using `range` (from/to) or
   * a single `value`.
   */
  type?: ConstraintType;
  /** Enable like search */
  likeSearch?: boolean;
} & XOR<ConstraintValueSingle, ConstraintValueRange>;

/** Dataset structure with columns and values */
export interface Dataset<T extends Record<string, unknown>> {
  /** Column names */
  columns: Extract<keyof T, string>[];
  /** Dataset values/rows */
  values: T[];
}
