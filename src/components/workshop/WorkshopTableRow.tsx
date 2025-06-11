
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { User } from '@/types';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, 
         AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, 
         AlertDialogAction, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface WorkshopTableRowProps {
  workshop: User;
  onDelete: (id: string) => Promise<boolean>;
  onEdit: (workshop: User) => void;
}

const WorkshopTableRow: React.FC<WorkshopTableRowProps> = ({
  workshop,
  onDelete,
  onEdit
}) => {
  const handleDelete = async () => {
    try {
      const success = await onDelete(workshop.id);
      
      if (success) {
        toast.success('Oficina removida com sucesso', {
          description: `A oficina "${workshop.name}" foi excluída do sistema.`
        });
      } else {
        toast.error('Erro ao remover oficina', {
          description: 'Não foi possível excluir a oficina do banco de dados.'
        });
      }
    } catch (error) {
      console.error('Error deleting workshop:', error);
      toast.error('Erro ao remover oficina', {
        description: 'Ocorreu um erro ao tentar excluir a oficina. Tente novamente.'
      });
    }
  };

  return (
    <TableRow key={workshop.id}>
      <TableCell className="font-medium">{workshop.name}</TableCell>
      <TableCell>{workshop.email}</TableCell>
      <TableCell>{workshop.phone || '-'}</TableCell>
      <TableCell>{workshop.address || '-'}</TableCell>
      <TableCell>{workshop.city || '-'}</TableCell>
      <TableCell>{workshop.state || '-'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600"
            onClick={() => onEdit(workshop)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmação de exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir a oficina "{workshop.name}"? 
                  Esta ação não pode ser desfeita e removerá todos os dados associados, 
                  incluindo o login da oficina.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default WorkshopTableRow;
