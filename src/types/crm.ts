export type CrmStatus =
  | 'novo_lead'
  | 'orcamento_enviado'
  | 'aguardando_resposta'
  | 'interessado'
  | 'agendamento_pendente'
  | 'coleta_agendada'
  | 'em_diagnostico'
  | 'orcamento_detalhado'
  | 'aprovado'
  | 'em_reparo'
  | 'pronto_entrega'
  | 'entregue'
  | 'perdido'
  | 'cancelado';

export interface Client {
  id: string;
  name: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  client_id: string;
  equipment_type: string | null;
  problem_description: string | null;
  urgency_level: 'high' | 'medium' | 'low' | string;
  source: string | null;
  status: string | null;
  crm_status: CrmStatus;
  crm_score: number;
  crm_last_interaction: string;
  crm_next_followup: string | null;
  crm_notes: string[] | null;
  crm_tags: string[] | null;
  created_at: string;
  updated_at: string;
  clients?: Client;
}

export interface CrmMetrics {
  novos_leads: number;
  orcamentos_enviados: number;
  aguardando_resposta: number;
  interessados: number;
  agendamentos_pendentes: number;
  coletas_agendadas: number;
  em_diagnostico: number;
  orcamentos_detalhados: number;
  aprovados: number;
  em_reparo: number;
  prontos_entrega: number;
  entregues: number;
  perdidos: number;
  leads_quentes: number;
  leads_mornos: number;
  leads_frios: number;
  leads_congelados: number;
}

export type ScoreCategory = 'quente' | 'morno' | 'frio' | 'congelado';

export function getScoreCategory(score: number): ScoreCategory {
  if (score >= 80) return 'quente';
  if (score >= 60) return 'morno';
  if (score >= 40) return 'frio';
  return 'congelado';
}

export const SCORE_CONFIG: Record<ScoreCategory, { label: string; icon: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  quente: { label: 'Quente', icon: '🔥', variant: 'destructive' },
  morno: { label: 'Morno', icon: '⭐', variant: 'default' },
  frio: { label: 'Frio', icon: '💤', variant: 'secondary' },
  congelado: { label: 'Congelado', icon: '❄️', variant: 'outline' },
};

export const CRM_STATUS_LABELS: Record<CrmStatus, string> = {
  novo_lead: 'Novo Lead',
  orcamento_enviado: 'Orçamento Enviado',
  aguardando_resposta: 'Aguardando Resposta',
  interessado: 'Interessado',
  agendamento_pendente: 'Agendamento Pendente',
  coleta_agendada: 'Coleta Agendada',
  em_diagnostico: 'Em Diagnóstico',
  orcamento_detalhado: 'Orçamento Detalhado',
  aprovado: 'Aprovado',
  em_reparo: 'Em Reparo',
  pronto_entrega: 'Pronto p/ Entrega',
  entregue: 'Entregue ✅',
  perdido: 'Perdido ❌',
  cancelado: 'Cancelado',
};
