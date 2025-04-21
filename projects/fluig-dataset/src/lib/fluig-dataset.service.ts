import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  from,
  of,
  switchMap,
  map,
  tap,
} from 'rxjs';
import { FluigAuthService } from 'fluig-auth';
import {
  Constraint,
  ConstraintType,
  Dataset,
  DatasetSearch,
} from './fluig-dataset';
import { FluigDatasetConfig } from './fluig-dataset';
import { FLUIG_DATASET_CONFIG } from './fluig-dataset.config';

@Injectable({
  providedIn: 'root',
})
export class FluigDatasetService {
  private unsubscribe$ = new Subject<void>();
  private readonly datasetSearchURL = '/dataset/api/v2/dataset-handle/search';
  private datasetConfig: FluigDatasetConfig;

  constructor(private auth: FluigAuthService) {
    this.datasetConfig = inject(FLUIG_DATASET_CONFIG);
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private get isLocal(): boolean {
    return this.datasetConfig.local_or_session === 'LOCAL';
  }
  private isCached(key: string): boolean {
    return this.getCachedData(key) != null;
  }
  private saveCache(key: string, data: any): void {
    if (this.isLocal) {
      localStorage.setItem(key, JSON.stringify(data));
    } else if (!this.isLocal) {
      sessionStorage.setItem(key, JSON.stringify(data));
    }
  }
  private getCachedData(key: string): string | null {
    if (this.isLocal) {
      return localStorage.getItem(key);
    } else {
      return sessionStorage.getItem(key);
    }
  }
  private removeCachedData(key: string): void {
    if (this.isLocal) {
      localStorage.removeItem(key);
    } else {
      sessionStorage.removeItem(key);
    }
  }
  private async hashSHA512(text: string): Promise<string> {
    const encoder = new TextEncoder(),
      data = encoder.encode(text),
      hashBuffer = await crypto.subtle.digest('SHA-512', data),
      hashArray = Array.from(new Uint8Array(hashBuffer)),
      hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  private async hashSHA256(text: string): Promise<string> {
    const encoder = new TextEncoder(),
      data = encoder.encode(text),
      hashBuffer = await crypto.subtle.digest('SHA-256', data),
      hashArray = Array.from(new Uint8Array(hashBuffer)),
      hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  public createSimpleConstraint(
    field: string,
    value: any | null,
    type: ConstraintType,
    likeSearch?: boolean | null,
  ): Constraint {
    return {
      constraintsField: field,
      constraintsInitialValue: value != null ? value : '___NULL___VALUE___',
      constraintsFinalValue: value != null ? value : '___NULL___VALUE___',
      constraintsType: type,
      constraintsLikeSearch: likeSearch != null ? likeSearch : false,
    };
  }
  public createConstraint(
    field: string,
    initialValue: any | null,
    finalValue: any | null,
    type: ConstraintType,
    likeSearch?: boolean | null,
  ): Constraint {
    return {
      constraintsField: field,
      constraintsInitialValue:
        initialValue != null ? initialValue : '___NULL___VALUE___',
      constraintsFinalValue:
        finalValue != null ? finalValue : '___NULL___VALUE___',
      constraintsType: type,
      constraintsLikeSearch: likeSearch != null ? likeSearch : false,
    };
  }

  public getDataset<T extends Record<string, any>>(
    args: DatasetSearch,
  ): Observable<Dataset<T>> {
    let params = new HttpParams().set('datasetId', args.id);
    if (args.orderBy) params = params.append('orderBy', args.orderBy);
    if (args.limit) params = params.append('limit', args.limit);
    if (args.offset) params = params.append('offset', args.offset);
    args.fields?.sort().forEach((field) => {
      params = params.append('field', field);
    });
    args.constraints
      ?.sort((a, b) => a.constraintsField.localeCompare(b.constraintsField))
      .forEach((constraint) => {
        params = params
          .append('constraintsField', constraint.constraintsField)
          .append('constraintsInitialValue', constraint.constraintsInitialValue)
          .append('constraintsFinalValue', constraint.constraintsFinalValue)
          .append('constraintsType', constraint.constraintsType)
          .append(
            'constraintsLikeSearch',
            constraint.constraintsLikeSearch || false,
          );
      });
    const cacheExpirationTime =
      args.expiration != null
        ? args.expiration === 'NOCACHE'
          ? 0
          : this.datasetConfig.times[args.expiration]
        : this.datasetConfig.times[this.datasetConfig.default];
    let cacheKey = JSON.stringify(args);
    return from(this.hashSHA256(cacheKey)).pipe(
      catchError((error) => {
        throw new Error(error);
      }),
      switchMap((hashedKey) => {
        cacheKey = hashedKey;
        if (cacheExpirationTime > 0) {
          const cachedItem = this.getCachedData(hashedKey);
          if (cachedItem) {
            const { data, timestamp } = JSON.parse(cachedItem),
              date = Date.now() - timestamp;
            if (date < cacheExpirationTime) {
              return of(data as Dataset<T>);
            } else {
              this.removeCachedData(hashedKey);
            }
          }
        }
        return this.auth.makeRequest.GET<Dataset<T>>(
          this.datasetSearchURL,
          params,
        );
      }),
      tap((data) => {
        if (cacheExpirationTime > 0 && !this.isCached(cacheKey)) {
          this.saveCache(cacheKey, { data, timestamp: Date.now() });
        }
      }),
    );
  }
}
