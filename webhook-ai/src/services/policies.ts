import { supabase } from './supabase.js';

export type ServicePolicyRow = {
  service_type: 'domicilio' | 'coleta_diagnostico' | 'coleta_conserto';
  equipments: string[];
  notes?: string | null;
  offer_message?: string | null;
  enabled?: boolean | null;
};

export function getOfferMessageForServiceType(
  policies: ServicePolicyRow[],
  type: ServicePolicyRow['service_type']
): string | null {
  const row = policies.find((p) => p.service_type === type && p.enabled !== false);
  return row?.offer_message || null;
}

export async function fetchServicePolicies(): Promise<ServicePolicyRow[]> {
  const { data, error } = await supabase
    .from('bot_service_policies')
    .select('*')
    .eq('enabled', true);
  if (error || !data) return [];
  return data as ServicePolicyRow[];
}

export function getPreferredServicesForEquipment(
  policies: ServicePolicyRow[],
  equipamento?: string
): string[] {
  if (!equipamento) return [];
  const normalize = (s: string) =>
    String(s || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const e = normalize(equipamento);
  const eCompact = e.replace(/\s+/g, '');
  const inc = (needle: string) => {
    const n = normalize(needle);
    const nCompact = n.replace(/\s+/g, '');
    return e.includes(n) || eCompact.includes(nCompact);
  };

  console.log('[Policies] Analisando equipamento:', equipamento, '→', e);

  // Detectar ambiguidade - retorna vazio para forçar pergunta
  if (
    inc('fogao') &&
    !inc('gas') &&
    !inc('inducao') &&
    !inc('eletrico') &&
    !inc('comum')
  )
    return [];
  if (inc('microondas') && !inc('embutido') && !inc('bancada')) return [];
  if (inc('forno') && !inc('embutido') && !inc('bancada')) return [];

  // Regras específicas primeiro (mais prioritárias)

  // 1. Coleta conserto - equipamentos pequenos de bancada
  if (inc('microondas') && !inc('embutido')) return ['coleta_conserto'];
  if (inc('forno') && inc('bancada')) return ['coleta_conserto'];
  if (inc('forno') && inc('eletrico') && inc('bancada'))
    return ['coleta_conserto'];

  // 2. Coleta diagnóstico - equipamentos específicos
  if (inc('fogao') && (inc('inducao') || inc('eletrico')))
    return ['coleta_diagnostico'];
  // Forno elétrico de embutir = diagnóstico (nunca domicílio)
  if (inc('forno') && inc('eletrico') && inc('embut'))
    return ['coleta_diagnostico'];
  if (inc('microondas') && inc('embutido')) return ['coleta_diagnostico'];
  if (inc('adega')) return ['coleta_diagnostico'];
  if (inc('embutido')) return ['coleta_diagnostico'];
  if (inc('lava') && (inc('louca') || inc('roupa') || inc('seca')))
    return ['coleta_diagnostico'];
  if (inc('secadora')) return ['coleta_diagnostico'];
  if (inc('maquina') && inc('lavar')) return ['coleta_diagnostico'];

  // 3. Domicílio - equipamentos de visita técnica (apenas quando especificado)
  if (inc('fogao') && inc('gas')) return ['domicilio'];
  if (inc('fogao') && inc('comum')) return ['domicilio'];
  if (inc('cooktop')) return ['domicilio'];
  // Nunca oferecer forno elétrico em domicílio (removido)
  if (inc('coifa')) return ['domicilio'];

  // Fallback: se não encontrou nada específico, tenta matching genérico
  const matches = (row: ServicePolicyRow) => {
    return (row.equipments || []).some((x) => {
      const equipment = normalize(String(x || ''));
      const equipmentCompact = equipment.replace(/\s+/g, '');
      return (
        (equipment && (e.includes(equipment) || eCompact.includes(equipmentCompact))) ||
        (e && (equipment.includes(e) || equipmentCompact.includes(eCompact)))
      );
    });
  };

  const order: ServicePolicyRow['service_type'][] = [
    'coleta_conserto',
    'coleta_diagnostico',
    'domicilio',
  ];
  const result: string[] = [];
  for (const t of order) {
    const rows = policies.filter((p) => p.service_type === t && matches(p));
    if (rows.length) result.push(t);
  }
  const finalResult = Array.from(new Set(result));
  console.log('[Policies] Resultado final:', finalResult);
  return finalResult;
}
