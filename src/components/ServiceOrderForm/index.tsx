
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { formSchema } from './types';
import ClientInfoSection from './ClientInfoSection';
import ServiceItemsSection from './ServiceItemsSection';
import { SchedulingProvider } from './Scheduling/SchedulingContext';
import SchedulingSection from './Scheduling/SchedulingSection';
import LoadingIndicator from './Scheduling/LoadingIndicator';
import FormActions from './FormActions';
import { getFormDefaults } from './utils/formDefaults';
import { useFormSubmissionHandler } from './utils/formSubmissionHandler';

interface ServiceOrderFormProps {
  onSubmit: (data: Partial<ServiceOrder>) => Promise<ServiceOrder | null>;
  onCancel: () => void;
  initialValues?: ServiceOrder;
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({ onSubmit, onCancel, initialValues }) => {
  const { handleSubmit: processFormSubmit } = useFormSubmissionHandler();
  
  console.log('ServiceOrderForm received initialValues:', initialValues);
  
  // Convert initialValues to match form schema structure
  const defaultValues = React.useMemo(() => {
    if (!initialValues) return getFormDefaults();
    
    // Generate a log to check what service attendance type we have
    console.log(`Initial service attendance type from DB: "${initialValues.serviceAttendanceType}"`);
    
    // Ensure we have a valid serviceAttendanceType
    const validAttendanceType = initialValues.serviceAttendanceType && 
      ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(initialValues.serviceAttendanceType)
      ? initialValues.serviceAttendanceType
      : 'em_domicilio';
      
    console.log(`Using attendance type: "${validAttendanceType}" for form initialization`);
    
    return {
      ...initialValues,
      clientName: initialValues.clientName || '',
      clientPhone: initialValues.clientPhone || '',
      clientEmail: initialValues.clientEmail || '',
      clientCpfCnpj: initialValues.clientCpfCnpj || '',
      clientAddressComplement: initialValues.clientAddressComplement || '',
      clientAddressReference: initialValues.clientAddressReference || '',
      clientFullAddress: initialValues.pickupAddress || initialValues.clientFullAddress || '',
      clientCity: initialValues.pickupCity || initialValues.clientCity || '',
      clientState: initialValues.pickupState || initialValues.clientState || '',
      clientZipCode: initialValues.pickupZipCode || initialValues.clientZipCode || '',
      equipmentType: initialValues.equipmentType || '',
      description: initialValues.description || '',
      scheduledDate: initialValues.scheduledDate ? new Date(initialValues.scheduledDate).toISOString().split('T')[0] : '',
      scheduledTime: typeof initialValues.scheduledTime === 'string' ? initialValues.scheduledTime : '',
      // Mapear items de serviço se disponíveis
      serviceItems: initialValues.serviceItems?.map(item => ({
        ...item,
        serviceOrderId: item.serviceOrderId || initialValues.id || '',
        serviceType: item.serviceType || '',
        serviceValue: item.serviceValue || '',
        serviceAttendanceType: item.serviceAttendanceType || validAttendanceType,
        equipmentType: item.equipmentType || initialValues.equipmentType || '',
        equipmentModel: item.equipmentModel || initialValues.equipmentModel || '',
        equipmentSerial: item.equipmentSerial || initialValues.equipmentSerial || '',
        clientDescription: item.clientDescription || initialValues.clientDescription || '',
      })) || [{
        id: crypto.randomUUID(),
        serviceOrderId: initialValues.id || '',
        serviceType: '',
        serviceAttendanceType: validAttendanceType,
        equipmentType: initialValues.equipmentType || '',
        equipmentModel: initialValues.equipmentModel || '',
        equipmentSerial: initialValues.equipmentSerial || '',
        clientDescription: initialValues.clientDescription || '',
        serviceValue: '',
      }],
      // Ensure status is one of the allowed values in the form schema
      status: (initialValues.status as ServiceOrderStatus) || 'scheduled'
    };
  }, [initialValues]);
  
  console.log('Form initialized with values:', defaultValues);
  console.log('Service items attendance types:', 
    defaultValues.serviceItems?.map(item => item.serviceAttendanceType) || []
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onBlur', // Update to onBlur mode to avoid too many rerenders
  });
  
  // Reset the form when initialValues change
  useEffect(() => {
    if (initialValues) {
      console.log('Resetting form with values:', defaultValues);
      form.reset(defaultValues);
    }
  }, [initialValues, form, defaultValues]);

  const onFormSubmit = async (values: any) => {
    console.log('Form submitted with values:', values);
    console.log('Service attendance type before submission:', values.serviceItems?.[0]?.serviceAttendanceType);
    await processFormSubmit(values, onSubmit);
  };

  // Prevent default form behavior
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit(onFormSubmit)(e);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6 overflow-y-auto">
        <ClientInfoSection form={form} />
        <ServiceItemsSection form={form} />
        <SchedulingProvider>
          <div className="space-y-4">
            <SchedulingSection />
            <LoadingIndicator />
          </div>
        </SchedulingProvider>

        <FormActions onCancel={onCancel} />
      </form>
    </Form>
  );
};

export default ServiceOrderForm;
