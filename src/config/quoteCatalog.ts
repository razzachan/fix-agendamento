export type QuoteKind =
  | 'coifa_diagnostico'
  | 'lava_roupas_coleta'
  | 'fogao_industrial_manutencao'
  | 'fogao_residencial_manutencao';

export type QuoteForm = {
  kind: QuoteKind;
  brand?: string;
  problem?: string;
  segment?: 'basico' | 'inox' | 'premium';
  problemCategory?: string; // categoria (ex.: motor, filtro, comando, vazamento, acendimento, chamas_fracas...)
  // Fogão residencial
  stoveForm?: {
    type?: 'piso' | 'cooktop';
    burners?: 2 | 4 | 5 | 6;
    finish?: 'normal' | 'inox';
    classLevel?: 'basico' | 'premium';
  };
  // Fogão industrial
  industrialForm?: {
    burners?: 4 | 6 | 8 | 10;
  };
};

export type QuotePreview = {
  title: string;
  priceLabel: string; // Ex.: "R$ 490,00 (abatido do valor final)"
  details: string[];  // bullets
};

function brl(n: number){
  try{ return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }catch{ return `R$ ${n.toFixed(2)}`; }
}

export function computeLocalQuote(form: QuoteForm): QuotePreview | null {
  switch (form.kind) {
    case 'coifa_diagnostico': {
      return {
        title: 'Coifa — Visita Diagnóstica com Orçamento em Tempo Real',
        priceLabel: `${brl(490)} (abatido 100% se aprovar o serviço)`,
        details: [
          'Perguntas: marca e problema relatado',
          'Se precisar de segunda visita, não cobramos',
        ]
      };
    }
    case 'lava_roupas_coleta': {
      return {
        title: 'Lava Roupas — Coleta Diagnóstico',
        priceLabel: `${brl(350)} (abatido 100% se aprovar o conserto)`,
        details: [
          'Processo: coletamos, diagnosticamos, consertamos e entregamos em até 7 dias úteis',
          'Perguntas: marca e problema relatado',
        ]
      };
    }
    case 'fogao_industrial_manutencao': {
      const burners = form.industrialForm?.burners || 6;
      const table: Record<number, number> = { 4:390, 6:490, 8:590, 10:690 };
      const base = table[burners] || 490;
      return {
        title: `Fogão Industrial — Manutenção Técnica (${burners} bocas)`,
        priceLabel: brl(base),
        details: [
          'Escopo: regulagem do sistema de gás, limpeza de bicos/queimadores, troca de registros/injetores, correção de vazamentos',
          'Serviço no local, 3 meses de garantia e parcelamento disponível',
        ]
      };
    }
    case 'fogao_residencial_manutencao': {
      const t = form.stoveForm?.type || 'piso'; // 'piso' | 'cooktop'
      const b = form.stoveForm?.burners || 4;   // 2 | 4 | 5 | 6
      const seg = form.segment || 'basico';     // 'basico' | 'inox' | 'premium'

      // Nova tabela conforme sua especificação
      const table: Record<string, number> = {
        // Básico
        'cooktop_basico_2': 260,
        'cooktop_basico_4': 290,
        'cooktop_basico_5': 320,
        'piso_basico_4': 320,
        'piso_basico_5': 370,
        'piso_basico_6': 450,
        // Premium
        'cooktop_premium_4': 490,
        'cooktop_premium_5': 490,
        'piso_premium_4': 690,
        'piso_premium_5': 790,
        // Inox (básico)
        'piso_inox_basico_4': 450,
        'piso_inox_basico_5': 490,
        // Inox (premium)
        'piso_inox_premium_4': 690,
        'piso_inox_premium_5': 790,
      };

      // Chave: para seg 'inox', considerar subclasse via classLevel se vier preenchida
      const classLevel = form.stoveForm?.classLevel || (seg === 'premium' ? 'premium' : 'basico');
      let key = '';
      if (seg === 'inox') {
        // Apenas exemplos fornecidos para piso; se cooktop+inox surgir, marcamos como avaliação
        key = `piso_inox_${classLevel}_${b}`;
      } else {
        key = `${t}_${seg}_${b}`;
      }

      const base = table[key];
      return {
        title: `Fogão ${t === 'piso' ? 'de piso' : 'cooktop'} — ${seg} — ${b} bocas`,
        priceLabel: base ? brl(base) : 'Sob avaliação no local',
        details: [
          'Serviço no local, 3 meses de garantia e parcelamento disponível',
          'Valores base conforme tipologia (básico/inox/premium) e nº de bocas',
        ]
      };
    }
    default: return null;
  }
}

export const quoteCatalogOptions = [
  { value:'coifa_diagnostico', label:'Coifa — Visita Diagnóstica' },
  { value:'lava_roupas_coleta', label:'Lava Roupas — Coleta Diagnóstico' },
  { value:'fogao_residencial_manutencao', label:'Fogão Residencial — Manutenção' },
  { value:'fogao_industrial_manutencao', label:'Fogão Industrial — Manutenção' },
] as const;

