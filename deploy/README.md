# CI/CD para VPS Linux — Docker Compose via SSH

O workflow `.github/workflows/ci-vps.yml` adapta as etapas do Quest Crush: validação, testes, cobertura, SonarQube com Quality Gate, compilação do artefato e distribuição. Não contém etapas Android/Firebase e não depende de Coolify. Funciona em VPS HostGator ou Hostinger com Docker Engine, Compose v2 atualizado, Bash, OpenSSH e `flock` (util-linux).

## Execuções

- PRs e pushes em develop, staging e main executam CI, sem deploy por branch.
- workflow_dispatch executa somente CI/Sonar; a opção de deploy manual foi removida.
- Apenas o push de criação de uma tag vMAJOR.MINOR.PATCH, como v0.1.0, pode fazer deploy automático. A tag deve apontar exatamente para o HEAD remoto atual de main. Tags leves e anotadas são aceitas; versões antigas, movimentações e exclusões são recusadas.
- A política é verificada antes da validação e novamente imediatamente antes de usar SSH. Se main avançar durante o pipeline, a release antiga é recusada.
- A release depende de validação, Quality Gate do mesmo commit e imagem aprovada. Desenvolvimentos e tags não autorizadas nunca entram no job de deploy.
- A extensão Chrome continua sem deploy ou publicação na Web Store.

Consulte [RELEASE-MAIN.md](../docs/RELEASE-MAIN.md) para promoção de branches e criação das tags. A branch main precisa receber estas alterações antes da primeira tag. Nenhuma tag é criada automaticamente pelo CI. VPS_AUTO_DEPLOY não é mais consultada.

O environment continua chamado production para reutilizar as variáveis/secrets já cadastrados. Ele representa a VPS atual; não foi criado outro ambiente ou servidor. Restrinja o environment a tags v*, sem permitir branches.

Relatórios e pacotes têm retenção de um dia. O arquivo de imagem para deploy só é gerado/publicado em releases autorizadas; PRs e pushes de branch fazem build/smoke test sem guardar esse arquivo grande. Os nomes incluem run_id; reruns reutilizam os artefatos do mesmo build.

Cada repositório implanta apenas seu serviço. A exclusão mútua no GitHub e na VPS é preservada, sem cancelar um deploy em andamento. A mesma imagem Linux compilada no runner hospedado é verificada por SHA-256 e transferida por SSH com chave do host validada. Não há recompilação na VPS.

## GitHub: configurações em cada repositório

Em Settings → Secrets and variables → Actions:

| Tipo | Nome | Valor |
|---|---|---|
| Repository secret | `SONAR_TOKEN` | Token de análise do projeto correspondente, com permissão Execute Analysis |
| Repository variable | `SONAR_HOST_URL` | URL alcançável a partir do runner de análise; exemplo `http://127.0.0.1:9000` apenas quando SonarQube está no mesmo PC |

Em Settings → Environments, crie **production** e cadastre:

| Tipo no environment production | Nome | Valor |
|---|---|---|
| Variable | `VPS_HOST` | IPv4 público ou hostname SSH da VPS, sem protocolo |
| Variable | `VPS_USER` | Usuário SSH com acesso ao Docker e à pasta do serviço |
| Variable opcional | `VPS_PORT` | Porta SSH; padrão `22` |
| Secret | `VPS_SSH_PRIVATE_KEY` | Chave privada OpenSSH da automação, dedicada a esse acesso |
| Secret | `VPS_KNOWN_HOSTS` | Linha(s) de known_hosts do servidor, com hostname/porta correspondentes |

No environment production, permita somente tags v* em Selected branches and tags; não inclua regras de branch. Os dados de runtime da aplicação ficam na VPS; não há segredo de banco embutido na imagem nem enviado como artefato.

## SonarQube e runner

Crie o projeto com a chave **o-espertinho-frontend** e nome **O Espertinho - Frontend**. Use `develop` como branch principal do projeto no SonarQube. A configuração não envia parâmetros de análise de PR ou múltiplas branches, seguindo a restrição da edição Community. O Quality Gate não é ignorado nem tem sua política alterada pelo pipeline.

Validação, testes, build Docker e deploy por SSH executam em runners hospedados pelo GitHub (`ubuntu-latest`). Apenas o job de SonarQube usa o runner da organização `Portela-Dev`, com os labels `[self-hosted, Windows, X64, windows-portela-dev]`. Esse runner precisa de Git for Windows com GPG e dirmngr, acesso ao servidor SonarQube e versão atualizada para as actions com runtime Node 24. Ele não precisa de Docker. ShellCheck e Playwright/Chromium executam no Linux hospedado pelo GitHub.

Em **Organization Settings > Actions > Runner groups**, libere estes três repositórios no grupo do runner e habilite o acesso a repositórios públicos. PRs executam validações nos runners hospedados do GitHub. A análise Sonar no runner próprio ocorre na develop, em execução manual autorizada ou em release main validada. `SONAR_HOST_URL` deve ser alcançável pela conta do runner; loopback só funciona quando o Sonar está no mesmo computador.

O relatório LCOV vem dos testes reais do mesmo commit, via artefato do job validate, com sourcemaps para o TypeScript. Testes E2E não são contabilizados como cobertura unitária. Especialmente no frontend, a cobertura unitária ainda é inicial e o Quality Gate poderá exigir novos testes; o workflow preserva essa avaliação.

## Preparação da VPS, uma vez

1. Instale Docker Engine, Compose v2 com suporte a `up --wait`, Bash, OpenSSH e util-linux; use Linux amd64, pois as imagens são construídas em runner x64.
2. Prepare `/opt/o-espertinho/frontend` para o usuário de deploy. O acesso ao Docker é necessário. Não execute o runner GitHub dentro da VPS pública para este fluxo.
3. Copie `deploy/runtime.env.example` para **`/opt/o-espertinho/frontend/.env`**, preencha os valores reais e aplique permissão `600`. Não recrie esse arquivo a cada deploy.
4. Instale a chave pública correspondente em `~/.ssh/authorized_keys` do usuário da VPS. Cadastre sua chave privada no secret do GitHub.
5. Obtenha a chave pública SSH do host e confira a impressão digital pelo console da VPS (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`). Só depois cadastre a linha trusted em `VPS_KNOWN_HOSTS`. Em porta diferente de 22, o nome é `[host]:porta`. `ssh-keyscan` sozinho não autentica o host.
6. Libere acesso SSH para o runner, aponte o DNS e configure Nginx/HTTPS para o frontend. Há exemplo de Nginx no repositório do frontend. As portas do banco e backend não são publicadas.

O primeiro deploy cria a rede Docker externa compartilhada `espertinho-internal`. Ordem inicial: **backend/PostgreSQL → frontend → extensão**. Depois os deploys são independentes. Frontend/proxy SSR usa `http://espertinho-backend:3000`. Operações de navegador são manuais na extensão; nenhum serviço de extração ou job é implantado.

O site usa um único domínio: Nginx encaminha ao frontend em `127.0.0.1:4200`; o frontend encaminha `/api` internamente preservando o caminho e a origem. Configure o domínio em `APP_ORIGIN`, `ALLOWED_HOSTS` e nas origens JavaScript do login Google. O proxy Nginx do exemplo sobrescreve os cabeçalhos encaminhados; o backend só confia em loopback e redes privadas na configuração de produção.

## Atualizações, persistência e recuperação

Cada versão fica em `/opt/o-espertinho/frontend/releases/<sha>-<run>-<attempt>`. `current` aponta para o último deploy saudável. A aplicação é recriada com healthcheck e pode haver breve indisponibilidade durante a troca. Não é um deploy de alta disponibilidade.

Runtime: `ALLOWED_HOSTS` com os hostnames públicos, separados por vírgula, e `API_BASE_URL=http://espertinho-backend:3000`. `NODE_ENV`, `HOST` e `PORT` são definidos pelo Compose. Não coloque segredos no frontend.

O pipeline testa o HTML de entrada e a aplicação SSR compilada com Playwright/Chromium e backend isolado em memória, incluindo login, XSRF e administração. A variable opcional de repositório `E2E_BACKEND_REF` seleciona a revisão de `Portela-Dev/o-espertinho-backend` usada nos testes (padrão `develop`; pode ser SHA fixo). Isso não implanta nem altera o banco desse backend.

Para executar localmente o mesmo teste com a organização atual: compile ambos os projetos; no frontend defina `E2E_BACKEND_DIR=../1-backend`, `CI_API_PORT=3100`, `CI_WEB_PORT=4300` e execute `node scripts/ci/test-web.mjs`. Os servidores de teste são iniciados/encerrados pelo script e não usam seu PostgreSQL real.

Se a troca do container falhar, o script tenta reiniciar a imagem anterior e o job continua marcado como falha. Rollback de imagem **não desfaz migrations SQL**. O arquivo de runtime permanece fora das releases, e as imagens anteriores ficam disponíveis para recuperação. O arquivo de imagem transferido é removido depois do sucesso; agende manutenção de imagens antigas, backups e metadados conforme o espaço da VPS. Os artefatos de imagem no GitHub têm retenção de 3 dias; relatórios, 7 dias.

O workflow não provisiona a VPS, DNS, certificados, runners ou projetos SonarQube e não recebe credenciais de produção nos jobs de validação. O deploy só é executado após configurar o environment, habilitar o workflow e criar uma tag de main válida.

## Segurança

O CI executa `npm audit --omit=dev --audit-level=high`: vulnerabilidades altas/críticas em dependências de produção e falhas da consulta bloqueiam a validação. Alertas devem ser investigados; o pipeline não aplica downgrade nem ignora findings automaticamente. A análise de dependências não substitui atualizações do sistema, navegador e imagens base.

O proxy `/api` usa módulos nativos do Node com destino fixo e preserva cookies/XSRF; não depende de `http-proxy-middleware`, `micromatch` ou `braces` em produção. A CSP permite Google Identity Services, bloqueia scripts inline arbitrários e inclui nonce por resposta para SSR. `scripts/prepare-csp.mjs`, executado no prebuild, calcula o hash exclusivamente do bootstrap estático de eventos da versão instalada do Angular. Mantenha o arquivo gerado `src/angular-bootstrap-csp.ts` atualizado ao atualizar o Angular. CSS inline é permitido para compatibilidade com estilos Angular/Google; JavaScript inline não recebe uma liberação genérica.

A confirmação administrativa aparece em um diálogo quando o backend responde `ADMIN_REAUTH_REQUIRED`; após confirmar a mesma conta Google com o nonce da sessão, a operação é repetida uma única vez. Cancelar mantém a alteração sem salvar. Publique o backend com a migration 018 antes deste frontend.


## Correção de segurança do Vite

A dependência transitiva `vite` do Angular builder está fixada em `8.3.3` pelo override do package.json, com lockfile atualizado. A versão corrige GHSA-9jrq-w75r-8gcw sem trocar a linha do Angular. As dependências adicionais de Rolldown são exigidas pelo patch do Vite. Remova/reavalie o override quando o builder passar a declarar uma versão corrigida compatível. O teste `test/vite-security.test.mjs` cobre a transformação HTML de uma URL relativa a protocolo em contexto de middleware. Após atualizar as dependências, reinicie um servidor de desenvolvimento já aberto para carregar a nova versão.
