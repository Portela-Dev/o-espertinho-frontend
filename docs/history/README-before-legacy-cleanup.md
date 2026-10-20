> Documento histórico, anterior à limpeza definitiva. Não usar como procedimento atual.

# Administração do catálogo pela extensão

O frontend permite configurar receitas e regras de login/desafio em Marketplaces, acompanhar execuções em Atualizações, revisar categorias/produtos e publicar candidatos. Em marketplaces migrados, o cadastro manual e o teste de seletores aguardam uma solicitação processada pela extensão; a prévia é finalizada por POST com XSRF. Painéis legados permanecem identificados durante a transição.

A navegação não acontece no servidor Angular. Cookies e tokens do marketplace não são enviados ao frontend/backend. O plano vivo fica na raiz do workspace e em 1-backend/docs/PLANO-MIGRACAO-CATALOGO-EXTENSAO.md.

Jornadas novas: e2e/extension-catalog.spec.ts. O runner web aceita E2E_SPEC para execução seletiva e usa API/banco de teste isolados; não use o banco pessoal.

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

### Exploração manual de marketplaces

Em **Admin → Exploração**, cadastre um perfil e as páginas de seção do mesmo marketplace. Cada perfil configura cards/links, carregamento, paginação, limites e políticas de falha. Os detalhes do produto e breadcrumb pertencem à extração da página individual, na aba Seletores.

Clique em **Explorar** na linha da seção e confirme para enfileirar um ciclo manual. Na aba **Execuções e links**, acompanhe páginas/avanços, links novos/existentes/inválidos e ocorrências. O painel atualiza o progresso a cada três segundos e permite cancelar, preservando os links já coletados. Se o worker não estiver ativo, a execução permanece aguardando; ela ainda pode ser cancelada.

Os links descobertos são listados com filtros e paginação, separados das ofertas publicadas. Arquivar preserva a identidade do link para que novas buscas não o reativem. Uma seção pausada exige confirmação de retomada. Não há agendamento nesta entrega; habilitação e intervalo por seção continuam reservados para uma etapa futura. O backend exige permissão discovery, XSRF e confirmação recente de login nas escritas.

É necessário aplicar a migration 024, provisionar e iniciar o serviço independente `o-espertinho-job-discovery`. Os perfis e a seção de teste Amazon/Mercado Livre foram preservados. O CI usa a revisão correspondente do backend; publique backend/migration e worker antes deste frontend. Nenhum detalhe de produto, vínculo de catálogo, link de afiliado ou oferta é criado pelo ciclo de descoberta.
## Normalização de links descobertos

Em Admin → Marketplaces é possível configurar marcadores literais para remover sufixos do caminho dos links de produto descobertos. O botão de teste mostra o resultado sem acessar a página nem persistir links. Query e fragmento são sempre removidos. As regras valem para novos ciclos de descoberta; não alteram seções, paginação, links de afiliados ou dados já coletados. Um formulário antigo que omita as regras preserva a configuração existente no backend.

## Revisão dos links descobertos

A seção Revisão de ofertas inclui enriquecimento manual, acompanhamento/cancelamento de execuções, lista paginada de links com filtros por marketplace, estado da extração e categoria de origem, prévia dos dados extraídos e confirmação de categoria. A aba Vincular categorias permite editar/excluir mapeamentos sem alterar itens já confirmados. As sugestões de mapeamento nunca são aprovadas automaticamente. O backend de testes do CI precisa incluir a migration 026 e as rotas de enriquecimento.
