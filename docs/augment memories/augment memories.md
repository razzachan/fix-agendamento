

















# System Overview
- EletroFix Hub Pro é um sistema de gestão para assistência técnica com React+TypeScript, Supabase, Tailwind CSS, Mapbox, incluindo agendamentos IA, roteirização inteligente, calendário técnicos, ordens de serviço, sistema de pagamentos por etapas e automação.
- Status atual: MVP 2 (Oficinas) 100% completo, drag & drop calendar system implementado em Janeiro 2025, sistema em produção: 192.168.0.10:8081. Próximo: MVP 3 (Portal do Cliente) com dashboard, portal de solicitações, acompanhamento tempo real, e sistema de avaliações.
- Todas implementações devem conectar diretamente ao banco Supabase, sem mock data, incluindo visualizações detalhadas e métricas.
- Sistema já possui bot de atendimento usando neural chains da plataforma ClienteChat que envia pré-agendamentos como parâmetros.
- User confirmed that the client portal (MVP 3) implementation is sufficient for the current phase and no additional work is needed at this time.

# User Preferences
- Usuário prefere comunicação em português/brasileiro e atualizações automáticas em tempo real na interface.
- Prefere componentes UI com design menos agressivo, cores verde suave com opacidade, modais de tamanho médio com rolagem interna.
- Prefere barras de progresso seguindo padrão de timeline/rastreamento de e-commerce, compactos e acessíveis via dropdown.
- Prefere organização hierárquica do menu lateral com submenus e ícones 20% maiores quando recolhidos.
- Prefere rótulos de status em português correto em vez de nomes técnicos (at_workshop, scheduled, paid).
- Logo da empresa fornecida e cor principal do branding é #E5B034 (dourado/amarelo), sem texto "Fix Fogões" ou "Hub Pro" na página de login.
- Prefere login page com UX/UI mais bonito e completo, sem abas de seleção de roles - apenas campos de login diretos.
- Prefere criação de conta via modal em vez de páginas separadas, sem verificação de email.
- Prefere notificações com funcionalidade completa (limpar, marcar como lidas) e atualização automática em tempo real.
- Prefere avatar clicável no portal do cliente que abre dropdown ou navega para página de edição de perfil.
- Prefere implementar analytics apenas para admin e expandir página /finance existente com aba de analytics.
- Prefere componentes de roteamento unificados integrados em painéis existentes em vez de fluxos de trabalho em várias páginas.
- Prefere calendários visuais integrados em modais com sincronização bidirecional, seguindo o padrão da aba de calendário do login do técnico.
- Prefere funcionalidade drag-and-drop de cartões de agendamento para slots do calendário para gerar ordens de serviço.
- Prefere numeração sequencial padronizada (OS #001, OS #002) em vez de UUIDs na interface, mantendo UUID internamente.

# Service Types and Workflows
- Sistema tem três tipos de atendimento: 'Coleta diagnostico', 'Coleta conserto', e 'Em domicilio', com fluxos de pagamento específicos.
- Para 'Coleta Conserto', o sistema deve pular etapas de diagnóstico e aprovação de orçamento (preço fixo).
- Para serviços de 'Coleta', o prazo padrão é de até 7 dias úteis; para 'Em domicilio', geralmente é no mesmo dia.
- Status 'pending' (Em Aberto) refere-se a agendamentos pré-agendados no fluxo do sistema.
- Service order timeline sempre começa com status 'agendado' quando a OS é criada.
- Pré-agendamentos não são OS criadas (agendamentos) para não ter conflito de ID com o sistema de numeração sequencial.

# User Roles and Permissions
- Sistema suporta diferentes tipos de login e permissões para técnicos, oficinas e administradores.
- Usuários de oficina não devem ver valores de custo final (informação restrita aos administradores).
- Para oficinas: apenas enviar diagnóstico; orçamento, pesquisa etc ficará com o admin.
- Criação de conta deve ser específica para contas de cliente, requerendo: para pessoas físicas (Nome completo, endereço com CEP, email, CPF) e para empresas (Razão Social, CNPJ, endereço com CEP, email).

# Calendar and Interface Features
- Calendário principal: visualização estilo Google Calendar com visualizações mensal/semanal/diária, detalhes do evento ao clicar, status com código de cores.
- Calendário deve mostrar intervalos de almoço (12h-13h) como separação visual e exibir intervalos de tempo nos eventos.
- Sistema de roteamento deve integrar com calendário principal para compatibilidade de agendamento, incluindo validação de conflitos.
- Interface da oficina requer gerenciamento completo do ciclo de vida do equipamento com cartões incluindo tipo de serviço, descrição do problema e fotos clicáveis.
- A interface correta de roteamento para funcionalidade drag & drop está localizada em uma aba dentro da página de pré-agendamento.

# Stock Management and Notifications
- Sistema de estoque móvel 100% funcional para técnicos de serviços domiciliares: dashboard, gestão de peças, histórico, alertas, integração com OS.
- Stock não interfere com criação/atribuição de OS - admin atribui ao técnico diretamente.
- Ao final da barra de progresso, perguntar se o técnico usou itens do estoque.
- Sistema de notificação abrange todos os tipos de login e todo o processo de ordem de serviço, gerando notificações automaticamente quando status mudam.
- Na conclusão do serviço, o cliente deve avaliar separadamente via link https://g.page/r/CfjiXeK7gOSLEAg/review.