# Catálogo estruturado no admin

Revisão → Configurações de IA contém modos anterior/simulação/ativo, políticas por tipo de produto, preparação de identidades, execuções e resultados paginados. Simulação é o padrão e não modifica vínculos nem publica. A ativação é explícita.

Políticas definem termos e prioridade, campos obrigatórios de identidade, aliases de especificações/valores, unidades e categoria padrão opcional. Não existem seleções ou lógica específica por marketplace. A avaliação das amostras mede vínculo errado, duplicação, categoria errada e exclusão indevida. A publicação continua manual.

Backend deve conter a migration 043 antes de publicar este cliente. CI usa um commit fixo do backend para validar o contrato em banco em memória isolado. O teste de navegador verifica configuração real, políticas, paginação, ações flutuantes e mobile. Nenhum deploy faz parte desta entrega.
