
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

interface DeleteAllDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onDeleteAll: () => Promise<void>;
  isDeleting: boolean;
  deleteStatus: string;
}

const DeleteAllDialog: React.FC<DeleteAllDialogProps> = ({
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
          <AlertDialogTitle>Confirmar arquivamento de TODOS os dados</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja arquivar TODAS as ordens de serviço? Esta ação não pode ser desfeita, mas os dados serão preservados no banco de dados.
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
                {deleteStatus || 'Arquivando...'}
              </>
            ) : (
              'Arquivar Tudo'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAllDialog;
