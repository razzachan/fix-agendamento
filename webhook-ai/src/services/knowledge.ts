import { supabase } from './supabase.js';

export type KnowledgeBlock = {
  key: string;
  type?: string; // 'knowledge_block' | 'rule' | ...
  description?: string;
  data?: {
    equipamento?: string;
    sintomas?: string[];
    causas_possiveis?: string[];
    servicos_recomendados?: string[];
    mensagens_base?: Record<string, string>;
    [k: string]: any;
  };
};

export function extractBlocks(bot: any): KnowledgeBlock[] {
  try {
    const arr = Array.isArray(bot?.contextBlocks) ? bot.contextBlocks : [];
    return arr
      .map((b: any) => {
        const out: KnowledgeBlock = {
          key: String(b?.key || ''),
          type: b?.type || 'knowledge_block',
          description: b?.description || '',
          data: undefined,
        };
        // Se já vier estruturado
        if (b?.data && typeof b.data === 'object') out.data = b.data;
        // Se vier em variables como JSON
        if (!out.data && b?.variables && typeof b.variables === 'object') {
          const maybe = b.variables.data || b.variables.knowledge || null;
          if (maybe && typeof maybe === 'object') out.data = maybe;
          // Se for string JSON
          if (typeof maybe === 'string') {
            try {
              out.data = JSON.parse(maybe);
            } catch {}
          }
        }
        return out;
      })
      .filter((b: KnowledgeBlock) => b.key);
  } catch {
    return [];
  }
}

export async function fetchKnowledgeBlocks(): Promise<KnowledgeBlock[]> {
  try {
    const { data, error } = await supabase
      .from('bot_knowledge_blocks')
      .select('*')
      .eq('enabled', true);
    if (error || !data) return [];
    return (data as any[]).map((row) => ({
      key: row.key,
      type: row.type || 'knowledge_block',
      description: row.description || '',
      data: row.data || undefined,
    }));
  } catch {
    return [];
  }
}

export function findRelevantBlocks(
  blocks: KnowledgeBlock[],
  message: string,
  collected?: { equipamento?: string; problema?: string; marca?: string }
): KnowledgeBlock[] {
  const msg = (message || '').toLowerCase();
  const eq = (collected?.equipamento || '').toLowerCase();
  const prob = (collected?.problema || '').toLowerCase();
  const isRelevant = (b: KnowledgeBlock) => {
    const d = b.data || {};
    if (eq && d.equipamento && String(d.equipamento).toLowerCase() === eq) return true;
    const sintomas: string[] = Array.isArray(d.sintomas) ? (d.sintomas as string[]) : [];
    if (sintomas.some((s) => msg.includes(s.toLowerCase()) || prob.includes(s.toLowerCase())))
      return true;
    // Palavras do key/description
    const kd = `${b.key} ${b.description || ''}`.toLowerCase();
    if (eq && kd.includes(eq)) return true;
    if (prob && kd.includes(prob)) return true;
    // fallback fraco: se falar 'fogao' e o bloco é de equipamento fogão
    if (!eq && d.equipamento && msg.includes(String(d.equipamento).toLowerCase())) return true;
    return false;
  };
  return blocks.filter(isRelevant).slice(0, 5);
}

export function renderBlocksForPrompt(blocks: KnowledgeBlock[]): string {
  if (!blocks.length) return '';
  const lines: string[] = [];
  for (const b of blocks) {
    const d = b.data || {};
    lines.push(`[${b.key}]`);
    if (d.equipamento) lines.push(`- equipamento: ${d.equipamento}`);
    if (Array.isArray(d.sintomas) && d.sintomas.length)
      lines.push(`- sintomas: ${d.sintomas.join(', ')}`);
    if (Array.isArray(d.causas_possiveis) && d.causas_possiveis.length)
      lines.push(`- causas_possiveis: ${d.causas_possiveis.join('; ')}`);
    if (Array.isArray(d.servicos_recomendados) && d.servicos_recomendados.length)
      lines.push(`- servicos_recomendados: ${d.servicos_recomendados.join(', ')}`);
    if (d.mensagens_base && typeof d.mensagens_base === 'object')
      lines.push(`- mensagens_base(disponíveis): ${Object.keys(d.mensagens_base).join(', ')}`);
  }
  return `Blocos de conhecimento relevantes (use como referência, reescrevendo com naturalidade e sem copiar):\n${lines.join('\n')}`;
}
