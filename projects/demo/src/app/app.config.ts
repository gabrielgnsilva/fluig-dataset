/** @format */

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';

import { environment } from '../environments/environment';
import { provideFluigAPI } from 'fluig-api';
import { provideFluigDatasetConfig } from 'fluig-dataset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([])),
    provideFluigAPI(environment.fluigAPI),
    provideFluigDatasetConfig({
      expiration: { default: 'NOCACHE' },
    }),

    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
  ],
};
