
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
import { Client } from '@/types';

interface DeleteClientDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  client: Client | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

const DeleteClientDialog: React.FC<DeleteClientDialogProps> = ({
  isOpen,
  setIsOpen,
  client,
  onConfirm,
  isDeleting
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
          <AlertDialogDescription>
            {client && (
              <>
                Tem certeza que deseja excluir o cliente <strong>{client.name}</strong>?
                {isDeleting ? (
                  <div className="mt-2 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                    Excluindo...
                  </div>
                ) : (
                  <div className="mt-2">
                    Esta ação não poderá ser desfeita. O cliente será permanentemente removido.
                  </div>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteClientDialog;
