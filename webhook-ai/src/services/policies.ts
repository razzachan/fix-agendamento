import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { normalizeComparableText } from './inboundClassifier.js';

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
  const normalize = (s: string) => normalizeComparableText(String(s || ''));

  const e = normalize(equipamento);
  const eCompact = e.replace(/\s+/g, '');
  const inc = (needle: string) => {
    const n = normalize(needle);
    const nCompact = n.replace(/\s+/g, '');
    return e.includes(n) || eCompact.includes(nCompact);
  };

  logger.debug('[Policies] Analisando equipamento', { equipamento, normalized: e });

  // Detectar ambiguidade - retorna vazio para forçar pergunta
  if (
    (inc('fogao') || inc('cooktop')) &&
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
  if (inc('cooktop') && (inc('inducao') || inc('eletrico')))
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
  if (inc('cooktop') && inc('gas')) return ['domicilio'];
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
  logger.debug('[Policies] Resultado final', { result: finalResult });
  return finalResult;
}

export function getServicePolicyHintsForPrompt(): string {
  return `Políticas de serviço (resumo):
- Forno elétrico embutido → coleta_diagnostico
- Micro-ondas embutido → coleta_diagnostico
- Micro-ondas de bancada → coleta_conserto
- Lava-louças / Lavadora / Secadora → coleta_diagnostico
- Coifa / Fogão a gás / Cooktop → domicilio (visita)
- 🏭 EQUIPAMENTOS INDUSTRIAIS/COMERCIAIS:
  * Fogão industrial (4-8 bocas) → coleta_diagnostico
  * Forno industrial (médio porte) → coleta_diagnostico
  * Forno de padaria (médio porte) → coleta_diagnostico
  * Forno comercial (médio porte) → coleta_diagnostico
  * Geladeira comercial → coleta_diagnostico
  * NÃO atendemos: fornos de esteira, fornos de grande porte, equipamentos de linha de produção
Respeite sempre as políticas. Se o equipamento estiver ambíguo (ex.: micro-ondas sem dizer se é embutido ou bancada), peça a informação ao invés de assumir.
IMPORTANTE: Se detectar "forno industrial", "forno de padaria", "forno comercial" ou "fogão industrial", NÃO pergunte se é "embutido ou bancada" - vá direto para orçamento.
NOMENCLATURA: Nas respostas, sempre use "forno comercial" ao invés de "forno de padaria" (mais genérico para qualquer estabelecimento).`;
}
