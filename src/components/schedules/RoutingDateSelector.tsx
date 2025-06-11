import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Definição dos grupos logísticos
export type LogisticsGroup = 'A' | 'B' | 'C' | null;

interface RoutingDateSelectorProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  selectedGroup: LogisticsGroup;
  onGroupChange: (group: LogisticsGroup) => void;
}

const RoutingDateSelector: React.FC<RoutingDateSelectorProps> = ({
  selectedDate,
  onDateChange,
  selectedGroup,
  onGroupChange,
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Configurações de Roteirização</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Seletor de Data */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data da Rota</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={onDateChange}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <p className="text-xs text-muted-foreground">
                {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </div>

          {/* Seletor de Grupo Logístico */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Grupo Logístico</label>
            <Select
              value={selectedGroup || 'all'}
              onValueChange={(value) => onGroupChange(value === 'all' ? null : value as LogisticsGroup)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                <SelectItem value="A">Grupo A</SelectItem>
                <SelectItem value="B">Grupo B</SelectItem>
                <SelectItem value="C">Grupo C</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              {getGroupDescription(selectedGroup)}
            </div>
          </div>
        </div>

        {/* Informações sobre os grupos logísticos */}
        <div className="mt-6 bg-blue-50 p-3 rounded-md">
          <h3 className="text-sm font-medium text-blue-800">Sobre os Grupos Logísticos</h3>
          <p className="text-xs text-blue-700 mt-1">
            Os grupos logísticos são baseados na distância da sede (R. João Carlos de Souza, 292 - Santa Monica, Florianópolis):
          </p>
          <ul className="text-xs text-blue-700 mt-1 list-disc list-inside">
            <li><strong>Grupo A:</strong> Até 15 km da sede (Florianópolis e arredores)</li>
            <li><strong>Grupo B:</strong> De 15 a 40 km da sede (Grande Florianópolis)</li>
            <li><strong>Grupo C:</strong> Acima de 40 km da sede (Litoral Norte - Tijucas, Balneário Camboriú, Itajaí, etc.)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

// Função para obter a descrição do grupo logístico
function getGroupDescription(group: LogisticsGroup): string {
  switch (group) {
    case 'A':
      return 'Região central e norte da cidade, com maior densidade de clientes.';
    case 'B':
      return 'Região leste e sul, com distâncias médias e tráfego moderado.';
    case 'C':
      return 'Região oeste e áreas mais distantes, com maior tempo de deslocamento.';
    default:
      return 'Todos os grupos logísticos serão considerados.';
  }
}

export default RoutingDateSelector;
