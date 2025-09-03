export type ToolDef = {
  name: string;
  label: string;
};

export const toolsCatalog: ToolDef[] = [
  { name: 'getAvailability', label: 'Consultar disponibilidade' },
  { name: 'createAppointment', label: 'Criar agendamento' },
  { name: 'cancelAppointment', label: 'Cancelar agendamento' },
  { name: 'buildQuote', label: 'Estimar orçamento' },
  { name: 'getOrderStatus', label: 'Ver status da OS' },
];

