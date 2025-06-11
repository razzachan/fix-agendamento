
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { Save, X, Loader2 } from 'lucide-react';
import { ClientBasicInfoFields } from './';
import { ClientAddressFields } from './';
import AddressSearchSection from '../address/AddressSearchSection';
import { ClientFormValues } from '../schema/clientSchema';

interface ClientEditSheetFormProps {
  form: UseFormReturn<ClientFormValues>;
  onSubmit: (data: ClientFormValues) => Promise<void>;
  isSaving: boolean;
  onClose: () => void;
  fullAddress: string;
  setFullAddress: (address: string) => void;
  updateAddressFields: (address: string, city?: string, state?: string, zipCode?: string) => void;
  mapboxToken: string;
  setMapboxToken: (token: string) => void;
  showTokenInput: boolean;
  saveMapboxToken: () => void;
  removeMapboxToken: () => void;
  isTokenLoading: boolean;
}

const ClientEditSheetForm: React.FC<ClientEditSheetFormProps> = ({
  form,
  onSubmit,
  isSaving,
  onClose,
  fullAddress,
  setFullAddress,
  updateAddressFields,
  mapboxToken,
  setMapboxToken,
  showTokenInput,
  saveMapboxToken,
  removeMapboxToken,
  isTokenLoading,
}) => {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <ClientBasicInfoFields form={form} />
        
        {/* Campo de busca de endereço */}
        <AddressSearchSection
          fullAddress={fullAddress}
          setFullAddress={setFullAddress}
          updateAddressFields={updateAddressFields}
          mapboxToken={mapboxToken}
          setMapboxToken={setMapboxToken}
          showTokenInput={showTokenInput}
          saveMapboxToken={saveMapboxToken}
          removeMapboxToken={removeMapboxToken}
          isTokenLoading={isTokenLoading}
          disabled={isSaving}
        />
        
        <ClientAddressFields form={form} />
        
        <SheetFooter className="pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
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
        </SheetFooter>
      </form>
    </Form>
  );
};

export default ClientEditSheetForm;
