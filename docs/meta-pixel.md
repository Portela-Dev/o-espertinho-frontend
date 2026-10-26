# Pixel Meta

Configuração em **Admin → Ofertas → Pixel Meta**, protegida pela permissão `catalog`, sessão, XSRF, confirmação administrativa recente e versão otimista. O ID inicial é `1918844482826551`; não é uma credencial. Nunca cadastre scripts, senhas ou tokens de publicidade.

A migration `042_meta_pixel.sql` adiciona a configuração ao backend. Migrations anteriores e o snapshot de seed já publicado permanecem intactos. O seed aceita opcionalmente `meta_pixel_settings` em novos snapshots. A aplicação da migration e a publicação seguem o pipeline de release por tag da branch main.

O endpoint público `/api/marketing` só habilita o Pixel quando `NODE_ENV=production`, a configuração está habilitada e `APP_ORIGIN` é HTTPS. O navegador também exige correspondência exata com essa origem. Local e ambientes com outra origem não produzem eventos. O visitante precisa aceitar os cookies opcionais antes de baixar o script; recusar não afeta as funções do site. A escolha dura até 180 dias neste navegador. O rodapé oferece “Preferências de cookies” e permite revogação, interrompendo novos eventos e removendo cookies `_fbp`/`_fbc` acessíveis no domínio; dados já enviados não são apagados retroativamente.

Eventos explícitos, sem correspondência avançada ou eventos automáticos:

| Evento | Momento |
| --- | --- |
| `PageView` | Entrada em uma página pública elegível, incluindo navegação Angular |
| `ViewContent` | Carregamento bem-sucedido de produto ou oferta |
| `AddToWishlist` | Favorito adicionado com sucesso |
| `AffiliateClick` (personalizado) | Clique para abrir a oferta no marketplace |

Não há `Purchase`: um clique não comprova compra ou comissão. Os eventos não incluem nome, e-mail, tokens de sessão, valores do campo de busca ou conteúdo privado. A Meta ainda recebe dados técnicos da conexão e seus próprios identificadores conforme a política informada ao visitante.

Páginas elegíveis: home, `/produto/:id` e `/oferta/:id`. Admin, login, conta e coleções privadas não geram eventos. URLs com fragmentos ou parâmetros diferentes de `fbclid` e `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` são excluídas para evitar vazamento de valores de busca e parâmetros sensíveis. Os parâmetros de atribuição permitidos podem ser transmitidos à Meta após consentimento. Não há repetição de ações anteriores ao aceite.

A CSP permite somente os hosts Meta necessários para script e coleta, mantendo nonce e restrição de scripts inline. Os testes de navegador substituem o script por um stub local e não enviam dados ao Pixel real. Após o deploy autorizado, valide manualmente em Gerenciador de Eventos → Testar eventos, primeiro recusando e depois aceitando os cookies opcionais. Mudanças administrativas entram em vigor no carregamento seguinte da página.
