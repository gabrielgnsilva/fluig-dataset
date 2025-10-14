<!-- @format -->

# Fluig Dataset

Angular service to query **Fluig** datasets with caching and a small, typed API.

**Repo:** github.com/gabrielgnsilva/fluig-dataset • **License:** MIT

---

## Key features (nuances that matter)

- **Constraint builder**: single value or range; if `type` is omitted, it defaults to `'MUST'`. Nullish inputs are converted to `NULL_VALUE` to match Fluig semantics.
- **Stable cache keys**: key = `datasetId` + **normalized** `DatasetOptions` (sorted `fields` and `constraints`), then hashed (SHA‑256, FNV‑1a fallback).
- **Cache & TTL**: `SESSION` (default) or `LOCAL` storage. Override per call with `expiration: 'NOCACHE' | 'SHORT' | 'MEDIUM' | 'LONG' | 'VERYLONG'`.
- **In‑flight de‑duplication**: identical concurrent requests share the same HTTP call; cache is written only once.
- **Query shape**: `orderBy` is sent as `FIELD;asc|desc`. Endpoint used: `GET /dataset/api/v2/dataset-handle/search` via `FluigAPIService`.
- **Error behavior**: failed requests purge the cache entry for that key.

> **Support**: Angular **19–20** only.

---

## Prerequisites & peer deps

- [Node.js](https://nodejs.org/) which includes [Node Package Manager](https://www.npmjs.com/get-npm) (or whatever package manager you prefer, like [Yarn](https://yarnpkg.com/) or [PNPM](https://pnpm.io/))
- [Angular](https://angular.dev/) (>= 19.x)
- [fluig-api](https://github.com/gabrielgnsilva/fluig-api) (all HTTP requests go through this)

```bash
# install peers
pnpm add crypto-js oauth-1.0a fluig-api fluig-dataset
# or: npm i / yarn add / bun add
```

---

## Configuration

Provide runtime options via the environment provider. Values are **deep‑merged** with defaults.

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideFluigDatasetConfig } from 'fluig-dataset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideFluigDatasetConfig({
      cacheType: 'SESSION', // 'LOCAL' | 'SESSION'
      expiration: {
        default: 'MEDIUM', // per‑call default TTL
        times: {
          SHORT: 600_000, // 10 minutes
          MEDIUM: 9_000_000, // 2.5 hours
          LONG: 18_000_000, // 5 hours
          VERYLONG: 36_000_000, // 10 hours
        },
      },
    }),
  ],
};
```

### Configuration object (nuances)

- **Shape**

  ```ts
  interface FluigDatasetConfig {
    cacheType: 'LOCAL' | 'SESSION';
    expiration?: {
      default?: 'NOCACHE' | 'SHORT' | 'MEDIUM' | 'LONG' | 'VERYLONG';
      times?: {
        SHORT?: number;
        MEDIUM?: number;
        LONG?: number;
        VERYLONG?: number;
      };
    };
  }
  ```

- **Defaults** (if you provide nothing):
  - `cacheType: 'SESSION'`
  - `expiration.default: 'MEDIUM'`
  - `times`: `SHORT=600_000`, `MEDIUM=9_000_000`, `LONG=18_000_000`, `VERYLONG=36_000_000` (ms)

- **Merging**: `provideFluigDatasetConfig` performs a deep merge. Partial `times` overrides only the specified keys; the rest come from defaults.
- **Per‑call override**: `DatasetOptions.expiration` beats config defaults. `'NOCACHE'` disables storage for that call.
- **Storage target** is selected by `cacheType`: `'SESSION'` → `sessionStorage`, `'LOCAL'` → `localStorage`.
- **Keying**: cache key = `datasetId` + **normalized** `DatasetOptions` (sorted `fields`, `constraints` by `field`, normalized `orderBy`), then hashed (SHA‑256, FNV‑1a fallback).
- **SSR**: reads/writes Web Storage; use in browser only (or set `'NOCACHE'` when rendering server‑side).

**About `fluig-api`**

- **Local/dev**: often uses OAuth; configure base URL + OAuth **in `fluig-api`**.
- **Production**: **no OAuth**; rely on Fluig auth (session/cookie/proxy). Tell `fluig-api` not to use OAuth in its own config.

> This package never handles auth; it delegates to `FluigAPIService` from `fluig-api`.

---

## Constraints — nuances & arguments

Use `createConstraint(options)` to avoid shape mistakes. The API enforces **XOR** between `value` and `range`.

```ts
// Valid shapes
{ field: string, type?: 'MUST'|'MUST_NOT'|'SHOULD', likeSearch?: boolean, value: string|number|boolean|null|undefined }
{ field: string, type?: 'MUST'|'MUST_NOT'|'SHOULD', likeSearch?: boolean, range: { from: X|null|undefined, to?: X|null|undefined } }
// Invalid → throws: both or neither of value/range
```

### Behavioral details

- **Type default**: if `type` is omitted, it defaults to `'MUST'` in both shapes.

- **Single `value` shape**
  - `initialValue = value ?? NULL_VALUE`
  - `finalValue = (type is omitted) ? NULL_VALUE : initialValue`
  - Rationale: when you don’t care about `finalValue`, omitting `type` means the final value is `NULL_VALUE` (i.e., "is null").

- **`range` shape**
  - `from => initialValue = from ?? NULL_VALUE`
  - `to => finalValue = (to === undefined) ? from : (to ?? NULL_VALUE)`
  - If `to` isn't provided, the constraint becomes a single‑point range.

- **`NULL_VALUE`**: literal `___NULL___VALUE___`; represents Fluig `null` in both `initialValue` and/or `finalValue`.
- **`likeSearch`**: when `true`, pass your own wildcard pattern (e.g., `'Gabriel%'`).
- **Sorting**: constraints are sorted by `field` during normalization to stabilize cache keys (order‑independent).
- **Error handling**: providing both `value` and `range`, or neither, throws an error.

#### Minimal examples

```ts
// Single exact match
this.ds.createConstraint({ field: 'active', value: true, type: 'MUST' });

// LIKE search
this.ds.createConstraint({
  field: 'colleagueName',
  value: 'Gabriel%',
  likeSearch: true,
  type: 'MUST',
});

// Range [0..3000], default type 'MUST'
this.ds.createConstraint({
  field: 'userTenantId',
  range: { from: 0, to: 3000 },
});

// Single value without type => finalValue becomes `NULL_VALUE`
this.ds.createConstraint({ field: 'email', value: 'example@domain.com' });

// Explicit range with inferred type 'MUST' (you can specify it if you need).
this.ds.createConstraint({
  field: 'endDate',
  range: { from: '2025-01-01', to: '2025-01-05' },
});
```

---

## Usage (minimal)

```ts
import { inject } from '@angular/core';
import { FluigDatasetService } from 'fluig-dataset';

interface Row {
  login: string;
  colleagueName: string;
}

class Example {
  private readonly ds = inject(FluigDatasetService);

  load() {
    const constraints = [
      this.ds.createConstraint({ field: 'active', value: true, type: 'MUST' }),
      this.ds.createConstraint({
        field: 'colleagueName',
        value: 'Gabriel%',
        type: 'MUST',
        likeSearch: true,
      }),
    ];

    return this.ds.getDataset<Row>('colleague', {
      fields: ['login', 'colleagueName'],
      constraints,
      orderBy: { field: 'colleagueName', direction: 'asc' },
      limit: 10,
      expiration: 'SHORT',
    });
  }
}
```

> **Note**: `getDataset<T>` returns an `Observable<Dataset<T>>`. Use `async` pipe or subscribe.

---

## Troubleshooting

### Handling CORS Issues

Use `fluig-api` with a reverse proxy to avoid CORS issues when working with Fluig in Angular applications. This setup allows your Angular app to communicate with the Fluig backend without running into cross-origin request problems.

You can read more about this in my blog post[^1] and in the Angular documentation[^2] and in the `fluig-api` README[^3].

[^1]: [How to Fix CORS Issues with Fluig Using Reverse Proxy in Angular](https://devoncommand.com/posts/programming/2025/proxy-angular-fluig/)

[^2]: [Proxying to a backend server](https://angular.dev/tools/cli/serve#proxying-to-a-backend-server)

[^3]: [FluigAPI](https://github.com/gabrielgnsilva/fluig-api)

---

## Contribution

PRs and issues are welcome. Follow Angular’s style guide and keep APIs standalone-friendly (`inject()`, signals). Conventional commits preferred.

---

## Contact & Support

- Issues: [https://github.com/gabrielgnsilva/fluig-dataset/issues](https://github.com/gabrielgnsilva/fluig-dataset/issues)
- Author: Gabriel Nascimento
- Support window: **Angular 19–20**
