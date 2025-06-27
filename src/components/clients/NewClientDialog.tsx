import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Loader2, X } from 'lucide-react';
import { ClientBasicInfoFields, ClientAddressFields } from '@/components/clients/edit';
import { clientSchema, ClientFormValues } from '@/components/clients/schema/clientSchema';
import { Client } from '@/types';

interface NewClientDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onCreateClient: (data: Omit<Client, 'id'>) => Promise<void>;
  isCreating: boolean;
}

const NewClientDialog: React.FC<NewClientDialogProps> = ({
  isOpen,
  setIsOpen,
  onCreateClient,
  isCreating,
}) => {
  // Form setup with zod resolver
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpfCnpj: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  const handleSubmit = async (data: ClientFormValues) => {
    try {
      await onCreateClient(data as Omit<Client, 'id'>);
      form.reset();
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Novo Cliente</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Básicas</h3>
              <ClientBasicInfoFields form={form} />
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Endereço</h3>
              <ClientAddressFields form={form} />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Cliente'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewClientDialog;
