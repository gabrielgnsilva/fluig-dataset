/** @format */

import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  from,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { FluigAPIService } from 'fluig-api';

import {
  Dataset,
  Constraint,
  ConstraintType,
  DatasetOptions,
  ConstraintOptions,
  NULL_VALUE,
} from './fluig-dataset.types';
import { Expiration, FLUIG_DATASET_CONFIG } from './fluig-dataset.config';

class DatasetParams {
  private params = new HttpParams();
  set(key: string, value: string | number | boolean) {
    this.params = this.params.set(key, value);
    return this;
  }
  append(key: string, value: string | number | boolean) {
    this.params = this.params.append(key, value);
    return this;
  }
  getParams(): HttpParams {
    return this.params;
  }
}

@Injectable({ providedIn: 'root' })
export class FluigDatasetService {
  private readonly cfg = inject(FLUIG_DATASET_CONFIG);
  private readonly fluigAPI = inject(FluigAPIService);

  private readonly inProgress = new Map<string, Observable<Dataset<any>>>();

  private getExpirationTime(key: keyof Expiration): number {
    if (!this.cfg) return 0;
    if (!this.cfg.expiration) return 0;
    if (!this.cfg.expiration.times) return 0;
    return this.cfg.expiration.times[key] || 0;
  }

  private makeCacheKey(datasetId: string, options?: DatasetOptions) {
    return this.hash(`${datasetId}:${JSON.stringify(options)}`);
  }

  private get useLocalStorage() {
    return this.cfg.cacheType === 'LOCAL';
  }
  private get useSessionStorage() {
    return this.cfg.cacheType === 'SESSION';
  }
  private saveToLocalStorage(key: string, data: unknown) {
    localStorage.setItem(key, JSON.stringify(data));
  }
  private saveToSessionStorage(key: string, data: unknown) {
    sessionStorage.setItem(key, JSON.stringify(data));
  }
  private saveToStorage(key: string, data: unknown) {
    if (this.useLocalStorage) this.saveToLocalStorage(key, data);
    if (this.useSessionStorage) this.saveToSessionStorage(key, data);
  }

  private getItemFromLocalStorage(key: string) {
    return localStorage.getItem(key);
  }
  private getItemFromSessionStorage(key: string) {
    return sessionStorage.getItem(key);
  }
  private getCachedData(key: string) {
    if (this.useLocalStorage) return this.getItemFromLocalStorage(key);
    if (this.useSessionStorage) return this.getItemFromSessionStorage(key);
    return null;
  }
  private isDataCached(key: string) {
    return this.getCachedData(key) != null;
  }

  private removeDataFromLocalStorage(key: string): void {
    localStorage.removeItem(key);
  }
  private removeDataFromSessionStorage(key: string): void {
    sessionStorage.removeItem(key);
  }
  private removeCachedData(key: string): void {
    if (this.useLocalStorage) this.removeDataFromLocalStorage(key);
    if (this.useSessionStorage) this.removeDataFromSessionStorage(key);
  }

  private async hash(text: string): Promise<string> {
    const c = (globalThis as any).crypto;
    if (!c) {
      // Fallback to FNV-1a hash if crypto.subtle is not available
      let h = 0x811c9dc5;
      for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h =
          (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
      }
      return h.toString(16);
    }

    const encoder = new TextEncoder(),
      data = encoder.encode(text),
      hashBuffer = await c.subtle.digest('SHA-256', data),
      hashArray = Array.from(new Uint8Array(hashBuffer)),
      hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  public createConstraint(options: ConstraintOptions): Constraint {
    const hasValue = 'value' in options,
      hasRange = 'range' in options;

    if ((hasValue && hasRange) || (!hasValue && !hasRange)) {
      throw new Error(
        'ConstraintOptions must include either "value" or "range", but not both.'
      );
    }

    const field = options.field;
    const type: ConstraintType = options.type ?? 'MUST';
    const likeSearch = options.likeSearch ?? false;

    if (hasValue) {
      const initialValue: Constraint['initialValue'] =
        options.value ?? NULL_VALUE;

      const finalValue: Constraint['finalValue'] =
        options.type === undefined ? NULL_VALUE : initialValue;

      return { field, initialValue, finalValue, type, likeSearch };
    }

    if (hasRange) {
      const from: Constraint['initialValue'] =
        options.range.from ?? NULL_VALUE;

      const to: Constraint['finalValue'] =
        options.range.to === undefined
          ? from
          : (options.range.to ?? NULL_VALUE);

      return { field, initialValue: from, finalValue: to, type, likeSearch };
    }

    throw new Error(
      'ConstraintOptions must include either "value" or "range", but not both.'
    );
  }

  private fetchAndCacheDataset<T extends Record<string, unknown>>(
    datasetId: string,
    cacheKey: string,
    options?: DatasetOptions
  ): Observable<Dataset<T>> {
    const expiration =
      options == null || options.expiration == null
        ? this.cfg.expiration && this.cfg.expiration.default
          ? this.cfg.expiration.default
          : 'NOCACHE'
        : options.expiration;

    const cacheExpirationTime =
      expiration === 'NOCACHE' ? 0 : this.getExpirationTime(expiration);

    if (cacheExpirationTime > 0) {
      const cachedItem = this.getCachedData(cacheKey);
      if (cachedItem) {
        const { timestamp, data } = JSON.parse(cachedItem);
        const age = Date.now() - timestamp;
        if (age < cacheExpirationTime) {
          return of(data as Dataset<T>);
        }
        this.removeCachedData(cacheKey);
      }
    }

    const params = new DatasetParams();
    params.set('datasetId', datasetId);

    if (options != null) {
      if (options.orderBy != null) {
        const orderBy = options.orderBy.field;
        const direction = options.orderBy.direction ?? 'asc';
        params.set('orderBy', `${orderBy};${direction}`);
      }

      if (options.limit != null) {
        params.set('limit', options.limit);
      }

      if (options.offset != null) {
        params.set('offset', options.offset);
      }

      if (options.fields != null && options.fields.length > 0) {
        options.fields.forEach((field) => params.append('field', field));
      }

      if (options.constraints != null && options.constraints.length > 0) {
        options.constraints.forEach((constraint) => {
          params
            .append('constraintsField', constraint.field)
            .append('constraintsInitialValue', constraint.initialValue)
            .append('constraintsFinalValue', constraint.finalValue)
            .append('constraintsType', constraint.type)
            .append('constraintsLikeSearch', constraint.likeSearch);
        });
      }
    }

    return this.fluigAPI
      .get<Dataset<T>>('/dataset/api/v2/dataset-handle/search', {
        params: params.getParams(),
      })
      .pipe(
        catchError((error) => throwError(() => error)),
        tap((data) => {
          if (cacheExpirationTime > 0 && !this.isDataCached(cacheKey)) {
            this.saveToStorage(cacheKey, { timestamp: Date.now(), data });
          }
        })
      );
  }

  private normalizeOptions(
    options?: DatasetOptions
  ): DatasetOptions | undefined {
    if (!options) return options;
    return {
      ...options,
      fields: options.fields ? [...options.fields].sort() : undefined,
      constraints: options.constraints
        ? [...options.constraints].sort((a, b) =>
            a.field.localeCompare(b.field)
          )
        : undefined,
      orderBy: options.orderBy
        ? {
            field: options.orderBy.field,
            direction: options.orderBy.direction ?? 'asc',
          }
        : undefined,
    };
  }

  /**
   * Fetches a dataset from Fluig API, with caching support.
   * - If the dataset is already being fetched, it will return the same observable.
   * - If the dataset is cached and not expired, it will return the cached data.
   * - If the dataset is not cached or expired, it will fetch from the API and cache it.
   *
   * @param options DatasetOptions
   * @returns Observable<Dataset<T>>
   */
  public getDataset<T extends Record<string, unknown>>(
    datasetId: string,
    options?: DatasetOptions
  ): Observable<Dataset<T>> {
    const normalized = this.normalizeOptions(options);
    return from(this.makeCacheKey(datasetId, normalized)).pipe(
      switchMap((hashedKey) => {
        if (this.inProgress.has(hashedKey)) {
          return this.inProgress.get(hashedKey) as Observable<Dataset<T>>;
        }

        const source$ = this.fetchAndCacheDataset<T>(
          datasetId,
          hashedKey,
          normalized
        ).pipe(
          finalize(() => this.inProgress.delete(hashedKey)),
          shareReplay({ bufferSize: 1, refCount: false }),
          catchError((error) => {
            this.removeCachedData(hashedKey);
            return throwError(() => error);
          })
        );

        this.inProgress.set(hashedKey, source$);
        return source$;
      })
    );
  }
}
