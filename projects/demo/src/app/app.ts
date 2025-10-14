/** @format */

import { DatePipe, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FluigDatasetService } from 'fluig-dataset';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [JsonPipe, DatePipe],
  template: `
    <h1 style="color: #ddd">fluig-dataset Demo</h1>
    <div
      style="display: flex; flex-direction: row; gap: 1rem; margin-bottom: 1rem"
    >
      <button (click)="fetchColleagueDataset()">Get colleagues dataset</button>
    </div>
    @if (logs().length > 0) {
      <div style="color: #ddd">
        <h2>Requests:</h2>
        @for (log of logs(); track log.date) {
          <div
            style="margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #444; border-radius: 0.25rem; background: #222"
          >
            <div style="font-size: 0.8rem; color: #888">
              {{ log.date | date: 'medium' }}
            </div>
            <pre
              style="max-height: 30vh; overflow: auto; white-space: pre-wrap; word-break: break-all; color: #0f0"
              >{{ parse(log.message) | json }}</pre
            >
          </div>
        }
      </div>
    }
  `,
})
export class App {
  private readonly dRef = inject(DestroyRef);
  private readonly fluigDS = inject(FluigDatasetService);

  protected readonly logs = signal<{ date: number; message: string }[]>([]);

  private get constraints() {
    return [
      // A simple constraint with type 'MUST'.
      // The `value` will be used as both `initialValue` and `finalValue`
      // because `type` was provided
      this.fluigDS.createConstraint({
        field: 'active',
        value: true,
        type: 'MUST',
      }),
      // A simple constraint with type 'MUST_NOT'.
      // The `value` will be used as both `initialValue` and `finalValue`
      // because `type` was provided
      this.fluigDS.createConstraint({
        field: 'adminUser',
        value: true,
        type: 'MUST',
      }),
      // Implicit type 'MUST'.
      // Since `type` was not provided, but we have a `range`
      // with `from` (initialValue) and `to` (finalValue), it will be
      // inferred as type 'MUST'.
      this.fluigDS.createConstraint({
        field: 'userTenantId',
        range: { from: 0, to: 3000 },
      }),
      // A constraint with LIKE search
      // The `value` will be used as both `initialValue` and `finalValue`
      // because `type` was provided
      this.fluigDS.createConstraint({
        field: 'colleagueName',
        value: 'Gabriel%',
        type: 'MUST',
        likeSearch: true,
      }),
      // Implicit type 'MUST'.
      // Since `type` was not provided, but we have a `range`
      // with only `from` (initialValue), it will be inferred as type 'MUST'
      // and `finalValue` (to) will be the same as `initialValue` (from).
      this.fluigDS.createConstraint({
        field: 'email',
        range: { from: 'example@domain.com' },
      }),
    ];
  }

  protected fetchColleagueDataset() {
    this.fluigDS
      .getDataset<{ login: 'string'; colleagueName: 'string' }>(
        'colleague', // Dataset ID
        {
          fields: ['login', 'colleagueName'], // Fields to be returned
          constraints: this.constraints,
          expiration: 'SHORT', // Cache expiration time
          limit: 10, // Maximum number of records to return
          offset: 1, // Number of records to skip (for pagination)
          // Order by field and direction
          orderBy: { field: 'colleagueName', direction: 'desc' },
        }
      )
      .pipe(takeUntilDestroyed(this.dRef))
      .subscribe({
        next: (data) =>
          this.logs.update((msgs) => [
            { date: Date.now(), message: JSON.stringify(data) },
            ...msgs,
          ]),
        error: (e) => console.error('Error fetching colleagues dataset', e),
      });
  }

  protected fetchCustomDataset() {
    this.fluigDS
      .getDataset('CUSTOM_DATASET_ID', {
        expiration: 'NOCACHE',
        fields: ['FIELD1', 'FIELD2'],
        constraints: [
          // A simple constraint without a `type`, representing a single value.
          // The `value` will be used as `initialValue`, and `finalValue`
          // will be set to special string `___NULL___VALUE___` to represent null
          // and the `type` will be inferred as 'MUST'.
          //
          // This is useful for when you don't really care about the type, nor
          // about the finalValue, and just use the `initialValue` in the
          // dataset.
          this.fluigDS.createConstraint({
            field: 'FIELD1',
            value: 'VALUE',
          }),
        ],
      })
      .pipe(takeUntilDestroyed(this.dRef))
      .subscribe({
        next: (data) =>
          this.logs.update((msgs) => [
            { date: Date.now(), message: JSON.stringify(data) },
            ...msgs,
          ]),
        error: (e) => console.error('Error fetching custom dataset', e),
      });
  }

  protected parse(json: string) {
    try {
      return JSON.parse(json);
    } catch {
      return json;
    }
  }
}
