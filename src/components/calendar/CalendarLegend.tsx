import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LegendItem {
  status: string;
  label: string;
  description: string;
  color: string;
  icon: string;
}

const CalendarLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const legendItems: LegendItem[] = [
    {
      status: 'confirmed',
      label: 'Agendado',
      description: 'Serviço confirmado para coleta',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: '🔵'
    },
    {
      status: 'in_progress',
      label: 'Em Trânsito',
      description: 'Técnico em rota ou equipamento coletado',
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: '🟣'
    },
    {
      status: 'at_workshop',
      label: 'Na Oficina',
      description: 'Equipamento recebido na oficina',
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      icon: '🟠'
    },
    {
      status: 'diagnosis',
      label: 'Em Diagnóstico',
      description: 'Técnico realizando análise',
      color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      icon: '🔵'
    },
    {
      status: 'awaiting_approval',
      label: 'Aguardando Aprovação',
      description: 'Cliente deve aprovar orçamento',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: '🟡'
    },
    {
      status: 'in_repair',
      label: 'Em Reparo',
      description: 'Orçamento aprovado, reparo em andamento',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: '🟢'
    },
    {
      status: 'ready_delivery',
      label: 'Pronto p/ Entrega',
      description: 'Serviço finalizado, aguardando entrega',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      icon: '🔷'
    },
    {
      status: 'completed',
      label: 'Concluído',
      description: 'Serviço totalmente finalizado',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '✅'
    },
    {
      status: 'cancelled',
      label: 'Cancelado',
      description: 'Serviço cancelado ou rejeitado',
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: '🔴'
    }
  ];

  return (
    <Card className="mb-4 border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-500" />
            <CardTitle className="text-sm font-medium text-gray-700">
              Legenda de Status
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {legendItems.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <Badge
                        variant="outline"
                        className={`${item.color} text-xs font-medium border`}
                      >
                        {item.label}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  💡 <strong>Dica:</strong> As cores seguem o fluxo natural do processo de coleta diagnóstico
                </p>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default CalendarLegend;
