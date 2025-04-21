import { InjectionToken } from '@angular/core';
import { FluigDatasetConfig } from './fluig-dataset';

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
