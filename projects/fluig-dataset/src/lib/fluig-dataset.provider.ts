import { Provider } from '@angular/core';
import { FLUIG_DATASET_CONFIG } from './fluig-dataset.config';
import { FluigDatasetConfig } from './fluig-dataset';
import { FluigDatasetService } from './fluig-dataset.service';

export function provideFluigAuth(config: FluigDatasetConfig): Provider[] {
  return [
    FluigDatasetService,
    { provide: FLUIG_DATASET_CONFIG, useValue: config },
  ];
}
