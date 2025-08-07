/**
 * 🎯 TIPOS DE CONVERSÕES GOOGLE ADS - ESTRATÉGIA INTELIGENTE
 * 
 * ✅ CONVERSÕES PADRONIZADAS (não uma para cada cliente)
 * ✅ CATEGORIAS ESTRATÉGICAS (para análise e otimização)
 * ✅ VALORES SEGMENTADOS (para ROI)
 */

// 🎯 CONVERSÕES PRINCIPAIS (FUNIL DE VENDAS)
export type MainConversionType = 
  | 'agendamento'           // Quando cliente agenda serviço
  | 'servico_concluido'     // Quando serviço é finalizado
  | 'pagamento_recebido';   // Quando pagamento é confirmado

// 🎯 CONVERSÕES POR CATEGORIA DE EQUIPAMENTO (BASEADO NOS SEUS GRUPOS REAIS DO GOOGLE ADS)
export type EquipmentConversionType =
  | 'microondas_agendamento'        // Microondas (2.119 impressões, 37 conversões)
  | 'fogao_gas_agendamento'         // Fogões à Gás (3.347 impressões, muito ativo)
  | 'maquina_lava_seca_agendamento' // Máquinas e Lava e Seca (3.676 impressões, 138 cliques)
  | 'coifas_agendamento'            // Coifas (1.837 impressões, 54 conversões)
  | 'forno_eletrico_agendamento'    // Forno Elétrico (823 impressões, 74 cliques)
  | 'lava_loucas_agendamento'       // Lava Louças (baixo volume)
  | 'adega_climatizada_agendamento' // Adega Climatizada (108 impressões, nicho)
  | 'outros_agendamento';           // Outros equipamentos não categorizados

// 🎯 CONVERSÕES POR FAIXA DE VALOR (ROI)
export type ValueConversionType = 
  | 'alto_valor'            // Serviços > R$ 800 (alta margem)
  | 'medio_valor'           // Serviços R$ 300-800 (padrão)
  | 'baixo_valor';          // Serviços < R$ 300 (volume)

// 🎯 CONVERSÕES POR SITE (MÚLTIPLOS NEGÓCIOS)
export type SiteConversionType = 
  | 'fixfogoes_agendamento'   // Agendamentos Fix Fogões
  | 'fixeletros_agendamento'; // Agendamentos Fix Eletros

// 🎯 TIPO UNIFICADO
export type ConversionType = 
  | MainConversionType 
  | EquipmentConversionType 
  | ValueConversionType 
  | SiteConversionType;

// 🎯 MAPEAMENTO DE EQUIPAMENTOS PARA CATEGORIAS (BASEADO NOS SEUS GRUPOS REAIS)
export const EQUIPMENT_CATEGORY_MAP: Record<string, EquipmentConversionType> = {
  // Microondas (seu grupo mais ativo - 37 conversões)
  'microondas': 'microondas_agendamento',
  'micro-ondas': 'microondas_agendamento',
  'micro ondas': 'microondas_agendamento',
  'midea': 'microondas_agendamento', // Marca comum de microondas

  // Fogões à Gás (grupo principal - muito ativo)
  'fogao': 'fogao_gas_agendamento',
  'fogão': 'fogao_gas_agendamento',
  'fogao a gas': 'fogao_gas_agendamento',
  'fogão à gás': 'fogao_gas_agendamento',
  'fogao 4 bocas': 'fogao_gas_agendamento',
  'fogao 6 bocas': 'fogao_gas_agendamento',
  'fogão 4 bocas': 'fogao_gas_agendamento',
  'fogão 6 bocas': 'fogao_gas_agendamento',
  'fischer': 'fogao_gas_agendamento',
  'brastemp': 'fogao_gas_agendamento',
  'consul': 'fogao_gas_agendamento',

  // Máquinas e Lava e Seca (3.676 impressões, 138 cliques)
  'maquina de lavar': 'maquina_lava_seca_agendamento',
  'máquina de lavar': 'maquina_lava_seca_agendamento',
  'lavadora': 'maquina_lava_seca_agendamento',
  'lava e seca': 'maquina_lava_seca_agendamento',
  'tanquinho': 'maquina_lava_seca_agendamento',
  'secadora': 'maquina_lava_seca_agendamento',

  // Coifas (1.837 impressões, 54 conversões)
  'coifa': 'coifas_agendamento',
  'coifas': 'coifas_agendamento',
  'depurador': 'coifas_agendamento',
  'exaustor': 'coifas_agendamento',
  'coifa industrial': 'coifas_agendamento',

  // Forno Elétrico (823 impressões, 74 cliques)
  'forno': 'forno_eletrico_agendamento',
  'forno eletrico': 'forno_eletrico_agendamento',
  'forno elétrico': 'forno_eletrico_agendamento',
  'forno de embutir': 'forno_eletrico_agendamento',

  // Lava Louças (baixo volume)
  'lava louças': 'lava_loucas_agendamento',
  'lava-louças': 'lava_loucas_agendamento',
  'lavavajillas': 'lava_loucas_agendamento',

  // Adega Climatizada (108 impressões, nicho)
  'adega': 'adega_climatizada_agendamento',
  'adega climatizada': 'adega_climatizada_agendamento',
  
  // Lava-louças e outros
  'lava louças': 'outros_agendamento',
  'lava-louças': 'outros_agendamento',
  'lavavajillas': 'outros_agendamento',
  'midea': 'outros_agendamento',

  // Micro-ondas
  'microondas': 'outros_agendamento',
  'micro-ondas': 'outros_agendamento',
  'micro ondas': 'outros_agendamento',

  // Coifa e depurador
  'coifa': 'outros_agendamento',
  'depurador': 'outros_agendamento',
  'exaustor': 'outros_agendamento',

  // Ar condicionado
  'ar condicionado': 'outros_agendamento',
  'split': 'outros_agendamento',
  'janela': 'outros_agendamento',

  // Marcas gerais (podem ser qualquer equipamento)
  'electrolux': 'outros_agendamento',
  'whirlpool': 'outros_agendamento',
  'ge': 'outros_agendamento',
  'samsung': 'outros_agendamento',
  'lg': 'outros_agendamento'
};

// 🎯 MAPEAMENTO DE VALORES PARA CATEGORIAS
export const VALUE_CATEGORY_MAP = {
  alto_valor: { min: 800, max: Infinity },
  medio_valor: { min: 300, max: 799 },
  baixo_valor: { min: 0, max: 299 }
};

// 🎯 FUNÇÃO PARA DETERMINAR CATEGORIA DE EQUIPAMENTO
export function getEquipmentCategory(equipmentDescription: string): EquipmentConversionType {
  const description = equipmentDescription.toLowerCase().trim();
  
  // Buscar por palavras-chave
  for (const [keyword, category] of Object.entries(EQUIPMENT_CATEGORY_MAP)) {
    if (description.includes(keyword.toLowerCase())) {
      return category;
    }
  }
  
  // Fallback para outros
  return 'outros_agendamento';
}

// 🎯 FUNÇÃO PARA DETERMINAR CATEGORIA DE VALOR
export function getValueCategory(value: number): ValueConversionType {
  if (value >= VALUE_CATEGORY_MAP.alto_valor.min) {
    return 'alto_valor';
  } else if (value >= VALUE_CATEGORY_MAP.medio_valor.min) {
    return 'medio_valor';
  } else {
    return 'baixo_valor';
  }
}

// 🎯 FUNÇÃO PARA DETERMINAR CATEGORIA DE SITE
export function getSiteCategory(siteDomain: string): SiteConversionType {
  if (siteDomain?.includes('fixfogoes.com.br')) {
    return 'fixfogoes_agendamento';
  } else if (siteDomain?.includes('fixeletros.com.br')) {
    return 'fixeletros_agendamento';
  } else {
    return 'fixeletros_agendamento'; // Fallback
  }
}

// 🎯 NOMES DAS CONVERSÕES NO GOOGLE ADS (PADRONIZADOS)
export const GOOGLE_ADS_CONVERSION_NAMES: Record<ConversionType, string> = {
  // Principais
  'agendamento': 'Agendamento',
  'servico_concluido': 'Servico_Concluido', 
  'pagamento_recebido': 'Pagamento_Recebido',
  
  // Por equipamento
  'fogao_agendamento': 'Fogao_Agendamento',
  'geladeira_agendamento': 'Geladeira_Agendamento',
  'lavadora_agendamento': 'Lavadora_Agendamento', 
  'forno_agendamento': 'Forno_Agendamento',
  'cooktop_agendamento': 'Cooktop_Agendamento',
  'outros_agendamento': 'Outros_Agendamento',
  
  // Por valor
  'alto_valor': 'Alto_Valor',
  'medio_valor': 'Medio_Valor',
  'baixo_valor': 'Baixo_Valor',
  
  // Por site
  'fixfogoes_agendamento': 'FixFogoes_Agendamento',
  'fixeletros_agendamento': 'FixEletros_Agendamento'
};

// 🎯 DADOS DETALHADOS DO CLIENTE E EQUIPAMENTO
export interface DetailedConversionData {
  // Dados do equipamento
  equipmentBrand?: string;           // Marca: Fischer, Brastemp, Consul, etc
  equipmentModel?: string;           // Modelo específico
  equipmentAge?: string;             // Idade do equipamento
  equipmentCondition?: string;       // Estado: novo, usado, muito usado

  // Problema reportado
  problemDescription?: string;       // Descrição do problema
  problemCategory?: ProblemCategory; // Categoria do problema
  problemSeverity?: 'baixa' | 'media' | 'alta' | 'critica';

  // Dados do cliente
  clientName?: string;
  clientPhone?: string;
  clientCity?: string;
  clientNeighborhood?: string;
  clientType?: 'residencial' | 'comercial' | 'industrial';

  // Dados do serviço
  serviceType?: 'diagnostico' | 'conserto' | 'manutencao' | 'instalacao';
  serviceUrgency?: 'normal' | 'urgente' | 'emergencia';
  serviceComplexity?: 'simples' | 'medio' | 'complexo';

  // Dados comerciais
  initialCost?: number;
  finalCost?: number;
  profitMargin?: number;
  paymentMethod?: 'dinheiro' | 'pix' | 'cartao' | 'parcelado';

  // Dados do técnico
  technicianName?: string;
  technicianExperience?: 'junior' | 'pleno' | 'senior';

  // Dados de satisfação
  clientSatisfaction?: 1 | 2 | 3 | 4 | 5;
  wouldRecommend?: boolean;

  // Dados de origem
  leadSource?: 'google_ads' | 'whatsapp' | 'indicacao' | 'site' | 'telefone';
  campaignName?: string;
  adGroupName?: string;
  keyword?: string;
}

// 🎯 CATEGORIAS DE PROBLEMAS COMUNS
export type ProblemCategory =
  | 'nao_liga'              // Não liga/acende
  | 'nao_esquenta'          // Não esquenta (microondas/forno)
  | 'nao_gela'              // Não gela (geladeira)
  | 'nao_lava'              // Não lava (máquina)
  | 'vazamento'             // Vazamentos
  | 'ruido_excessivo'       // Ruído/barulho
  | 'nao_centrifuga'        // Não centrifuga (máquina)
  | 'porta_nao_fecha'       // Porta não fecha
  | 'display_com_problema'  // Display/painel
  | 'cheiro_gas'            // Cheiro de gás
  | 'superaquecimento'      // Superaquecimento
  | 'outros';               // Outros problemas

// 🎯 DADOS QUE O GOOGLE ADS ACEITA (LIMITAÇÕES DA PLATAFORMA)
export interface GoogleAdsConversionData {
  conversionName: string;    // Nome da conversão (ex: "Microondas_Agendamento")
  conversionValue: number;   // Valor em R$
  currency: 'BRL';          // Moeda brasileira
  gclid: string;            // Google Click ID (obrigatório)
  conversionTime: string;   // Timestamp ISO
  orderId: string;          // ID da ordem de serviço (deduplicação)
}

// 🎯 DADOS DETALHADOS PARA NOSSO BANCO (ANÁLISE INTERNA)
export interface DetailedConversionAnalytics {
  // Dados do equipamento (para análise interna)
  equipmentBrand?: string;           // Fischer, Brastemp, Consul
  equipmentModel?: string;           // Modelo específico
  equipmentAge?: string;             // Idade aproximada

  // Problema (para análise de padrões)
  problemDescription?: string;       // Descrição do problema
  problemCategory?: 'nao_liga' | 'nao_esquenta' | 'vazamento' | 'ruido' | 'outros';

  // Cliente (para segmentação)
  clientCity?: string;
  clientType?: 'residencial' | 'comercial';

  // Serviço (para análise de rentabilidade)
  serviceType?: 'diagnostico' | 'conserto' | 'manutencao';
  initialCost?: number;
  finalCost?: number;
  profitMargin?: number;

  // Origem (para análise de canais)
  leadSource?: 'google_ads' | 'whatsapp' | 'indicacao';
  campaignName?: string;
  adGroupName?: string;
}

// 🎯 ESTRATÉGIA DE CONVERSÕES (SIMPLES PARA GOOGLE ADS)
export interface ConversionStrategy {
  primary: MainConversionType;           // Conversão principal
  equipment?: EquipmentConversionType;   // Categoria do equipamento
  value?: ValueConversionType;           // Categoria do valor
  site?: SiteConversionType;             // Categoria do site
}

// 🎯 FUNÇÃO PARA GERAR ESTRATÉGIA DE CONVERSÕES
export function generateConversionStrategy(
  equipmentDescription: string,
  value: number,
  siteDomain: string
): ConversionStrategy {
  return {
    primary: 'agendamento',
    equipment: getEquipmentCategory(equipmentDescription),
    value: getValueCategory(value),
    site: getSiteCategory(siteDomain)
  };
}
