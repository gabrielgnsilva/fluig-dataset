import { InjectionToken } from '@angular/core';

type SaveCacheAs = 'LOCAL' | 'SESSION';
interface ExpirationTimes {
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

export const FLUIG_DATASET_CONFIG = new InjectionToken<FluigDatasetConfig>(
  'FLUIG_DATASET_CONFIG',
  {
    providedIn: 'root',
    factory: (): FluigDatasetConfig => {
      return {
        local_or_session: 'SESSION',
        default: 'VERYLONG',
        times: {
          SHORT: 600000, // 10 minutes
          MEDIUM: 9000000, // 2.5 hours
          LONG: 18000000, // 5 hours
          VERYLONG: 90000000, // 10 hours
        },
      };
    },
  },
);
