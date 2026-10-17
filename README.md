# Frontend Espertinho

Angular 22 com páginas públicas SSR e rotas pessoais/admin renderizadas no navegador.

Este é o repositório `o-espertinho-frontend`. Projetos relacionados: [backend](https://github.com/arnaldoportela/o-espertinho-backend) e [extrator](https://github.com/arnaldoportela/o-espertinho-jobs).

## Primeiro uso

Requisitos: Node.js 22.12+ (preferencialmente 24) e npm. Configure e execute o backend separadamente na porta 3000.

```powershell
npm ci
npm run dev
```

O frontend não inicia banco, backend ou extrator. Acesse `http://localhost:4200`. O backend fornece a configuração pública do login Google; nenhum segredo deve ser colocado no frontend.

`npm run dev`: http://localhost:4200 com proxy `/api` para `127.0.0.1:3000`.

`npm run build` e `npm start`: servidor Node de produção com SSR e proxy de API da mesma origem. Defina `ALLOWED_HOSTS` para o domínio publicado.

`npm run typecheck`: checagem de TypeScript e templates. `npm run test:e2e`: Playwright com Microsoft Edge. Os testes exigem o servidor isolado com banco em memória disponível em `test/preview-server.mjs` do backend; não execute contra seu banco real.

Para testes de navegador, compile o backend e execute o servidor de teste no terminal dele:

```powershell
npm run build
$env:E2E_TEST_SERVER='1'
node test/preview-server.mjs
```

Deixe livre a porta 3000 para esse servidor. Em outro terminal, execute o frontend normalmente e depois `npm run test:e2e`. A autenticação simulada existe exclusivamente no servidor de testes e não é usada pelo servidor de produção.
