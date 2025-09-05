
import React, { useState } from 'react';
import { Technician } from '@/types';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil, Wrench, Loader2 } from 'lucide-react';

interface TechniciansTableProps {
  technicians: Technician[];
  isAdmin: boolean;
  onEdit: (technician: Technician) => void;
  onDelete: (id: string) => void;
  onUpdateWeight?: (id: string, weight: number) => Promise<void> | void;
  isLoading?: boolean;
}

const TechniciansTable: React.FC<TechniciansTableProps> = ({
  technicians,
  isAdmin,
  onEdit,
  onDelete,
  onUpdateWeight,
  isLoading = false
}) => {
  const [pendingWeights, setPendingWeights] = useState<Record<string, number>>({});
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Wrench className="h-12 w-12 mb-2 text-primary/50" />
        <p className="text-lg font-medium">Nenhum técnico cadastrado</p>
        <p className="text-sm">Adicione um novo técnico para começar.</p>
      </div>
    );
  }

  const sorted = [...technicians].sort((a,b)=>((b as any).weight ?? 0) - ((a as any).weight ?? 0));
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Especialidades</TableHead>
          <TableHead>Prioridade</TableHead>
          {isAdmin && <TableHead className="text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((technician) => (
          <TableRow key={technician.id}>
            <TableCell className="font-medium">{technician.name}</TableCell>
            <TableCell>{technician.email}</TableCell>
            <TableCell>{technician.phone || '-'}</TableCell>
            <TableCell>
              {technician.specialties && technician.specialties.length > 0
                ? technician.specialties.join(', ')
                : "-"}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 rounded bg-muted hover:bg-muted/80"
                  onClick={(e)=>{
                    e.preventDefault(); e.stopPropagation();
                    const curr = pendingWeights[technician.id] ?? ((technician as any).weight ?? 0);
                    setPendingWeights(prev=>({ ...prev, [technician.id]: curr + 10 }));
                  }}
                >
                  +10
                </button>
                <span className="text-sm text-muted-foreground min-w-[2ch] text-center">
                  {pendingWeights[technician.id] ?? ((technician as any).weight ?? 0)}
                </span>
                <button
                  className="px-2 py-1 rounded bg-muted hover:bg-muted/80"
                  onClick={(e)=>{
                    e.preventDefault(); e.stopPropagation();
                    const curr = pendingWeights[technician.id] ?? ((technician as any).weight ?? 0);
                    const next = Math.max(0, curr - 10);
                    setPendingWeights(prev=>({ ...prev, [technician.id]: next }));
                  }}
                >
                  -10
                </button>
                <button
                  className="px-2 py-1 rounded bg-primary text-white hover:opacity-90"
                  onClick={async (e)=>{
                    e.preventDefault(); e.stopPropagation();
                    const val = pendingWeights[technician.id] ?? ((technician as any).weight ?? 0);
                    if (onUpdateWeight) {
                      await onUpdateWeight(technician.id, val);
                    } else {
                      onEdit({ ...technician, weight: val } as any);
                    }
                  }}
                >
                  Salvar
                </button>
              </div>
            </TableCell>
            {isAdmin && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600"
                    onClick={() => onEdit(technician)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDelete(technician.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TechniciansTable;
