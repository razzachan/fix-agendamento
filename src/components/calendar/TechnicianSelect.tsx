
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Technician } from '@/types';

interface TechnicianSelectProps {
  technicians: Technician[];
  selectedTechnicianId: string;
  onSelect: (technicianId: string) => void;
}

const TechnicianSelect: React.FC<TechnicianSelectProps> = ({
  technicians,
  selectedTechnicianId,
  onSelect
}) => {
  return (
    <Select value={selectedTechnicianId} onValueChange={onSelect}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Filtrar por técnico" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os técnicos</SelectItem>
        {technicians.map((tech) => (
          <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TechnicianSelect;
