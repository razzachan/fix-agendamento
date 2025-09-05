import { supabase } from './supabase.js';

export type ServicePolicyRow = {
  service_type: 'domicilio' | 'coleta_diagnostico' | 'coleta_conserto';
  equipments: string[];
  notes?: string | null;
  offer_message?: string | null;
  enabled?: boolean | null;
};

export function getOfferMessageForServiceType(policies: ServicePolicyRow[], type: ServicePolicyRow['service_type']): string | null {
  const row = policies.find(p => p.service_type === type && p.enabled !== false);
  return (row?.offer_message || null);
}

export async function fetchServicePolicies(): Promise<ServicePolicyRow[]> {
  const { data, error } = await supabase.from('bot_service_policies').select('*').eq('enabled', true);
  if (error || !data) return [];
  return data as ServicePolicyRow[];
}

export function getPreferredServicesForEquipment(policies: ServicePolicyRow[], equipamento?: string): string[] {
  if (!equipamento) return [];
  const e = equipamento.toLowerCase();
  console.log('[Policies] Analisando equipamento:', equipamento, '→', e);

  // Detectar ambiguidade - retorna vazio para forçar pergunta
  if (e.includes('fogão') && !e.includes('gás') && !e.includes('indução') && !e.includes('elétrico') && !e.includes('comum')) return [];
  if (e.includes('microondas') && !e.includes('embutido') && !e.includes('bancada')) return [];
  if (e.includes('forno') && !e.includes('embutido') && !e.includes('bancada')) return [];

  // Regras específicas primeiro (mais prioritárias)

  // 1. Coleta conserto - equipamentos pequenos de bancada
  if (e.includes('microondas') && !e.includes('embutido')) return ['coleta_conserto'];
  if (e.includes('micro-ondas') && !e.includes('embutido')) return ['coleta_conserto'];
  if (e.includes('forno') && e.includes('bancada')) return ['coleta_conserto'];
  if (e.includes('forno') && e.includes('elétrico') && e.includes('bancada')) return ['coleta_conserto'];

  // 2. Coleta diagnóstico - equipamentos específicos
  if (e.includes('fogão') && (e.includes('indução') || e.includes('elétrico'))) return ['coleta_diagnostico'];
  // Forno elétrico de embutir = diagnóstico (nunca domicílio)
  if (e.includes('forno') && e.includes('elétrico') && e.includes('embut')) return ['coleta_diagnostico'];
  if (e.includes('micro-ondas') && e.includes('embutido')) return ['coleta_diagnostico'];
  if (e.includes('microondas') && e.includes('embutido')) return ['coleta_diagnostico'];
  if (e.includes('adega')) return ['coleta_diagnostico'];
  if (e.includes('embutido')) return ['coleta_diagnostico'];
  if (e.includes('lava') && (e.includes('louça') || e.includes('roupa') || e.includes('seca'))) return ['coleta_diagnostico'];
  if (e.includes('secadora')) return ['coleta_diagnostico'];
  if (e.includes('máquina') && e.includes('lavar')) return ['coleta_diagnostico'];

  // 3. Domicílio - equipamentos de visita técnica (apenas quando especificado)
  if (e.includes('fogão') && e.includes('gás')) return ['domicilio'];
  if (e.includes('fogão a gás')) return ['domicilio'];
  if (e.includes('fogão') && e.includes('comum')) return ['domicilio'];
  if (e.includes('cooktop')) return ['domicilio'];
  // Nunca oferecer forno elétrico em domicílio (removido)
  if (e.includes('coifa')) return ['domicilio'];

  // Fallback: se não encontrou nada específico, tenta matching genérico
  const matches = (row: ServicePolicyRow) => {
    return (row.equipments || []).some(x => {
      const equipment = String(x || '').toLowerCase();
      return e.includes(equipment) || equipment.includes(e);
    });
  };

  const order: ServicePolicyRow['service_type'][] = ['coleta_conserto', 'coleta_diagnostico', 'domicilio'];
  const result: string[] = [];
  for (const t of order){
    const rows = policies.filter(p => p.service_type === t && matches(p));
    if (rows.length) result.push(t);
  }
  const finalResult = Array.from(new Set(result));
  console.log('[Policies] Resultado final:', finalResult);
  return finalResult;
}

