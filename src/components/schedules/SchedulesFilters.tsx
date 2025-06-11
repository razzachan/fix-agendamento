
import React from 'react';
import { Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgendamentoAI } from '@/services/agendamentos';

interface SchedulesFiltersProps {
  selectedDate: string;
  selectedTechnician: string;
  selectedStatus: string;
  selectedUrgency?: string;
  searchQuery?: string;
  handleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTechnicianChange: (value: string) => void;
  handleStatusChange: (value: string) => void;
  handleUrgencyChange?: (value: string) => void;
  handleSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClearDateFilter: () => void;
  handleClearSearchFilter?: () => void;
  technicians: string[];
}

const SchedulesFilters: React.FC<SchedulesFiltersProps> = ({
  selectedDate,
  selectedTechnician,
  selectedStatus,
  selectedUrgency = 'all',
  searchQuery = '',
  handleDateChange,
  handleTechnicianChange,
  handleStatusChange,
  handleUrgencyChange = () => {},
  handleSearchChange = () => {},
  handleClearDateFilter,
  handleClearSearchFilter = () => {},
  technicians
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
      {/* Campo de busca - ocupa 4 colunas */}
      <div className="flex items-center space-x-2 md:col-span-4">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-2.5 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Buscar cliente, endereço, problema..."
          />
          {searchQuery && (
            <button
              onClick={handleClearSearchFilter}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Data - ocupa 2 colunas */}
      <div className="flex items-center space-x-2 md:col-span-2">
        <label className="text-sm font-medium">Data:</label>
        <div className="flex-1 relative">
          <span className="absolute left-3 top-2.5 text-gray-500">
            <Calendar size={16} />
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="w-full pl-10 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Todos os dias"
          />
          {selectedDate && (
            <button
              onClick={handleClearDateFilter}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              title="Limpar filtro de data"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Técnico - ocupa 2 colunas */}
      <div className="flex items-center space-x-2 md:col-span-2">
        <label className="text-sm font-medium">Técnico:</label>
        <Select value={selectedTechnician} onValueChange={handleTechnicianChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os técnicos</SelectItem>
            {technicians.map(tech => (
              <SelectItem key={tech} value={tech}>{tech}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status - ocupa 2 colunas */}
      <div className="flex items-center space-x-2 md:col-span-2">
        <label className="text-sm font-medium">Status:</label>
        <Select value={selectedStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="reagendado">Reagendado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="roteirizado">Roteirizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Urgência - ocupa 2 colunas */}
      <div className="flex items-center space-x-2 md:col-span-2">
        <label className="text-sm font-medium">Urgência:</label>
        <Select value={selectedUrgency} onValueChange={handleUrgencyChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="true">Urgente</SelectItem>
            <SelectItem value="false">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SchedulesFilters;
