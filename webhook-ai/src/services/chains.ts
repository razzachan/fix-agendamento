import { supabase } from './supabase.js';
import type { SessionRecord } from './sessionStore.js';

export type NeuralChain = {
  id: string;
  name: string;
  description?: string;
  activation?: any;
  params_schema?: any;
  run_config?: any;
  enabled?: boolean;
};

export type ChainDirectives = {
  prefer_services: string[];
  allowed_tools: string[];
  boost_blocks: string[];
};

export async function fetchNeuralChains(): Promise<NeuralChain[]> {
  const { data, error } = await supabase.from('bot_neural_chains').select('*').eq('enabled', true);
  if (error || !data) return [];
  return data as NeuralChain[];
}

function includesAny(text: string, terms: string[]): boolean {
  const b = text.toLowerCase();
  return terms.some((t) => b.includes(String(t || '').toLowerCase()));
}

export function activateChains(
  chains: NeuralChain[],
  message: string,
  session?: SessionRecord
): ChainDirectives {
  const base: ChainDirectives = { prefer_services: [], allowed_tools: [], boost_blocks: [] };
  const stage = (session as any)?.state?.funil_etapa || null;
  for (const c of chains) {
    const act = c.activation || {};
    const okTerms = Array.isArray(act.termsAny) ? includesAny(message, act.termsAny) : true;
    const okStage = Array.isArray(act.stageAny) ? !stage || act.stageAny.includes(stage) : true;
    if (okTerms && okStage) {
      const run = c.run_config || {};
      if (Array.isArray(run.prefer_services)) base.prefer_services.push(...run.prefer_services);
      if (Array.isArray(run.allowed_tools)) base.allowed_tools.push(...run.allowed_tools);
      if (Array.isArray(run.boost_blocks)) base.boost_blocks.push(...run.boost_blocks);
    }
  }
  // Dedup
  base.prefer_services = Array.from(new Set(base.prefer_services));
  base.allowed_tools = Array.from(new Set(base.allowed_tools));
  base.boost_blocks = Array.from(new Set(base.boost_blocks));
  return base;
}

export function renderDirectivesForPrompt(d: ChainDirectives): string {
  const lines: string[] = [];
  if (d.prefer_services.length)
    lines.push(`Serviços preferenciais para este caso: ${d.prefer_services.join(', ')}`);
  if (d.allowed_tools.length) lines.push(`Ferramentas permitidas: ${d.allowed_tools.join(', ')}`);
  if (d.boost_blocks.length)
    lines.push(`Priorize conhecimento dos blocos: ${d.boost_blocks.join(', ')}`);
  if (!lines.length) return '';
  return `Diretrizes de execução (neural chain):\n${lines.join('\n')}`;
}
