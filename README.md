# O Espertinho — frontend

Angular com SSR público e páginas pessoais/admin no navegador. Backend Node e PostgreSQL são serviços separados; as operações de navegador são feitas pela extensão do Chrome.

Na raiz do workspace, `npm run setup` prepara os componentes ativos e sobe somente PostgreSQL em segundo plano. Execute frontend e backend em terminais separados. Neste repositório: `npm ci`, `npm run dev` (porta 4200), `npm run build` e `npm start` para SSR compilado. O proxy de desenvolvimento aponta para backend na porta 3000. Em produção configure API_BASE_URL com a origem interna da API e ALLOWED_HOSTS com os hosts aceitos pelo SSR; consulte deploy/README.md.

## Administração

Cadastre marketplaces, hosts, perfis e páginas de exploração, seletores de produto, receita declarativa e regras de bloqueio. A extensão executa os quatro passos manualmente. Na revisão confirme categorias, atribua produtos e publique explicitamente. Execuções é a única tela para acompanhar, paginar itens e cancelar operações da extensão. Não há executor legado, agenda de preços ou conectores específicos.

As oito abas principais são Visão geral, Revisão, Ofertas, Produtos, Marketplaces, Execuções, Acessos e Atividade. Marketplaces reúne Cadastro, Exploração e Seletores, conforme as permissões existentes. Acessos reúne Usuários e Perfis. Revisão trata os links descobertos; Ofertas centraliza todos os anúncios, com lista paginada, edição, vínculo de produto, publicação e exclusão confirmada. O cadastro manual abre dentro de Ofertas, inclusive pelos atalhos de produtos. Os caminhos antigos continuam válidos; o agrupamento não concede novas permissões.

O intervalo entre ciclos foi retirado: a exploração é manual. A habilitação de cada fonte e os intervalos entre requisições continuam ativos.

Cadastro por link e teste de seletores recebem uma solicitação assíncrona: selecione-a na extensão, aguarde o resultado e confira a prévia. O frontend finaliza por POST com XSRF. Tokens e cookies do marketplace permanecem no Chrome. Fechar a janela de processamento permite reabertura explícita e continuação pela extensão.

## Validação

`npm run typecheck`, `npm run build`, `npm run test:coverage` e `npm run test:e2e`. Os E2Es usam o servidor de fixture isolado do backend, nunca o banco pessoal. O CI executa SSR/Chromium real e coleta cobertura do navegador. O checkout backend é fixado em SHA compatível com a mesma entrega.

Plano e diário: ../PLANO-MIGRACAO-CATALOGO-EXTENSAO.md e cópia versionada em o-espertinho-backend/docs. Evidências anteriores estão em docs/history.

## Revisão com IA

A revisão possui uma aba Configurações de IA com tarefas e prompts independentes. A extensão gera propostas; o administrador confirma categoria e produto antes de qualquer aplicação. Consulte docs/REVISAO-IA.md no backend.
