// Centraliza mensagens de saída passíveis de A/B test e ajustes incrementais
export const Copy = {
  greetingFallback: 'Olá! Sou da Fix. Prefere orçamento rápido ou já quer agendar?',
  askBudgetOrSchedule: 'Posso te ajudar com um orçamento rápido ou seguir direto para o agendamento. O que prefere?',
  schedulePickOption: 'Escolha uma opção (1, 2 ou 3) para confirmar o horário.',
  confirmSwitch: 'Quer trocar o equipamento? Responda SIM ou NÃO.',
};

export type CopyKey = keyof typeof Copy;

export function getCopy(key: CopyKey): string {
  return Copy[key];
}

