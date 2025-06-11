
import React from 'react';
import { Client } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Save, X, Loader2 } from 'lucide-react';
import { ClientBasicInfoFields, ClientAddressFields } from '@/components/clients/edit';
import { clientSchema, ClientFormValues } from '@/components/clients/schema/clientSchema';

interface ClientEditFormProps {
  client: Client;
  onSave: (data: Client) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const ClientEditForm: React.FC<ClientEditFormProps> = ({
  client,
  onSave,
  onCancel,
  isSaving,
}) => {
  // Form setup with zod resolver
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      id: client.id,
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zipCode: client.zipCode || '',
    },
  });

  const handleSubmit = async (data: ClientFormValues) => {
    await onSave(data as Client);
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-4 pt-6">
            <ClientBasicInfoFields form={form} />
            <ClientAddressFields form={form} />
          </CardContent>
          
          <CardFooter className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="gap-1"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default ClientEditForm;
