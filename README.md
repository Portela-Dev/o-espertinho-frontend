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

## Navegação de coleções

Cards da vitrine, ofertas do produto, favoritos, catálogos, filtros salvos, marketplaces e revisão de ofertas carregam lotes por rolagem vertical. O botão Carregar mais também permite navegação por teclado ou sem IntersectionObserver. Falhas mantêm os cards anteriores e oferecem uma nova tentativa. Mudanças de busca e filtros reiniciam os resultados e descartam respostas antigas.

Listas administrativas usam páginas com contagem total: produtos, usuários, perfis, links, auditoria, ranking de cliques, execuções e ocorrências. Características, evidências e registros diários do gráfico também possuem paginação. Opções de seleção, menus, breadcrumbs e campos de formulário continuam funcionando como controles. Os testes do CI usam um commit específico do backend que contém os endpoints paginados; implante a API compatível antes deste frontend.

Listas paginadas permitem selecionar 5, 10, 15, 20, 25 ou 50 itens por página. Alterar a quantidade reinicia na primeira página sem remover filtros. A rolagem infinita não tem seletor: a vitrine usa 24 produtos por lote; as demais coleções de cards usam 20 por lote.

### Exploração de marketplaces (somente configuração)

Em **Admin → Exploração**, cadastre primeiro um **Perfil de exploração** e depois uma **Página de seção** do mesmo marketplace. Um perfil pode atender várias seções com a mesma estrutura. Os formulários cobrem carregamento/hidratação, seletores de cards e links, paginação (página única, próxima página, URL parametrizada, carregar mais ou rolagem), limites e políticas por tipo de falha. As listas possuem filtros, paginação e seleção da quantidade de registros.

As configurações são persistidas pelo backend, com controle de versão, permissão `discovery` e confirmação recente de login Google nas escritas. É necessário aplicar as migrations 022 e 023 do backend. A migration 023 limpa os antigos seletores de dados e breadcrumb dos perfis sem apagar as páginas de seção. A opção de habilitar e o intervalo por seção só preparam a execução futura: **nenhum job ou acesso a marketplace é iniciado nesta entrega**. O cadastro de seletores de anúncios já existente permanece independente; este perfil descobre links em páginas de listagem. Título, preço, imagens, marca, descrição e breadcrumb não são configurados nele; os dados do produto pertencem à extração da página individual. A categoria alternativa da página de seção continua disponível. Use seletores CSS, não JavaScript. URLs de seção mantêm os parâmetros de busca/paginação.

A configuração cobre padrões comuns de navegação, sem garantir compatibilidade com qualquer página, CAPTCHA ou fluxo autenticado. As políticas salvas descrevem como um consumidor futuro deverá agir, não resultados de um teste real de extração.

A revisão de ofertas encaminha o botão **Cadastrar oferta** para **Cadastro de links**, que usa os marketplaces e seletores cadastrados. Não adicionar formulários por marketplace ou dependentes de identificadores específicos de uma loja; o produto é escolhido pelo administrador e o comportamento de extração vem da configuração.
