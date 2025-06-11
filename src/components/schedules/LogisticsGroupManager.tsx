import React, { useState, useEffect } from 'react';
import { AgendamentoAI, agendamentosService } from '@/services/agendamentos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LogisticsGroup } from './RoutingDateSelector';
import { Loader2, Save, Tag } from 'lucide-react';

interface LogisticsGroupManagerProps {
  agendamentos: AgendamentoAI[];
  onAgendamentosUpdated: () => void;
}

const LogisticsGroupManager: React.FC<LogisticsGroupManagerProps> = ({
  agendamentos,
  onAgendamentosUpdated
}) => {
  const [filteredAgendamentos, setFilteredAgendamentos] = useState<AgendamentoAI[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<LogisticsGroup>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, LogisticsGroup>>({});

  // Filtrar agendamentos sem grupo logístico definido
  useEffect(() => {
    const filtered = agendamentos.filter(a => a.logistics_group === null);
    setFilteredAgendamentos(filtered);
  }, [agendamentos]);

  // Função para atualizar o grupo logístico de um agendamento
  const handleGroupChange = (agendamentoId: string, group: LogisticsGroup) => {
    setPendingChanges(prev => ({
      ...prev,
      [agendamentoId]: group
    }));
  };

  // Função para salvar as alterações
  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const promises = Object.entries(pendingChanges).map(([id, group]) =>
        agendamentosService.updateLogisticsGroup(id, group)
      );

      await Promise.all(promises);

      toast.success(`${Object.keys(pendingChanges).length} agendamentos atualizados com sucesso!`);
      setPendingChanges({});
      onAgendamentosUpdated();
    } catch (error) {
      console.error('Erro ao atualizar grupos logísticos:', error);
      toast.error('Erro ao atualizar grupos logísticos');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para atribuir grupo logístico com base na localização geográfica
  const handleAutoAssignGroups = async () => {
    // Coordenadas da sede (R. João Carlos de Souza, 292 - Santa Monica, Florianópolis - SC, 88035-350)
    const SEDE_COORDS = {
      lat: -27.5944,
      lng: -48.5124
    };

    const newPendingChanges = { ...pendingChanges };
    toast.info('Iniciando atribuição automática de grupos logísticos...');

    // Função para calcular a distância entre dois pontos (fórmula de Haversine)
    const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Raio da Terra em km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c; // Distância em km
    };

    // Função para determinar o grupo logístico com base na distância
    const determinarGrupoLogistico = (distancia: number): LogisticsGroup => {
      if (distancia <= 15) return 'A';      // Até 15 km (Florianópolis e arredores)
      if (distancia <= 40) return 'B';      // 15-40 km (Grande Florianópolis)
      return 'C';                           // Mais de 40 km (Litoral Norte)
    };

    // Função para extrair CEP do endereço
    const extrairCEP = (endereco: string): string | null => {
      // Padrões de CEP: 88000-000, 88000000, CEP: 88000-000, CEP 88000000
      const padroes = [
        /\b(\d{5}[-\s]?\d{3})\b/,           // Formato padrão: 88000-000 ou 88000000
        /CEP:?\s*(\d{5}[-\s]?\d{3})\b/i,    // Com prefixo CEP: ou CEP
        /\b(\d{8})\b/                       // Apenas números: 88000000
      ];

      for (const padrao of padroes) {
        const match = endereco.match(padrao);
        if (match && match[1]) {
          return match[1].replace(/[^\d]/g, ''); // Remove caracteres não numéricos
        }
      }

      return null;
    };

    // Função para identificar a região pelo CEP
    const identificarRegiaoPorCEP = (cep: string): LogisticsGroup | null => {
      if (!cep || cep.length < 5) return null;

      // CEPs de Florianópolis e arredores (Grupo A)
      const cepsGrupoA = ['88000', '88010', '88015', '88020', '88025', '88030', '88035',
                          '88040', '88045', '88050', '88053', '88054', '88055', '88056', '88058', '88060'];

      // CEPs da Grande Florianópolis (Grupo B)
      const cepsGrupoB = ['88100', '88110', '88115', '88130', '88135', '88140', '88160',
                          '88161', '88162', '88163', '88164', '88165', '88070', '88075', '88080'];

      // CEPs do Litoral Norte (Grupo C)
      const cepsGrupoC = ['88200', '88210', '88220', '88300', '88330', '88340', '88345',
                          '88350', '88355', '88370', '88380', '88385', '88390'];

      const prefixo = cep.substring(0, 5);

      if (cepsGrupoA.some(c => prefixo.startsWith(c))) return 'A';
      if (cepsGrupoB.some(c => prefixo.startsWith(c))) return 'B';
      if (cepsGrupoC.some(c => prefixo.startsWith(c))) return 'C';

      return null;
    };

    // Função para identificar a região pelo nome da cidade/bairro
    const identificarRegiaoPorLocalidade = (endereco: string): LogisticsGroup | null => {
      // Normalizar o texto (remover acentos, converter para minúsculas)
      const textoNormalizado = endereco.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      // Localidades do Grupo A (Florianópolis e arredores)
      const localidadesGrupoA = [
        'florianopolis', 'floripa', 'centro', 'trindade', 'itacorubi', 'corrego grande',
        'santa monica', 'pantanal', 'carvoeira', 'agronomica', 'jurere', 'canasvieiras',
        'ingleses', 'lagoa', 'barra da lagoa', 'campeche', 'coqueiros', 'estreito'
      ];

      // Localidades do Grupo B (Grande Florianópolis)
      const localidadesGrupoB = [
        'sao jose', 'palhoça', 'palhoca', 'biguacu', 'biguaçu', 'santo amaro',
        'governador celso ramos', 'antonio carlos', 'antonio carlos', 'angelina'
      ];

      // Localidades do Grupo C (Litoral Norte)
      const localidadesGrupoC = [
        'tijucas', 'porto belo', 'bombinhas', 'itapema', 'balneario camboriu',
        'balneário camboriú', 'camboriu', 'camboriú', 'itajai', 'itajaí',
        'navegantes', 'piçarras', 'picarras', 'penha', 'barra velha'
      ];

      // Verificar se o endereço contém alguma das localidades
      for (const localidade of localidadesGrupoA) {
        if (textoNormalizado.includes(localidade)) return 'A';
      }

      for (const localidade of localidadesGrupoB) {
        if (textoNormalizado.includes(localidade)) return 'B';
      }

      for (const localidade of localidadesGrupoC) {
        if (textoNormalizado.includes(localidade)) return 'C';
      }

      return null;
    };

    // Processar cada agendamento
    let atribuidos = 0;
    for (const agendamento of filteredAgendamentos) {
      if (agendamento.endereco) {
        try {
          let grupo: LogisticsGroup | null = null;

          // 1. Tentar identificar pelo nome da cidade/bairro
          grupo = identificarRegiaoPorLocalidade(agendamento.endereco);

          // 2. Se não conseguiu, tentar pelo CEP
          if (!grupo) {
            const cep = extrairCEP(agendamento.endereco);
            if (cep) {
              grupo = identificarRegiaoPorCEP(cep);
            }
          }

          // 3. Se ainda não conseguiu, usar uma heurística simples baseada no CEP
          if (!grupo) {
            // Verificar se tem algum número que pode ser um CEP
            if (/\b8[0-9]{4}\b/.test(agendamento.endereco)) {
              // CEPs que começam com 88 são de SC, provavelmente grupo A ou B
              grupo = 'B';
            } else {
              // Se não tem CEP de SC, provavelmente é de outra região (grupo C)
              grupo = 'C';
            }
          }

          // Atribuir o grupo ao agendamento
          if (grupo) {
            newPendingChanges[agendamento.id] = grupo;
            atribuidos++;
          }

        } catch (error) {
          console.error('Erro ao processar endereço:', agendamento.endereco, error);
        }
      }
    }

    setPendingChanges(newPendingChanges);
    toast.success(`${atribuidos} agendamentos classificados. Clique em Salvar para confirmar.`);
  };

  // Função para atribuir o mesmo grupo logístico a todos os agendamentos filtrados
  const handleAssignGroupToAll = () => {
    if (!selectedGroup) {
      toast.error('Selecione um grupo logístico primeiro');
      return;
    }

    const newPendingChanges = { ...pendingChanges };

    filteredAgendamentos.forEach(agendamento => {
      newPendingChanges[agendamento.id] = selectedGroup;
    });

    setPendingChanges(newPendingChanges);
    toast.info(`Grupo ${selectedGroup} atribuído a todos os agendamentos. Clique em Salvar para confirmar.`);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="h-5 w-5 text-blue-600" />
          Gerenciador de Grupos Logísticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Select
              value={selectedGroup || 'all'}
              onValueChange={(value) => setSelectedGroup(value === 'all' ? null : value as LogisticsGroup)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                <SelectItem value="A">Grupo A</SelectItem>
                <SelectItem value="B">Grupo B</SelectItem>
                <SelectItem value="C">Grupo C</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleAssignGroupToAll}
              disabled={!selectedGroup}
            >
              Atribuir a Todos
            </Button>
            <Button
              variant="outline"
              onClick={handleAutoAssignGroups}
            >
              Atribuir Automaticamente
            </Button>
          </div>
          <Button
            onClick={handleSaveChanges}
            disabled={Object.keys(pendingChanges).length === 0 || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>

        <div className="bg-blue-50 p-3 rounded-md mb-4">
          <p className="text-sm text-blue-700">
            {filteredAgendamentos.length} agendamentos sem grupo logístico definido.
            {Object.keys(pendingChanges).length > 0 &&
              ` ${Object.keys(pendingChanges).length} alterações pendentes.`}
          </p>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Grupo Logístico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgendamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                    Todos os agendamentos já possuem grupo logístico definido.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgendamentos.map(agendamento => (
                  <TableRow key={agendamento.id}>
                    <TableCell className="font-medium">{agendamento.nome}</TableCell>
                    <TableCell>{agendamento.endereco}</TableCell>
                    <TableCell>
                      <Select
                        value={pendingChanges[agendamento.id] || agendamento.logistics_group || 'none'}
                        onValueChange={(value) => handleGroupChange(
                          agendamento.id,
                          value === 'none' ? null : value as LogisticsGroup
                        )}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="A">Grupo A</SelectItem>
                          <SelectItem value="B">Grupo B</SelectItem>
                          <SelectItem value="C">Grupo C</SelectItem>
                        </SelectContent>
                      </Select>
                      {pendingChanges[agendamento.id] && (
                        <Badge variant="outline" className="ml-2">Alterado</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LogisticsGroupManager;
