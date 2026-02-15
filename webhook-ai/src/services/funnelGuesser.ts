import { normalizeInboundText } from './inboundClassifier.js';

export type FunnelFields = {
  equipamentosEncontrados: string[];
  equipamento?: string;
  marca?: string;
  problema?: string;
  num_burners?: string;
};

export function guessFunnelFields(text: string): FunnelFields {
  const braw = text || '';
  const b = normalizeInboundText(braw);
  const equipamentos = [
    // Fogão / Forno
    'fogão',
    'fogao',
    'forno',
    'forno elétrico',
    'forno eletrico',
    'forno a gás',
    'forno a gas',
    'forno de embutir',
    'forno embutir',
    // Cooktop
    'cooktop',
    'cook top',
    'cook-top',
    // Micro-ondas
    'micro-ondas',
    'microondas',
    'micro ondas',
    'micro ondas',
    'forno microondas',
    'forno micro-ondas',
    'forno de microondas',
    'micro ondas',
    'microondas embutido',
    'micro-ondas embutido',
    'microondas bancada',
    'micro-ondas bancada',
    // Lava-louças (variações sing/plural, com/sem hífen e cedilha)
    'lava-loucas', // PRIORIDADE: com hífen normalizado (lava-louças → lava-loucas)
    'lava loucas',
    'lava louca',
    'lava-louca',
    'lavaloucas',
    'lavalouca',
    'maquina de lavar loucas',
    'maquina lavar loucas',
    // Lava-roupas / Lavadora
    'lava roupas',
    'lava-roupas',
    'lavadora',
    'lavadora de roupas',
    'máquina de lavar',
    'maquina de lavar',
    'máquina lavar',
    'maquina lavar',
    'máquina de lavar roupas',
    'maquina de lavar roupas',
    // Lava e seca
    'lava e seca',
    'lava-seca',
    'lava & seca',
    'lava&seca',
    'lava seca',
    // Secadora
    'secadora',
    'secadora de roupas',
    // Coifa
    'coifa',
    'exaustor',
    'depurador',
    // Adega
    'adega',
    'adega climatizada',
    'adega de vinhos',
    'adega de vinho',
  ];
  const marcas = [
    'brastemp',
    'consul',
    'electrolux',
    'eletrolux',
    'lg',
    'samsung',
    'bosch',
    'midea',
    'philco',
    'fischer',
    'mueller',
    'ge',
    'continental',
    'tramontina',
    'dako',
    'esmaltec',
    'atlas',
    'panasonic',
  ];

  // Extrair TODOS os equipamentos encontrados (não apenas o primeiro)
  const equipamentosEncontrados: string[] = [];
  for (const e of equipamentos) {
    if (b.includes(e)) {
      equipamentosEncontrados.push(e.replace('fogao', 'fogão'));
    }
  }

  let marca: string | undefined;
  for (const m of marcas) {
    if (b.includes(m)) {
      marca = m;
      break;
    }
  }
  // Heurística adicional: capturar marcas não listadas quando o usuário escreve "da marca X" ou "marca: X"
  if (!marca) {
    try {
      const m1 = (braw || '').match(
        /(?:da|de|do)?\s*marca\s*(?:é|eh|:)?\s*([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\- ]{1,30})/i
      );
      if (m1 && m1[1]) {
        marca = m1[1].trim().split(/[\n,;.]/)[0];
      }
    } catch {}
  }
  // Problema: pegar trecho conhecido
  const problemas = [
    // instalação
    'instalação',
    'instalacao',
    'instalar',
    'montagem',
    'colocar',
    // acendimento/ligar
    'não acende',
    'nao acende',
    'não liga',
    'nao liga',
    'sem chama',
    'faísca fraca',
    'faisca fraca',
    'boca não acende',
    'boca nao acende',
    'boca não funciona',
    'boca nao funciona',
    // força/cor da chama
    'chama fraca',
    'chamas fracas',
    'chama baixa',
    'fogo fraco',
    'boca fraca',
    'bocas fracas',
    'duas bocas fracas',
    'duas chamas fracas',
    '2 chamas fracas',
    'chama amarela',
    'chamas amarelas',
    'fogo amarelo',
    'fogo amarelado',
    // fuligem/panelas escurecendo (sinônimos comuns no WhatsApp)
    'panela preta',
    'panelas pretas',
    'panela escurecida',
    'panelas ficando pretas',
    'escurecendo as panelas',
    'sujeira preta',
    'fuligem',
    'fuligem preta',
    'fumaça preta',
    'fumaca preta',
    // quantidade de bocas com defeito
    '2 bocas',
    'duas bocas',
    'duas bocas não funcionam',
    'duas bocas nao funcionam',
    'duas bocas não acendem',
    'duas bocas nao acendem',
    // gás/cheiro
    'vazando gás',
    'vazamento de gás',
    'cheiro de gás',
    'cheiro de gas',
    'cheiro de queimado',
    'cheiro de queim',
    // fumaça
    'fumaça',
    'fumaca',
    'fumaça por baixo',
    'saindo fumaça',
    // aquecimento/barulho
    'não esquenta',
    'nao esquenta',
    'faz barulho',
    'não funciona',
    'nao funciona',
    // água/entrada/saída (lava-louças, lavadora)
    'não entra água',
    'nao entra agua',
    'não puxa água',
    'nao puxa agua',
    'não enche',
    'nao enche',
    'não drena',
    'nao drena',
    'não escoa',
    'nao escoa',
    'vazando água',
    'vazando agua',
    'vaza água',
    'vaza agua',
    // lava-louças: lavagem/limpeza (ORDEM: mais específico primeiro)
    'nao lava direito',
    'nao limpa direito',
    'nao lava bem',
    'loucas ficam sujas',
    'loucas sujas',
    'louca suja',
    'pratos ficam sujos',
    'pratos sujos',
    'lava mal',
    'nao lava',
    'nao limpa',
    // centrifugação/secagem/porta
    'não centrifuga',
    'nao centrifuga',
    'não seca',
    'nao seca',
    'não aquece',
    'nao aquece',
    'porta não fecha',
    'porta nao fecha',
    'porta não trava',
    'porta nao trava',
    'trava da porta',
  ];
  let problema: string | undefined;
  for (const p of problemas) {
    if (b.includes(p)) {
      problema = p;
      break;
    }
  }

  // Detectar total de bocas (4/5/6) do equipamento (não confundir com bocas com defeito)
  let num_burners: string | undefined;
  const m = b.match(/(?:\b|^)(4|5|6)\s*bocas?\b/);
  if (m) {
    num_burners = m[1];
  } else {
    const words: Record<string, string> = { quatro: '4', cinco: '5', seis: '6' };
    for (const [w, n] of Object.entries(words)) {
      if (b.includes(`${w} bocas`) || b.includes(`${w} boca`)) {
        num_burners = n;
        break;
      }
    }
  }

  // Retornar primeiro equipamento para compatibilidade, mas também a lista completa
  // Preferir um equipamento mais específico quando o usuário já informou o tipo
  // (crítico para política de atendimento e para o gate de orçamento de fogão/cooktop).
  let equipamento = equipamentosEncontrados[0];
  try {
    const rawLower = (braw || '').toLowerCase();
    const hasFogao = equipamentosEncontrados.some((x) => /fog[ãa]o/i.test(String(x || '')));
    const hasGas = /\bgas\b|\bg[aá]s\b|a\s*gas/.test(rawLower) || b.includes('gas');
    const hasInducao = b.includes('inducao') || rawLower.includes('indução');
    const hasEletrico = b.includes('eletrico') || rawLower.includes('elétrico');
    if (hasFogao) {
      if (hasGas) equipamento = 'fogão a gás';
      else if (hasInducao) equipamento = 'fogão de indução';
      else if (hasEletrico) equipamento = 'fogão elétrico';
    }
  } catch {}
  return { equipamento, equipamentosEncontrados, marca, problema, num_burners };
  function guessAcceptance(text: string) {
    const b = (text || '').toLowerCase();
    const yes = [
      'sim',
      'pode ser',
      'pode agendar',
      'quero',
      'vamos',
      'fechado',
      'ok',
      'ok pode',
      'tá bom',
      'ta bom',
      'bora',
      'aceito',
      'aceitamos',
      'pode marcar',
      'marca',
    ];
    const no = ['não', 'nao', 'prefiro não', 'prefiro nao', 'depois eu vejo', 'mais tarde', 'talvez'];
    if (no.some((w) => b.includes(w))) return { accepted: false };
    if (yes.some((w) => b.includes(w))) return { accepted: true };
    return { accepted: undefined };
  }
}
