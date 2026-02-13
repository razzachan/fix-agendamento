-- Expand crm_dashboard_metrics to match COPILOT_TASKS_CLAUDE.md

-- NOTE: If an older version of this view exists with different column order/names,
-- Postgres will refuse CREATE OR REPLACE VIEW due to implicit column renames.
-- Dropping and recreating avoids those rename conflicts.

DROP VIEW IF EXISTS crm_dashboard_metrics;

CREATE VIEW crm_dashboard_metrics AS
SELECT
  COUNT(*) FILTER (WHERE crm_status = 'novo_lead') as novos_leads,
  COUNT(*) FILTER (WHERE crm_status = 'orcamento_enviado') as orcamentos_enviados,
  COUNT(*) FILTER (WHERE crm_status = 'aguardando_resposta') as aguardando_resposta,
  COUNT(*) FILTER (WHERE crm_status = 'interessado') as interessados,
  COUNT(*) FILTER (WHERE crm_status = 'agendamento_pendente') as agendamentos_pendentes,
  COUNT(*) FILTER (WHERE crm_status = 'coleta_agendada') as coletas_agendadas,
  COUNT(*) FILTER (WHERE crm_status = 'em_diagnostico') as em_diagnostico,
  COUNT(*) FILTER (WHERE crm_status = 'orcamento_detalhado') as orcamentos_detalhados,
  COUNT(*) FILTER (WHERE crm_status = 'aprovado') as aprovados,
  COUNT(*) FILTER (WHERE crm_status = 'em_reparo') as em_reparo,
  COUNT(*) FILTER (WHERE crm_status = 'pronto_entrega') as prontos_entrega,
  COUNT(*) FILTER (WHERE crm_status = 'entregue') as entregues,
  COUNT(*) FILTER (WHERE crm_status = 'perdido') as perdidos,
  COUNT(*) FILTER (WHERE crm_score >= 80) as leads_quentes,
  COUNT(*) FILTER (WHERE crm_score BETWEEN 60 AND 79) as leads_mornos,
  COUNT(*) FILTER (WHERE crm_score BETWEEN 40 AND 59) as leads_frios,
  COUNT(*) FILTER (WHERE crm_score < 40) as leads_congelados,
  30::int as period_days
FROM pre_schedules
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
