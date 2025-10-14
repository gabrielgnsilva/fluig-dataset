/** @format */

import {
  FLUIG_DATASET_CONFIG,
  DEFAULT_FLUIG_DATASET_CONFIG,
  FluigDatasetConfig,
} from './fluig-dataset.config';

import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

export function provideFluigDatasetConfig(
  config: Partial<FluigDatasetConfig>
): EnvironmentProviders {
  const defaultConfig = DEFAULT_FLUIG_DATASET_CONFIG;
  const merged: FluigDatasetConfig = {
    ...defaultConfig,
    ...config,
    expiration: {
      ...defaultConfig.expiration,
      ...config.expiration,
      times: {
        ...defaultConfig.expiration?.times,
        ...config.expiration?.times,
      },
    },
  };
  return makeEnvironmentProviders([
    { provide: FLUIG_DATASET_CONFIG, useValue: merged },
  ]);
}
