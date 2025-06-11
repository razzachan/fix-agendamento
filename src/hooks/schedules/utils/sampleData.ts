
import { AgendamentoAI } from '@/services/agendamentos';

// Dados de exemplo para quando não houver agendamentos
export const sampleAgendamentos: AgendamentoAI[] = [
  {
    id: "1",
    nome: "João Silva",
    endereco: "Av. Paulista, 1000, São Paulo",
    equipamento: "Geladeira Brastemp",
    problema: "Não gela corretamente",
    urgente: true,
    status: "pendente",
    tecnico: "Carlos Mendes",
    created_at: new Date().toISOString(),
    data_agendada: new Date(Date.now() + 172800000).toISOString() // dois dias no futuro
  },
  {
    id: "2",
    nome: "Maria Oliveira",
    endereco: "Rua Augusta, 500, São Paulo",
    equipamento: "Máquina de lavar Electrolux",
    problema: "Vazamento de água",
    urgente: false,
    status: "pendente",
    tecnico: null,
    created_at: new Date(Date.now() - 86400000).toISOString(), // ontem
    data_agendada: null
  },
  {
    id: "3",
    nome: "Pedro Santos",
    endereco: "Rua Oscar Freire, 300, São Paulo",
    equipamento: "Fogão Continental",
    problema: "Não acende o forno",
    urgente: false,
    status: "confirmado",
    tecnico: "Ana Costa",
    created_at: new Date(Date.now() - 172800000).toISOString(), // dois dias atrás
    data_agendada: new Date(Date.now() + 86400000).toISOString() // um dia no futuro
  }
];
