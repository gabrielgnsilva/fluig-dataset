# Serviço Angular de Integração com Datasets do Fluig via OAuth 1.0a

Este serviço Angular simula a interface do `DatasetFactory` do Fluig, utilizando `HttpClient` e integração com o pacote `fluig-auth`, consumindo datasets do Fluig e aproveitando o cache do navegador, constraints e filtros de forma tipada e simplificada.

---

## 📦 Funcionalidades

- [x] Autenticação automática com **OAuth 1.0a**
- [x] Requisições HTTP autenticadas: `GET`
- [x] Tipagem genérica com `Observable<T>`
- [x] Constraints, Fields e Ordenação
- [ ] Tratamento de erros com `RxJS`

---

## 📥 Instalação

Este pacote **requer** a instalação e configuração do pacote `fluig-auth` para funcionar corretamente. O `fluig-auth` é responsável por realizar as requisições autenticadas à API REST do Fluig.

Requisitos:

- fluig-auth - [NPM](https://www.npmjs.com/package/fluig-auth)

Você pode instalar este serviço de duas formas:

### ✅ Via NPM (Recomendado)

```bash
npm install --save fluig-auth fluig-dataset
```

### 🛠️ Compilando o projeto localmente

1. Clone o repositório do GitHub:

```bash
git clone https://github.com/gabrielgnsilva/fluig-dataset.git
cd fluig-dataset
```

2. Compile o pacote:

```bash
ng build fluig-dataset
```

3. Instale diretamente no seu projeto:

```bash
npm install ./dist/fluig-dataset
```

---

## 🚀 Uso

### Importação

Certifique-se de importar e injetar o serviço no seu componente ou outro serviço Angular:

```ts
constructor(private datasetService: FluigDatasetService) {}
```

### Requisições

Métodos disponíveis:

#### getDataset

Realiza a busca do dataset com suporte a cache, constraints e ordenação.

```ts
interface DatasetSearch {
  id: string;
  fields?: string[];
  constraints?: Constraint[];
  orderBy?: string | `${string};asc` | `${string};desc`;
  limit?: number;
  offset?: number;
  expiration?: 'VERYLONG' | 'LONG' | 'MEDIUM' | 'SHORT' | 'NOCACHE';
}

type DatasetValue<T> = { [K in keyof T]: T[K] };
export interface Dataset<T> {
  columns: string[];
  values: DatasetValue<T>[];
}

datasetService.getDataset<T>(args: DatasetSearch): Observable<Dataset<T>>
```

> 🔍 Caso não seja passado o parâmetro `expiration`, será utilizado o valor padrão configurado no **provider**. Se esse valor for omitido também, o tempo padrão de cache será de 10 horas, salvo no `sessionStorage`. Para desabilitar o cache por padrão, defina o valor `default: 'NOCACHE'` na configuração do provider (veja a seção de configurações).

#### createSimpleConstraint

Cria uma constraint simples (valor único).

```ts
type ConstraintType = 'MUST' | 'MUST_NOT' | 'SHOULD';

datasetService.createSimpleConstraint(field: string, value: any, type: ConstraintType, likeSearch?: boolean): Constraint
```

#### createConstraint

Cria uma constraint com valores inicial e final.

```ts
type ConstraintType = 'MUST' | 'MUST_NOT' | 'SHOULD';

datasetService.createConstraint(field: string, initialValue: any, finalValue: any, type: ConstraintType, likeSearch?: boolean): Constraint
```

---

## Exemplo de uso

```ts
constructor(private dataset: FluigDatasetService) {
  this.colleagueList$ = dataset
    .getDataset<{ login: string }>({
      id: 'colleague',
      constraints: [
        dataset.createConstraint('sqlLimit', 1, 1, 'MUST'),
        dataset.createConstraint('mail', '@dominio.com', '@dominio.com', 'SHOULD', true),
      ],
    })
    .pipe(map((data) => data.values));
}
```

### Configuração no `app.config.ts`

Veja abaixo as opções disponíveis e configuração padrão do serviço, se o provider não for configurado:

#### ✅ Usando `FLUIG_DATASET_CONFIG`

```ts
import { FLUIG_DATASET_CONFIG } from "fluig-dataset";

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: FLUIG_DATASET_CONFIG,
      useValue: {
        local_or_session: "SESSION", // "SESSION" ou  "LOCAL" - Onde salvar o DS como cache
        default: "VERYLONG", // Tempo padrão de vida dos datasets no cache
        times: {
          SHORT: 600000, // 10 minutes
          MEDIUM: 9000000, // 2.5 hours
          LONG: 18000000, // 5 hours
          VERYLONG: 90000000, // 10 hours
        }, // Tempos de vida dos datasets quando salvos no cache
      },
    },
  ],
};
```

> 💡 Essa configuração define os tempos de vida do cache, bem como o local onde os dados devem ser armazenados: sessionStorage ('SESSION') ou localStorage ('LOCAL')

---

## 🧪 Dica Extra: Proxy Reverso em Desenvolvimento

Durante o desenvolvimento local, é comum enfrentar problemas de CORS ao tentar acessar o Fluig diretamente. Uma solução prática é configurar um **proxy reverso** para redirecionar requisições locais para o servidor Fluig.

Você pode configurar isso com um arquivo `proxy.conf.json` e usá-lo em conjunto com o `ng serve`:

```json
{
  "/api": {
    "target": "https://fluig.seuservidor.com",
    "secure": true,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Em seguida, rode o Angular com:

```bash
ng serve --proxy-config proxy.conf.json
```

📖 Leia mais sobre isso no post: [Como Resolver Problemas de CORS com Fluig Usando Proxy Reverso no Angular](https://devoncommand.com/pt/posts/programming/2025/proxy-angular-fluig/)
