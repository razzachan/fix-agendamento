
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AgendamentoAI } from '@/services/agendamentos';
import { sampleAgendamentos } from './utils/sampleData';

interface UseSchedulesFiltersProps {
  agendamentos: AgendamentoAI[];
}

export const useSchedulesFilters = ({ agendamentos }: UseSchedulesFiltersProps) => {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTechnician, setSelectedTechnician] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all"); // Mostrar todos os status por padrão
  const [selectedUrgency, setSelectedUrgency] = useState<string>("all"); // Mostrar todas as urgências por padrão
  const [searchQuery, setSearchQuery] = useState<string>(""); // Busca por texto
  const [filteredAgendamentos, setFilteredAgendamentos] = useState<AgendamentoAI[]>([]);

  // Apply filters
  useEffect(() => {
    // Se não tiver agendamentos reais, use os dados de exemplo
    let dataToFilter = agendamentos && agendamentos.length > 0
      ? [...agendamentos]
      : [...sampleAgendamentos];

    let filtered = dataToFilter;

    // Filter by date only if a date is selected
    if (selectedDate) {
      filtered = filtered.filter(agendamento => {
        const agendamentoDate = format(new Date(agendamento.created_at), 'yyyy-MM-dd');
        return agendamentoDate === selectedDate;
      });
    }

    // Filter by technician
    if (selectedTechnician && selectedTechnician !== "all") {
      filtered = filtered.filter(agendamento => agendamento.tecnico === selectedTechnician);
    }

    // Filter by status
    if (selectedStatus && selectedStatus !== "all") {
      filtered = filtered.filter(agendamento => agendamento.status === selectedStatus);
    }

    // Filter by urgency
    if (selectedUrgency && selectedUrgency !== "all") {
      filtered = filtered.filter(agendamento => {
        // Convert string 'true'/'false' to boolean for comparison
        const isUrgent = selectedUrgency === 'true';
        return agendamento.urgente === isUrgent;
      });
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(agendamento => {
        // Buscar em vários campos
        const nomeMatch = agendamento.nome?.toLowerCase().includes(query) || false;
        const enderecoMatch = agendamento.endereco?.toLowerCase().includes(query) || false;
        const equipamentoMatch = agendamento.equipamento?.toLowerCase().includes(query) || false;
        const problemaMatch = agendamento.problema?.toLowerCase().includes(query) || false;
        const telefoneMatch = agendamento.telefone?.toLowerCase().includes(query) || false;
        const tecnicoMatch = agendamento.tecnico?.toLowerCase().includes(query) || false;

        return nomeMatch || enderecoMatch || equipamentoMatch || problemaMatch || telefoneMatch || tecnicoMatch;
      });
    }

    setFilteredAgendamentos(filtered);
  }, [selectedDate, selectedTechnician, selectedStatus, selectedUrgency, searchQuery, agendamentos]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleClearDateFilter = () => {
    setSelectedDate("");
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
  };

  const handleTechnicianChange = (value: string) => {
    setSelectedTechnician(value);
  };

  const handleUrgencyChange = (value: string) => {
    setSelectedUrgency(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearchFilter = () => {
    setSearchQuery("");
  };

  // Get unique technicians from the agendamentos data
  const getTechnicians = () => {
    const allAgendamentos = agendamentos && agendamentos.length > 0
      ? agendamentos
      : sampleAgendamentos;

    const technicians = new Set<string>();
    allAgendamentos.forEach(agendamento => {
      if (agendamento.tecnico) {
        technicians.add(agendamento.tecnico);
      }
    });

    return Array.from(technicians);
  };

  return {
    selectedDate,
    selectedTechnician,
    selectedStatus,
    selectedUrgency,
    searchQuery,
    filteredAgendamentos,
    handleDateChange,
    handleStatusChange,
    handleTechnicianChange,
    handleUrgencyChange,
    handleSearchChange,
    handleClearDateFilter,
    handleClearSearchFilter,
    getTechnicians
  };
};

export default useSchedulesFilters;
