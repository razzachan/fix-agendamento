import { supabase } from './supabase.js';

interface CostInput {
  attendanceType?: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
  itemValue?: string | number | null;
  mode: 'on_create' | 'on_budget_approved' | 'on_finalize';
  estimatedCost?: number; // para diagnóstico
}

export async function applyCostRules(serviceOrderId: string, input: CostInput) {
  const type = input.attendanceType || 'em_domicilio';
  const val = toNumber(input.itemValue);

  if (input.mode === 'on_create') {
    if (type === 'coleta_diagnostico') {
      // initial_cost = valor da coleta/diagnóstico
      await updateOrder(serviceOrderId, { initial_cost: val || 0 });
    } else if (type === 'coleta_conserto') {
      // final_cost = total, initial_cost = 50%
      if (val && val > 0) {
        const initial = round2(val * 0.5);
        await updateOrder(serviceOrderId, { initial_cost: initial, final_cost: val });
      }
    } else if (type === 'em_domicilio') {
      // initial_cost = valor, final será igual quando finalizar
      if (val && val > 0) {
        await updateOrder(serviceOrderId, { initial_cost: val });
      }
    }
  }

  if (input.mode === 'on_budget_approved') {
    if (type === 'coleta_diagnostico') {
      const estimated = input.estimatedCost || 0;
      // final_cost = initial_cost + estimated_cost
      const initial = await getInitial(serviceOrderId);
      await updateOrder(serviceOrderId, { final_cost: round2(initial + estimated) });
    }
  }

  if (input.mode === 'on_finalize') {
    if (type === 'em_domicilio') {
      // final_cost = initial_cost
      const initial = await getInitial(serviceOrderId);
      await updateOrder(serviceOrderId, { final_cost: initial });
    }
  }
}

async function updateOrder(id: string, patch: Record<string, any>) {
  const { error } = await supabase.from('service_orders').update(patch).eq('id', id);
  if (error) throw error;
}

async function getInitial(id: string): Promise<number> {
  const { data } = await supabase
    .from('service_orders')
    .select('initial_cost')
    .eq('id', id)
    .single();
  return toNumber(data?.initial_cost) || 0;
}

function toNumber(n: any): number | null {
  if (n === null || n === undefined) return null;
  if (typeof n === 'number') return n;
  const s = String(n)
    .replace(/[^0-9.,]/g, '')
    .replace('.', '')
    .replace(',', '.');
  const v = Number(s);
  return isNaN(v) ? null : v;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
