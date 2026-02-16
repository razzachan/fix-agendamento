export type InboundSignals = {
  raw: string;
  norm: string;

  // High-signal intents
  isDeferralOrBye: boolean;
  wantsStatus: boolean;
  wantsHuman: boolean;
  isGreetingOnly: boolean;

  // Install/repair disambiguation helpers
  mentionsInstall: boolean;
  negatedInstall: boolean;
  looksLikeRepair: boolean;
};

export function normalizeInboundText(text: string): string {
  return String(text || '')
    // Remove caracteres invisíveis/controle que quebram regex (ex.: \u0000 no meio de "instalação")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

// Para comparações/matching robustos (ex.: equipamento):
// - remove diacríticos
// - troca pontuação/hífens por espaço
// - colapsa múltiplos espaços
export function normalizeComparableText(text: string): string {
  return normalizeInboundText(text)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyInbound(text: string): InboundSignals {
  const raw = String(text || '');
  const norm = normalizeInboundText(raw);

  // Keep aligned with waAdapter greeting short-circuit.
  // NOTE: `norm` has no diacritics, so use plain ASCII tokens.
  const isGreetingOnly = /^(ola|oi|opa|e\s*ai|eai|tudo\s*bem|bom dia|boa tarde|boa noite)[.!? ]*$/.test(
    norm
  );

  // Status (kept aligned with waAdapter short-circuit)
  const wantsStatus =
    /\b(status|andamento|atualiza[cç]ao|novidade|not[ií]cia|previsao|quando.*(tecnico|coleta|entrega)|chegou.*pe[cç]a|os\s*#?\d+|numero\s+da\s+os|n\u00ba\s+da\s+os|numero\s+da\s+ordem)\b/i.test(
      norm
    );

  // Human handoff
  const wantsHuman =
    /\b(humano|pessoa|atendente|operador|falar\s+com\s+alguem|transferir|escalar)\b/i.test(norm);

  // Deferral/bye (kept aligned with orchestrator + adapter)
  const isDeferralOrBye =
    /\b(tchau|ate mais|ate logo|obrigado|obrigada|valeu|depois\s+(?:eu\s+)?(?:falo|retorno)|depois\s+te\s+(?:falo|aviso)|vou\s+ver\s*(?:com\s+(?:meu\s+marido|minha\s+esposa|minha\s+mulher|meu\s+esposo))?\s*(?:e\s+)?(?:te\s+(?:falo|aviso)|retorno|volto|entro\s+em\s+contato|te\s+chamo|contato\s+depois)|qualquer\s+coisa.*(?:volto|falo).*(?:contigo|com\s+voce)|estou\s+levantando\s+outros\s+valores|estou\s+cotando|pegando\s+outros\s+orcamentos|vou\s+ver\s*(?:aqui\s+)?e\s+retorno)\b/.test(
      norm
    );

  // Install / repair disambiguation
  const mentionsInstall = /(instalar|instalacao|montagem|colocar)/i.test(norm);
  const negatedInstall =
    /\bnao\b.{0,20}\b(instalar|instalacao)\b/.test(norm) ||
    /\b(instalar|instalacao)\b.{0,20}\bnao\b/.test(norm) ||
    /\bnao\s*(e|eh)\s*instalacao\b/.test(norm) ||
    /\bnao\s*quero\s*instal/.test(norm);
  const looksLikeRepair =
    /\b(manutencao|conserto|reparo|arrumar|defeito|problema|assistencia)\b/.test(norm) ||
    /\bnao\s+liga\b|\bnao\s+acende\b|\bnao\s+funciona\b|\bnao\s+esquenta\b/.test(norm) ||
    /\bchama(s)?\b|\bboca(s)?\b|\bvazamento\b|\bcheiro\s+de\s+gas\b/.test(norm);

  return {
    raw,
    norm,
    isDeferralOrBye,
    wantsStatus,
    wantsHuman,
    isGreetingOnly,
    mentionsInstall,
    negatedInstall,
    looksLikeRepair,
  };
}
