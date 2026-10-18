# Frontend Espertinho

Angular 22 com pÃ¡ginas pÃºblicas SSR e rotas pessoais/admin renderizadas no navegador.

Este Ã© o repositÃ³rio `o-espertinho-frontend`. Projetos relacionados: [backend](https://github.com/Portela-Dev/o-espertinho-backend) e [extrator manual](https://github.com/Portela-Dev/o-espertinho-extractor) e [job de preços](https://github.com/Portela-Dev/o-espertinho-job-update-price).

## Primeiro uso

Requisitos: Node.js 22.12+ (preferencialmente 24) e npm. Configure e execute o backend separadamente na porta 3000.

```powershell
npm ci
npm run dev
```

O frontend nÃ£o inicia banco, backend ou extrator. Acesse `http://localhost:4200`. O backend fornece a configuraÃ§Ã£o pÃºblica do login Google; nenhum segredo deve ser colocado no frontend.

`npm run dev`: http://localhost:4200 com proxy `/api` para `127.0.0.1:3000`.

`npm run build` e `npm start`: servidor Node de produÃ§Ã£o com SSR e proxy de API da mesma origem. Defina `ALLOWED_HOSTS` para o domÃ­nio publicado.

`npm run typecheck`: checagem de TypeScript e templates. `npm run test:e2e`: Playwright com Microsoft Edge. Os testes exigem o servidor isolado com banco em memÃ³ria disponÃ­vel em `test/preview-server.mjs` do backend; nÃ£o execute contra seu banco real.

Para testes de navegador, compile o backend e execute o servidor de teste no terminal dele:

```powershell
npm run build
$env:E2E_TEST_SERVER='1'
node test/preview-server.mjs
```

Deixe livre a porta 3000 para esse servidor. Em outro terminal, execute o frontend normalmente e depois `npm run test:e2e`. A autenticaÃ§Ã£o simulada existe exclusivamente no servidor de testes e nÃ£o Ã© usada pelo servidor de produÃ§Ã£o.

## CI/CD e deploy em VPS

O workflow de GitHub Actions valida o projeto, gera cobertura para SonarQube e prepara deploy independente com Docker Compose via SSH. Consulte [o guia de CI/CD](deploy/README.md) para secrets/variables, projeto SonarQube, preparação da VPS, runtime e recuperação. O deploy automático começa desativado.


A área Admin → Atualizações utiliza a API do backend para salvar as configurações e enfileirar rodadas. O serviço independente `o-espertinho-job-update-price` lê essas tabelas no PostgreSQL e executa a atualização de preços e histórico. Não há URL do job no frontend, e salvar configurações não exige reiniciar os serviços. O extrator manual continua reservado aos testes de seletores e às prévias de cadastro.


Admin → Atualizações permite cancelar uma rodada, preservando preços já atualizados e ignorando respostas de tentativas invalidadas. A pausa de proteção após falha técnica aparece explicitamente na tela. O backend oferece `POST /api/admin/offer-refresh/runs/:id/cancel`, com autorização de atualizações, XSRF e confirmação administrativa recente. A migration `020_offer_refresh_cancellation.sql` registra o cancelamento sem apagar execuções, links ou histórico. O job existente já confere o token da tentativa antes de gravar; seu advisory lock continua impedindo extrações simultâneas. Uma nova rodada pode ser enfileirada e aguarda o intervalo de proteção e o término de uma consulta anterior.

O CI dos testes web usa uma revisão imutável do backend com suporte ao cancelamento. A variável E2E_BACKEND_REF continua permitindo selecionar outra revisão. Isso mantém os testes reproduzíveis enquanto as PRs de frontend e backend são avaliadas separadamente; o backend com a migration 020 deve ser implantado antes do frontend correspondente.
