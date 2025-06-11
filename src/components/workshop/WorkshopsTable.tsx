
import React from 'react';
import { User } from '@/types';
import { Table, TableHeader, TableRow, TableHead, TableBody } from '@/components/ui/table';
import WorkshopTableRow from './WorkshopTableRow';
import { Loader2, Factory } from 'lucide-react';

interface WorkshopsTableProps {
  workshops: User[];
  onDelete: (id: string) => Promise<boolean>;
  onEdit: (workshop: User) => void;
  isLoading: boolean;
}

const WorkshopsTable: React.FC<WorkshopsTableProps> = ({
  workshops,
  onDelete,
  onEdit,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (workshops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Factory className="h-12 w-12 mb-2 text-amber-600/50" />
        <p className="text-lg font-medium">Nenhuma oficina cadastrada</p>
        <p className="text-sm">Adicione uma nova oficina para começar.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Endereço</TableHead>
          <TableHead>Cidade</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workshops.map((workshop) => (
          <WorkshopTableRow 
            key={workshop.id} 
            workshop={workshop} 
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default WorkshopsTable;
