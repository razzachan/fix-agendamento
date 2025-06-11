import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AgendamentoAI } from '@/services/agendamentos';
import { agendamentosService } from '@/services/agendamentos';
import { mapboxService } from '@/services/maps/mapboxService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Route } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const SimpleConfirmationPage: React.FC = () => {
  // Estados básicos
  const [agendamentos, setAgendamentos] = useState<AgendamentoAI[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar agendamentos e rotas salvas
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Carregar agendamentos
        const agendamentosData = await agendamentosService.getAll();
        setAgendamentos(agendamentosData);
        
        // Carregar rotas salvas
        const routesData = await mapboxService.getSavedRoutes({});
        setSavedRoutes(routesData);
        
        console.log(`Carregados ${agendamentosData.length} agendamentos e ${routesData.length} rotas salvas`);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Confirmação de Agendamentos</h1>
          <p className="text-muted-foreground">
            Confirme os agendamentos roteirizados com os clientes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Route className="h-5 w-5 text-blue-600" />
            Rotas Salvas
          </CardTitle>
          <CardDescription>
            Selecione uma rota para confirmar os agendamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="route">Rota</Label>
              <Select
                value={selectedRoute || ''}
                onValueChange={(value) => setSelectedRoute(value || null)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Selecione uma rota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os agendamentos roteirizados</SelectItem>
                  {savedRoutes.map(route => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.name} ({route.waypoints.length} pontos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos</CardTitle>
          <CardDescription>
            {isLoading ? 'Carregando...' : `${agendamentos.length} agendamentos encontrados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <p>Carregando agendamentos...</p>
            ) : agendamentos.length === 0 ? (
              <p>Nenhum agendamento encontrado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agendamentos.slice(0, 6).map(agendamento => (
                  <Card key={agendamento.id}>
                    <CardContent className="p-4">
                      <h3 className="font-medium">{agendamento.nome}</h3>
                      <p className="text-sm text-gray-500">{agendamento.endereco}</p>
                      <p className="text-sm mt-2">
                        Status: <span className="font-medium">{agendamento.status || 'Pendente'}</span>
                      </p>
                      <Button 
                        className="mt-2 w-full" 
                        variant="outline"
                        disabled={agendamento.status === 'confirmado'}
                      >
                        Confirmar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SimpleConfirmationPage;
