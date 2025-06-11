
import React from 'react';
import { Loader2 } from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface DeleteAllClientsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onDeleteAll: () => Promise<void>;
  isDeleting: boolean;
  deleteStatus: string;
}

const DeleteAllClientsDialog: React.FC<DeleteAllClientsDialogProps> = ({
  isOpen,
  setIsOpen,
  onDeleteAll,
  isDeleting,
  deleteStatus
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão de todos os clientes</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir TODOS os clientes? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onDeleteAll} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {deleteStatus || 'Excluindo...'}
              </>
            ) : (
              'Excluir Todos'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAllClientsDialog;
