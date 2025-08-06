
import React from 'react';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <Input
          placeholder="Buscar por cliente, equipamento ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      
      <div className="w-full md:w-[200px]">
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Em Aberto</SelectItem>
            <SelectItem value="scheduled">Agendado</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="on_the_way">À Caminho</SelectItem>
            <SelectItem value="collected">Coletado</SelectItem>
            <SelectItem value="at_workshop">Na Oficina</SelectItem>
            <SelectItem value="diagnosis_completed">Diagnóstico Concluído</SelectItem>
            <SelectItem value="awaiting_quote_approval">Aguardando Aprovação do Orçamento</SelectItem>
            <SelectItem value="ready_for_delivery">Pronto para Entrega</SelectItem>
            <SelectItem value="delivery_scheduled">Entrega Agendada</SelectItem>
            <SelectItem value="collected_for_delivery">Coletado para Entrega</SelectItem>
            <SelectItem value="quote_approved">Orçamento Aprovado</SelectItem>
            <SelectItem value="ready_for_delivery">Pronto para Entrega</SelectItem>
            <SelectItem value="collected_for_delivery">Coletado para Entrega</SelectItem>
            <SelectItem value="on_the_way_to_deliver">À Caminho para Entrega</SelectItem>
            <SelectItem value="payment_pending">Pagamento Pendente</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SearchFilters;
