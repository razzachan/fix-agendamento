
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isDeleting: boolean;
  onConfirm: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  setIsOpen,
  isDeleting,
  onConfirm
}) => {
  // Handle confirmation without event prevention to avoid issues
  const handleConfirm = () => {
    onConfirm();
  };

  // Simple handle cancel to close dialog
  const handleCancel = () => {
    if (!isDeleting) {
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <div className="flex justify-between items-start">
          <AlertDialogHeader className="flex-1">
            <AlertDialogTitle>Confirmar arquivamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar esta ordem de serviço? Ela ficará invisível em todas as visualizações do sistema, mas os dados serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full" 
            onClick={handleCancel} 
            disabled={isDeleting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={handleCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Arquivando...
              </>
            ) : (
              'Arquivar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;
