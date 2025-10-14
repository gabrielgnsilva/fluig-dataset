/** @format */

import { InjectionToken } from '@angular/core';

/** Type of cache storage */
export type CacheType = 'LOCAL' | 'SESSION';

/** Expiration times in milliseconds */
export interface Expiration {
  /** Expiration time in milliseconds */
  SHORT?: number;
  /** Expiration time in milliseconds */
  MEDIUM?: number;
  /** Expiration time in milliseconds */
  LONG?: number;
  /** Expiration time in milliseconds */
  VERYLONG?: number;
}

/** Configuration for FluigDatasetService */
export interface FluigDatasetConfig {
  /**
   * `LOCAL` cache will be stored in localStorage
   * `SESSION` cache will be stored in sessionStorage
   * Default is `SESSION`
   */
  cacheType: CacheType;
  /** Cache expiration times */
  expiration?: {
    /** Default expiration time */
    default?: 'NOCACHE' | keyof Expiration;
    /** Expiration times in milliseconds */
    times?: Expiration;
  };
}

export const DEFAULT_FLUIG_DATASET_CONFIG: FluigDatasetConfig = {
  cacheType: 'SESSION',
  expiration: {
    default: 'MEDIUM',
    times: {
      SHORT: 600_000, // 10 minutes
      MEDIUM: 9_000_000, // 2.5 hours
      LONG: 18_000_000, // 5 hours
      VERYLONG: 36_000_000, // 10 hours
    },
  },
};

export const FLUIG_DATASET_CONFIG = new InjectionToken<FluigDatasetConfig>(
  'FLUIG_DATASET_CONFIG',
  {
    providedIn: 'root',
    factory: (): FluigDatasetConfig => DEFAULT_FLUIG_DATASET_CONFIG,
  }
);
