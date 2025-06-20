// ===================================================================
// 📱 SISTEMA DE NOTIFICAÇÕES PWA (MVP 4)
// ===================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell,
  BellOff,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  Smartphone,
  Clock
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';

interface NotificationSettings {
  enabled: boolean;
  newOrders: boolean;
  statusUpdates: boolean;
  reminders: boolean;
  alerts: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

/**
 * Componente para gerenciar notificações PWA
 */
export function PWANotifications() {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    newOrders: true,
    statusUpdates: true,
    reminders: true,
    alerts: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const { sendNotification, requestNotificationPermission } = usePWA();

  /**
   * Verificar status da permissão ao carregar
   */
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
      
      // Carregar configurações salvas
      const savedSettings = localStorage.getItem('pwa-notification-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(parsed);
        } catch (error) {
          console.error('Erro ao carregar configurações de notificação:', error);
        }
      }
    }
  }, []);

  /**
   * Salvar configurações
   */
  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pwa-notification-settings', JSON.stringify(newSettings));
  };

  /**
   * Solicitar permissão para notificações
   */
  const handleRequestPermission = async () => {
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPermissionStatus('granted');
        saveSettings({ ...settings, enabled: true });
        toast.success('Notificações ativadas com sucesso!');
        
        // Enviar notificação de teste
        await sendNotification({
          title: 'Fix Fogões',
          body: 'Notificações ativadas! Você receberá atualizações importantes.',
          icon: '/favicon.svg',
          tag: 'welcome'
        });
      } else {
        toast.error('Permissão para notificações negada');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao ativar notificações');
    }
  };

  /**
   * Desativar notificações
   */
  const handleDisableNotifications = () => {
    saveSettings({ ...settings, enabled: false });
    toast.info('Notificações desativadas');
  };

  /**
   * Atualizar configuração específica
   */
  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  /**
   * Enviar notificação de teste
   */
  const sendTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      toast.error('Permissão para notificações necessária');
      return;
    }

    try {
      await sendNotification({
        title: 'Notificação de Teste',
        body: 'Esta é uma notificação de teste do Fix Fogões',
        icon: '/favicon.svg',
        tag: 'test',
        actions: [
          { action: 'view', title: 'Ver Detalhes' },
          { action: 'dismiss', title: 'Dispensar' }
        ]
      });
      toast.success('Notificação de teste enviada!');
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      toast.error('Erro ao enviar notificação de teste');
    }
  };

  /**
   * Obter status da permissão
   */
  const getPermissionStatus = () => {
    switch (permissionStatus) {
      case 'granted':
        return { icon: CheckCircle, color: 'text-green-500', text: 'Permitidas' };
      case 'denied':
        return { icon: BellOff, color: 'text-red-500', text: 'Bloqueadas' };
      default:
        return { icon: Bell, color: 'text-yellow-500', text: 'Não solicitadas' };
    }
  };

  const permissionInfo = getPermissionStatus();
  const PermissionIcon = permissionInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notificações PWA
          </h2>
          <p className="text-muted-foreground">
            Configure notificações push para receber atualizações importantes
          </p>
        </div>
      </div>

      {/* Status das notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PermissionIcon className={`h-5 w-5 ${permissionInfo.color}`} />
            Status das Notificações
          </CardTitle>
          <CardDescription>
            Permissão atual: {permissionInfo.text}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {permissionStatus === 'default' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Para receber notificações, você precisa permitir o acesso. 
                Clique no botão abaixo para ativar.
              </AlertDescription>
            </Alert>
          )}

          {permissionStatus === 'denied' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Notificações foram bloqueadas. Para ativar, vá nas configurações 
                do seu navegador e permita notificações para este site.
              </AlertDescription>
            </Alert>
          )}

          {permissionStatus === 'granted' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Notificações estão ativas! Você receberá atualizações importantes 
                sobre suas ordens de serviço e alertas do sistema.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {permissionStatus === 'default' && (
              <Button onClick={handleRequestPermission}>
                <Bell className="h-4 w-4 mr-2" />
                Ativar Notificações
              </Button>
            )}

            {permissionStatus === 'granted' && (
              <>
                <Button onClick={sendTestNotification} variant="outline">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Testar Notificação
                </Button>
                
                <Button 
                  onClick={handleDisableNotifications} 
                  variant="outline"
                  disabled={!settings.enabled}
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  Desativar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurações detalhadas */}
      {permissionStatus === 'granted' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Notificação
            </CardTitle>
            <CardDescription>
              Personalize quais notificações você deseja receber
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Switch principal */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications-enabled" className="text-base font-medium">
                  Notificações Ativadas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ativar/desativar todas as notificações
                </p>
              </div>
              <Switch
                id="notifications-enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSetting('enabled', checked)}
              />
            </div>

            {settings.enabled && (
              <>
                {/* Tipos de notificação */}
                <div className="space-y-4">
                  <h4 className="font-medium">Tipos de Notificação</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="new-orders">Novas Ordens de Serviço</Label>
                        <p className="text-xs text-muted-foreground">
                          Quando uma nova OS for criada
                        </p>
                      </div>
                      <Switch
                        id="new-orders"
                        checked={settings.newOrders}
                        onCheckedChange={(checked) => updateSetting('newOrders', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="status-updates">Atualizações de Status</Label>
                        <p className="text-xs text-muted-foreground">
                          Mudanças no status das ordens
                        </p>
                      </div>
                      <Switch
                        id="status-updates"
                        checked={settings.statusUpdates}
                        onCheckedChange={(checked) => updateSetting('statusUpdates', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="reminders">Lembretes</Label>
                        <p className="text-xs text-muted-foreground">
                          Agendamentos e prazos importantes
                        </p>
                      </div>
                      <Switch
                        id="reminders"
                        checked={settings.reminders}
                        onCheckedChange={(checked) => updateSetting('reminders', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="alerts">Alertas do Sistema</Label>
                        <p className="text-xs text-muted-foreground">
                          Alertas importantes e críticos
                        </p>
                      </div>
                      <Switch
                        id="alerts"
                        checked={settings.alerts}
                        onCheckedChange={(checked) => updateSetting('alerts', checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Horário silencioso */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="quiet-hours" className="font-medium">
                        Horário Silencioso
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Não receber notificações em horários específicos
                      </p>
                    </div>
                    <Switch
                      id="quiet-hours"
                      checked={settings.quietHours.enabled}
                      onCheckedChange={(checked) => 
                        updateSetting('quietHours', { ...settings.quietHours, enabled: checked })
                      }
                    />
                  </div>

                  {settings.quietHours.enabled && (
                    <div className="grid grid-cols-2 gap-4 ml-4">
                      <div>
                        <Label htmlFor="quiet-start">Início</Label>
                        <input
                          id="quiet-start"
                          type="time"
                          value={settings.quietHours.start}
                          onChange={(e) => 
                            updateSetting('quietHours', { 
                              ...settings.quietHours, 
                              start: e.target.value 
                            })
                          }
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quiet-end">Fim</Label>
                        <input
                          id="quiet-end"
                          type="time"
                          value={settings.quietHours.end}
                          onChange={(e) => 
                            updateSetting('quietHours', { 
                              ...settings.quietHours, 
                              end: e.target.value 
                            })
                          }
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informações sobre PWA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Sobre Notificações PWA
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <span>Funcionam mesmo com o navegador fechado</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <span>Aparecem na área de notificação do sistema</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <span>Podem ser configuradas individualmente</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
            <span>Respeitam o horário silencioso configurado</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
