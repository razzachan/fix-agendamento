import React, { useEffect, useState } from 'react';
import { BotOverview } from './BotOverview';
import { BotPersonality } from './BotPersonality';
import { BotLLMSettings } from './BotLLMSettings';
import { BotContextBlocks } from './BotContextBlocks';
import { BotTemplates } from './BotTemplates';
import { BotFlows } from './BotFlows';
import { BotIntegrations } from './BotIntegrations';
import { BotSchedule } from './BotSchedule';
import { BotPricing } from './BotPricing';
import { BotWorkingHours } from './BotWorkingHours';
import { BotBlackouts } from './BotBlackouts';
import { BotAnalytics } from './BotAnalytics';
import { KnowledgeBlocksPanel } from './KnowledgeBlocksPanel';
import { BotIntents } from './BotIntents';
import { BotTracing } from './BotTracing';
import { BotDecisionLogs } from './BotDecisionLogs';
import { VisualTraining } from './VisualTraining';
import { BrandSegmentation } from './BrandSegmentation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Settings, GitBranch, MessageSquare, Plug, BarChart3, Shield } from 'lucide-react';
import { BotStudioTour } from './BotStudioTour';
import AIRouterDashboard from '@/pages/ai-router-dashboard';

interface Props { onSwitchToWizard: () => void }

export function BotStudioAdvanced({ onSwitchToWizard }: Props){
  // Verificar lembrete pendente para badge
  const [waReminder, setWaReminder] = useState(false);
  useEffect(()=>{
    try { setWaReminder(JSON.parse(localStorage.getItem('wa-remind-later')||'false')); } catch {}
    const onStorage = () => { try { setWaReminder(JSON.parse(localStorage.getItem('wa-remind-later')||'false')); } catch {} };
    window.addEventListener('storage', onStorage);
    return ()=> window.removeEventListener('storage', onStorage);
  },[]);

  return (
    <div className="space-y-6">
      {/* Tour */}
      <BotStudioTour run={!localStorage.getItem('bot-studio-tour-done')} onFinish={() => { try{ localStorage.setItem('bot-studio-tour-done','true'); }catch{} }} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Configuração Avançada</CardTitle>
          <div className="flex items-center gap-3">
            <button className="text-sm text-primary underline" onClick={()=>{ try{ localStorage.removeItem('bot-studio-tour-done'); }catch{} window.location.reload(); }}>Rever Tour</button>
            <button className="text-sm text-primary underline" onClick={onSwitchToWizard}>Ir para Wizard</button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex flex-wrap w-full gap-1 h-auto p-1">
              {/* Ordem do tour */}
              <TabsTrigger value="overview" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap" data-tour="tab-overview">
                <Info className="h-3 w-3" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger value="llm" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap" data-tour="tab-llm">
                <Settings className="h-3 w-3" /> Modelo IA
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap relative" data-tour="tab-integrations">
                <Plug className="h-3 w-3" /> Canais
                {waReminder && (
                  <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-amber-200 text-amber-900">pendente</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="working_hours" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap" data-tour="tab-working-hours">
                <BarChart3 className="h-3 w-3" /> Funcionamento
              </TabsTrigger>
              <TabsTrigger value="blackouts" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap" data-tour="tab-blackouts">
                <BarChart3 className="h-3 w-3" /> Bloqueios
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap" data-tour="tab-schedule">
                <BarChart3 className="h-3 w-3" /> Disponibilidade (teste)
              </TabsTrigger>
              <TabsTrigger value="decision_logs" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap" data-tour="tab-decision-logs">
                <Shield className="h-3 w-3" /> Decision Logs
              </TabsTrigger>
              <TabsTrigger value="tracing" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <Settings className="h-3 w-3" /> Tracing
              </TabsTrigger>
              {/* Demais abas */}
              <TabsTrigger value="personality" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <Settings className="h-3 w-3" /> Personalidade
              </TabsTrigger>
              <TabsTrigger value="responses" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <MessageSquare className="h-3 w-3" /> Respostas
              </TabsTrigger>
              <TabsTrigger value="flows" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <GitBranch className="h-3 w-3" /> Fluxos
              </TabsTrigger>
              <TabsTrigger value="context" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <Settings className="h-3 w-3" /> Contexto
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <BarChart3 className="h-3 w-3" /> Preços
              </TabsTrigger>
              <TabsTrigger value="brand_rules" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <BarChart3 className="h-3 w-3" /> Marcas e Segmentação
              </TabsTrigger>
              <TabsTrigger value="visual_training" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <BarChart3 className="h-3 w-3" /> Classificação Visual
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <BarChart3 className="h-3 w-3" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="intents" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <Settings className="h-3 w-3" /> Intenções
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
                <Settings className="h-3 w-3" /> Knowledge (IA)
              </TabsTrigger>
	              <TabsTrigger value="ai_router" className="flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap">
	                <Shield className="h-3 w-3" /> AI Router
	              </TabsTrigger>

            </TabsList>

            <TabsContent value="overview"><BotOverview/></TabsContent>
            <TabsContent value="personality"><BotPersonality/></TabsContent>
            <TabsContent value="llm"><BotLLMSettings/></TabsContent>
            <TabsContent value="responses"><BotTemplates/></TabsContent>
            <TabsContent value="flows"><BotFlows/></TabsContent>
            <TabsContent value="context"><BotContextBlocks/></TabsContent>
            <TabsContent value="integrations"><BotIntegrations/></TabsContent>
            <TabsContent value="schedule"><BotSchedule/></TabsContent>
            <TabsContent value="pricing"><BotPricing/></TabsContent>
            <TabsContent value="brand_rules"><BrandSegmentation/></TabsContent>
            <TabsContent value="visual_training"><VisualTraining/></TabsContent>
            <TabsContent value="working_hours"><BotWorkingHours/></TabsContent>
            <TabsContent value="blackouts"><BotBlackouts/></TabsContent>
            <TabsContent value="analytics"><BotAnalytics/></TabsContent>
	            <TabsContent value="ai_router"><AIRouterDashboard/></TabsContent>

            <TabsContent value="intents"><BotIntents/></TabsContent>
            <TabsContent value="tracing"><BotTracing/></TabsContent>
            <TabsContent value="knowledge"><KnowledgeBlocksPanel/></TabsContent>

            <TabsContent value="decision_logs"><BotDecisionLogs/></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

