import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MobileTest: React.FC = () => {
  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Teste de Viewport Mobile
        </h1>
        
        <div className="text-sm text-gray-600 mb-6">
          <p>Largura da tela: {window.innerWidth}px</p>
          <p>Altura da tela: {window.innerHeight}px</p>
          <p>Device Pixel Ratio: {window.devicePixelRatio}</p>
          <p>User Agent: {navigator.userAgent.substring(0, 50)}...</p>
        </div>
      </div>

      {/* Navegação por abas - similar ao dashboard */}
      <div className="border-b border-gray-200 w-full max-w-full overflow-x-hidden">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button className="py-3 px-2 border-b-2 border-blue-500 text-blue-600 font-medium text-base whitespace-nowrap">
            Visão Geral
          </button>
          <button className="py-3 px-2 border-b-2 border-transparent text-gray-500 font-medium text-base whitespace-nowrap">
            Produtividade
          </button>
          <button className="py-3 px-2 border-b-2 border-transparent text-gray-500 font-medium text-base whitespace-nowrap">
            Calendário
          </button>
          <button className="py-3 px-2 border-b-2 border-transparent text-gray-500 font-medium text-base whitespace-nowrap">
            Estoque Móvel
          </button>
        </nav>
      </div>

      {/* Cards de teste */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-full">
        <Card className="w-full max-w-full overflow-x-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Ordens Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">3</span>
              <Badge variant="destructive">Críticas: 2</Badge>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Mais Urgente: F1 Imobiliaria
            </p>
            <p className="text-xs text-gray-500">
              Av. Campeche, 2697 - Campeche, Florianópolis - SC, 88063-301, Brazil
            </p>
            <p className="text-xs text-gray-500">
              Agendado: 09:00
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="flex-1">
                Ir Agora
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                Ligar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full max-w-full overflow-x-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Próxima Ordem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">Cliente Teste</p>
              <p className="text-sm text-gray-600">
                Rua das Flores, 123 - Centro
              </p>
              <p className="text-sm text-gray-600">
                Horário: 14:00 - 15:00
              </p>
              <Badge variant="secondary">Em Domicílio</Badge>
            </div>
            <Button className="w-full mt-3">
              Ver Detalhes
            </Button>
          </CardContent>
        </Card>

        <Card className="w-full max-w-full overflow-x-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Estatísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Concluídas hoje:</span>
                <span className="font-bold">5</span>
              </div>
              <div className="flex justify-between">
                <span>Pendentes:</span>
                <span className="font-bold">8</span>
              </div>
              <div className="flex justify-between">
                <span>Esta semana:</span>
                <span className="font-bold">23</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teste de elementos largos */}
      <Card className="w-full max-w-full overflow-x-hidden">
        <CardHeader>
          <CardTitle>Teste de Conteúdo Largo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-full overflow-x-auto">
            <div className="min-w-full bg-gray-100 p-4 rounded">
              <p className="whitespace-nowrap">
                Este é um texto muito longo que deveria quebrar ou ter scroll horizontal se necessário. 
                Testando se o viewport está funcionando corretamente em dispositivos móveis.
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações de debug */}
      <Card className="w-full max-w-full overflow-x-hidden">
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-1">
            <p>document.documentElement.clientWidth: {document.documentElement.clientWidth}</p>
            <p>document.body.clientWidth: {document.body.clientWidth}</p>
            <p>window.screen.width: {window.screen.width}</p>
            <p>window.screen.availWidth: {window.screen.availWidth}</p>
            <p>Viewport meta: {document.querySelector('meta[name="viewport"]')?.getAttribute('content')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileTest;
