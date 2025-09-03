import type { ChatMessage } from './llmClient.js';

export const toolCatalog = {
  getAvailability: {
    description: 'Obter disponibilidade de agenda para data/serviço',
    inputSchema: { type: 'object', properties: { date:{type:'string'}, service_type:{type:'string'}, region:{type:'string'}, duration:{type:'number'}, equipment:{type:'string'} }, required:['date'] }
  },
  createAppointment: {
    description: 'Criar agendamento',
    inputSchema: { type: 'object', properties: {
      client_name:{type:'string'}, start_time:{type:'string'}, end_time:{type:'string'},
      address:{type:'string'}, address_complement:{type:'string'},
      description:{type:'string'}, phone:{type:'string'}, region:{type:'string'}, equipment_type:{type:'string'},
      email:{type:'string'}, cpf:{type:'string'}
    }, required:['client_name','start_time','end_time'] }
  },
  cancelAppointment: {
    description: 'Cancelar agendamento',
    inputSchema: { type: 'object', properties: { id:{type:'string'}, reason:{type:'string'} }, required:['id'] }
  },
  buildQuote: {
    description: 'Estimar orçamento',
    inputSchema: { type: 'object', properties: {
      // chave principal (pode ser genérica; o runtime mapeia para mais específica)
      service_type:{type:'string'},
      region:{type:'string'}, urgency:{type:'string'},
      // contexto para mapeamento inteligente de preço
      equipment:{type:'string'}, // ex.: fogão, forno, micro-ondas, coifa
      power_type:{type:'string'}, // gás | indução | elétrico
      mount:{type:'string'}, // piso | cooktop | bancada | embutido
      num_burners:{type:'string'}, // 4 | 5 | 6 ... (texto livre)
      origin:{type:'string'}, // nacional | importado
      is_industrial:{type:'boolean'},
      brand:{type:'string'},
      problem:{type:'string'},
      segment:{type:'string'}, // basico | inox | premium
      class_level:{type:'string'} // para inox: basico | premium
    }, required:['service_type'] }
  },
  getOrderStatus: {
    description: 'Obter status da ordem de serviço por ID',
    inputSchema: { type: 'object', properties: { id:{type:'string'} }, required:['id'] }
  },
  aiScheduleStart: {
    description: 'Iniciar agendamento inteligente (ETAPA 1) usando middleware.py',
    inputSchema: { type: 'object', properties: {
      nome:{type:'string'}, endereco:{type:'string'}, equipamento:{type:'string'}, problema:{type:'string'}, telefone:{type:'string'}, urgente:{type:'boolean'}
    }, required:['equipamento','problema'] }
  },
  aiScheduleConfirm: {
    description: 'Confirmar agendamento inteligente (ETAPA 2) após cliente escolher 1/2/3',
    inputSchema: { type: 'object', properties: { opcao_escolhida:{type:'string', enum:['1','2','3']}, telefone:{type:'string'} }, required:['opcao_escolhida'] }
  }
} as const;

export type ToolName = keyof typeof toolCatalog;

export function makeToolGuide(){
  const lines = Object.entries(toolCatalog).map(([name,def])=>`- ${name}: ${def.description}`);
  return `Ferramentas disponíveis:\n${lines.join('\n')}\n\nSe precisar usar uma ferramenta, responda SOMENTE com JSON no formato:\n{"tool":"<nome>","input":{...}}\nSe faltar dado, peça as informações antes de chamar a ferramenta.`;
}

