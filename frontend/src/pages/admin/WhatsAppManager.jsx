import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Settings, MessageSquare, Users } from 'lucide-react';
import WhatsAppQRCode from '@/components/WhatsAppQRCode';

const WhatsAppManager = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Manager</h1>
          <p className="text-gray-600">Gerencie a conexão e configurações do WhatsApp Bot</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Fix Fogões Bot
        </Badge>
      </div>

      <Tabs defaultValue="connection" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Conexão
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WhatsAppQRCode />
            
            <Card>
              <CardHeader>
                <CardTitle>Status da Conexão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant="secondary">Desconectado</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Última conexão:</span>
                    <span className="text-sm text-gray-600">Nunca</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Número:</span>
                    <span className="text-sm text-gray-600">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Nome:</span>
                    <span className="text-sm text-gray-600">-</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Instruções:</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. Clique em "Conectar WhatsApp" na aba ao lado</li>
                    <li>2. Escaneie o QR code com seu WhatsApp</li>
                    <li>3. Aguarde a confirmação de conexão</li>
                    <li>4. O bot estará pronto para receber mensagens</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma mensagem ainda</p>
                <p className="text-sm">Conecte o WhatsApp para ver as mensagens</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contatos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum contato ainda</p>
                <p className="text-sm">Conecte o WhatsApp para sincronizar contatos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Bot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mensagem de Boas-vindas</label>
                  <textarea 
                    className="w-full p-2 border rounded-md text-sm"
                    rows={3}
                    placeholder="Olá! Sou o assistente da Fix Fogões..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horário de Funcionamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="time" 
                      className="p-2 border rounded-md text-sm"
                      defaultValue="08:00"
                    />
                    <input 
                      type="time" 
                      className="p-2 border rounded-md text-sm"
                      defaultValue="18:00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações Técnicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Webhook URL:</span>
                    <span className="text-sm text-gray-600 font-mono">
                      /webhook/whatsapp
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">WebSocket:</span>
                    <span className="text-sm text-gray-600 font-mono">
                      /whatsapp-qr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Timeout:</span>
                    <span className="text-sm text-gray-600">30s</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppManager;
