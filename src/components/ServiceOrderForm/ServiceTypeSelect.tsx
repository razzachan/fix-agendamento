
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormValues } from './types';

// Lista de sugestões de serviços comuns
const SERVICE_TYPES = [
  "Reparo de Computador",
  "Reparo de Laptop",
  "Reparo de Celular",
  "Fogão Indução",
  "Fogão à Gás",
  "Adega Climatizada",
  "Forno Elétrico Embutido",
  "Forno Elétrico Bancada",
  "Microondas Embutido",
  "Microondas Bancada",
  "Maquina Lava e Seca",
  "Maquina de Lavar",
  "Secadora",
  "Configuração de Rede",
  "Recuperação de Dados",
  "Remoção de Vírus",
  "Atualização de Hardware",
  "Manutenção Preventiva",
  "Suporte Técnico"
];

interface ServiceTypeSelectProps {
  form: UseFormReturn<FormValues>;
  index: number;
}

const ServiceTypeSelect: React.FC<ServiceTypeSelectProps> = ({ form, index }) => {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue(`serviceItems.${index}.serviceType`, value);
    
    // Filtra as sugestões com base no texto digitado
    const filtered = SERVICE_TYPES.filter(type => 
      type.toLowerCase().includes(value.toLowerCase())
    );
    
    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0 && value.length > 0);
  };

  const handleSuggestionClick = (suggestion: string) => {
    form.setValue(`serviceItems.${index}.serviceType`, suggestion);
    setShowSuggestions(false);
  };

  return (
    <FormField
      control={form.control}
      name={`serviceItems.${index}.serviceType`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-muted-foreground font-normal">Observação de Serviço (opcional)</FormLabel>
          <FormControl>
            <Input
              placeholder="Observação adicional sobre o serviço"
              {...field}
              onChange={handleInputChange}
              onFocus={() => {
                const value = form.getValues(`serviceItems.${index}.serviceType`) || '';
                if (value) {
                  const filtered = SERVICE_TYPES.filter(type => 
                    type.toLowerCase().includes(value.toLowerCase())
                  );
                  setFilteredSuggestions(filtered);
                  setShowSuggestions(filtered.length > 0);
                }
              }}
              onBlur={() => {
                // Pequeno delay para permitir que o clique na sugestão seja processado
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              suggestions={filteredSuggestions}
              showSuggestions={showSuggestions}
              onSuggestionClick={handleSuggestionClick}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ServiceTypeSelect;
