
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

// Lista de sugestões de equipamentos comuns
const EQUIPMENT_TYPES = [
  "Computador Desktop",
  "Notebook",
  "Impressora",
  "Smartphone",
  "Tablet",
  "Servidor",
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
  "Geladeira",
  "Roteador/Modem",
  "Periférico",
  "Câmera",
  "Monitor"
];

interface EquipmentFieldsProps {
  form: UseFormReturn<FormValues>;
  index: number;
}

const EquipmentFields: React.FC<EquipmentFieldsProps> = ({ form, index }) => {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue(`serviceItems.${index}.equipmentType`, value);
    
    // Filtra as sugestões com base no texto digitado
    const filtered = EQUIPMENT_TYPES.filter(type => 
      type.toLowerCase().includes(value.toLowerCase())
    );
    
    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0 && value.length > 0);
  };

  const handleSuggestionClick = (suggestion: string) => {
    form.setValue(`serviceItems.${index}.equipmentType`, suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name={`serviceItems.${index}.equipmentType`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Equipamento</FormLabel>
            <FormControl>
              <Input
                placeholder="Digite o tipo de equipamento"
                {...field}
                onChange={handleInputChange}
                onFocus={() => {
                  const value = form.getValues(`serviceItems.${index}.equipmentType`) || '';
                  if (value) {
                    const filtered = EQUIPMENT_TYPES.filter(type => 
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

      <FormField
        control={form.control}
        name={`serviceItems.${index}.equipmentModel`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo do Equipamento</FormLabel>
            <FormControl>
              <Input
                placeholder="Modelo do equipamento"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`serviceItems.${index}.equipmentSerial`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Número de Série</FormLabel>
            <FormControl>
              <Input
                placeholder="Número de série"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default EquipmentFields;
