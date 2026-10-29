# SEO público

O domínio canônico é `https://oespertinho.com.br`, centralizado em `src/app/seo-data.ts`. Os redirects 301 dos domínios alternativos continuam sob responsabilidade do Nginx da VPS. Nenhuma alteração de domínio ou URL de produto é necessária.

## Rastreamento e rolagem

A vitrine mantém rolagem infinita e o botão Carregar mais. `?page=N` inicia no conjunto solicitado (24 produtos), com links reais para páginas vizinhas. Ao carregar mais por rolagem, os produtos são anexados sem mudar a URL inicial. A URL inicial determina o canonical; cada página paginada tem canonical próprio. Filtros e ordenação são preservados nos links de navegação.

Categorias usam links e os IDs existentes, sem migrations ou necessidade de slugs novos. O breadcrumb continua navegável. Cada categoria tem H1, título e descrição próprios. Buscas internas, filtros por loja/preço e ordenações alternativas recebem noindex,follow; URLs de rastreamento e valores padrão são retirados do canonical. A página 1 é representada sem `page=1`.

Em produtos, `?offerPage=N` pagina as ofertas sem substituir a oferta principal mais barata por uma oferta da página seguinte. Produtos reais sem ofertas permanecem HTTP 200 com noindex; IDs inexistentes e páginas fora do intervalo retornam 404. Falhas técnicas retornam 503 com noindex, em vez de declarar que o produto não existe.

## Metadados e dados estruturados

O serviço de SEO gera title, resumo de até 160 caracteres, canonical, robots, Open Graph e cartão social. Metadados e JSON-LD são substituídos na navegação, inclusive ao sair para uma área privada. Login e áreas de conta/admin também recebem X-Robots-Tag: noindex, follow no servidor, sem alterar autenticação ou permissões.

Produtos usam Product/AggregateOffer com os preços e contagens reais da API. Ofertas usam Product/Offer, com nome da loja e o preço exibido. BreadcrumbList usa os caminhos cadastrados. Não publicamos SKU interno, avaliações fictícias, prazo de preço inventado nem AggregateRating importado dos marketplaces. O JSON é escapado e recebe o nonce de CSP no SSR; não se relaxa CSP. Dados estruturados não garantem rich results.

Fotos de produtos têm alt, dimensões e fallback existentes. A imagem principal recebe prioridade de carregamento; as demais continuam lazy. Logos decorativos continuam com alt vazio. O resumo de comparação usa a quantidade e a faixa de preços reais, sem inventar avaliações editoriais.

## Sitemap

- `/robots.txt`: texto válido, com localização do sitemap; bloqueia rastreamento de API/admin sem substituir controle de acesso.
- `/sitemap.xml`: índice XML com páginas institucionais e shards do catálogo.
- `/sitemaps/pages.xml`: home, Sobre, Privacidade e Termos.
- `/sitemaps/catalog-N.xml`: até 1000 produtos/categorias por documento.
- Backend `/api/seo/sitemap?page=N`: IDs, tipos e última alteração dos produtos/ofertas; não retorna links de afiliados, credenciais ou conteúdo privado. Inclui somente produtos elegíveis à vitrine e suas categorias ancestrais.

O frontend consulta apenas API_BASE_URL, nunca o Host fornecido pelo visitante. Cache de cinco minutos limitado a 100 páginas, timeout de oito segundos, colapso de requisições concorrentes, XML escapado e falhas 503 com Retry-After; falhas não entram no cache de sucesso. lastmod deriva das alterações reais do produto e das ofertas públicas.

## Publicação e validação

Publicar o backend com o novo endpoint antes do frontend. Não há migrations, seeds ou variáveis obrigatórias novas. O pin do backend nos testes do frontend deve apontar para o contrato correspondente.

Após o deploy, enviar `/sitemap.xml` ao Google Search Console e inspecionar home, categoria, produto, oferta e página 2. Verificar indexação e Core Web Vitals com dados de campo; testes locais não comprovam posicionamento nem melhoria de métricas reais.

Referências: [paginação](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading), [URLs canônicas](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [produtos](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), [avaliações](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
