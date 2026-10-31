# Catálogo estruturado no admin

Revisão → Configurações de IA contém modos anterior/simulação/ativo, políticas por tipo de produto, preparação de identidades, execuções e resultados paginados. Simulação é o padrão e não modifica vínculos nem publica. A ativação é explícita.

Políticas definem termos e prioridade, campos de identidade, aliases de especificações/valores, unidades e categoria padrão opcional. A IA pode criar uma política reutilizável quando não existir tipo correspondente. O título prevalece sobre descrições conflitantes e dados ausentes não bloqueiam o cadastro. Não existem seleções ou lógica específica por marketplace. A avaliação das amostras mede vínculo errado, duplicação e categoria errada. O fluxo ativo cataloga e categoriza todos os itens com link de afiliado, sem exclusão, invalidação ou revisão automáticas. A publicação continua manual.

Backend deve conter a migration 044 antes de publicar este cliente. CI usa um commit fixo do backend para validar o contrato em banco em memória isolado. O teste de navegador verifica configuração real, políticas, paginação, ações flutuantes e mobile. Resultados antigos excluídos são identificados como liberados para reprocessar; itens já tratados por ação manual possuem status próprio. Nenhum deploy faz parte desta entrega.
