import { Provider } from '@angular/core';
import {
  FLUIG_DATASET_CONFIG,
  FluigDatasetConfig,
} from './fluig-dataset.config';
import { FluigDatasetService } from './fluig-dataset.service';

export function provideFluigAuth(config: FluigDatasetConfig): Provider[] {
  return [
    FluigDatasetService,
    { provide: FLUIG_DATASET_CONFIG, useValue: config },
  ];
}
