import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Settings,
  Save,
  RefreshCw
} from 'lucide-react';

interface NotificationPreferences {
  id?: string;
  userId: string;
  
  // Canais de notificação
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  
  // Tipos de eventos
  statusChanges: boolean;
  technicianAssignment: boolean;
  workshopEvents: boolean;
  paymentEvents: boolean;
  diagnosticEvents: boolean;
  completionEvents: boolean;
  
  // Configurações avançadas
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  weekendNotifications: boolean;
}

const defaultPreferences: Omit<NotificationPreferences, 'userId'> = {
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  statusChanges: true,
  technicianAssignment: true,
  workshopEvents: true,
  paymentEvents: true,
  diagnosticEvents: true,
  completionEvents: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  weekendNotifications: true
};

export const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar preferências do usuário
  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar preferências:', error);
        toast.error('Erro ao carregar configurações de notificação');
        return;
      }

      if (data) {
        setPreferences({
          id: data.id,
          userId: data.user_id,
          inAppEnabled: data.in_app_enabled ?? true,
          emailEnabled: data.email_enabled ?? true,
          smsEnabled: data.sms_enabled ?? false,
          pushEnabled: data.push_enabled ?? true,
          statusChanges: data.status_changes ?? true,
          technicianAssignment: data.technician_assignment ?? true,
          workshopEvents: data.workshop_events ?? true,
          paymentEvents: data.payment_events ?? true,
          diagnosticEvents: data.diagnostic_events ?? true,
          completionEvents: data.completion_events ?? true,
          quietHoursEnabled: data.quiet_hours_enabled ?? false,
          quietHoursStart: data.quiet_hours_start ?? '22:00',
          quietHoursEnd: data.quiet_hours_end ?? '08:00',
          weekendNotifications: data.weekend_notifications ?? true
        });
      } else {
        // Criar preferências padrão
        setPreferences({
          ...defaultPreferences,
          userId: user.id
        });
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences || !user?.id) return;

    try {
      setIsSaving(true);

      const dataToSave = {
        user_id: user.id,
        in_app_enabled: preferences.inAppEnabled,
        email_enabled: preferences.emailEnabled,
        sms_enabled: preferences.smsEnabled,
        push_enabled: preferences.pushEnabled,
        status_changes: preferences.statusChanges,
        technician_assignment: preferences.technicianAssignment,
        workshop_events: preferences.workshopEvents,
        payment_events: preferences.paymentEvents,
        diagnostic_events: preferences.diagnosticEvents,
        completion_events: preferences.completionEvents,
        quiet_hours_enabled: preferences.quietHoursEnabled,
        quiet_hours_start: preferences.quietHoursStart,
        quiet_hours_end: preferences.quietHoursEnd,
        weekend_notifications: preferences.weekendNotifications
      };

      let result;
      if (preferences.id) {
        // Atualizar existente
        result = await supabase
          .from('notification_preferences')
          .update(dataToSave)
          .eq('id', preferences.id);
      } else {
        // Criar novo
        result = await supabase
          .from('notification_preferences')
          .insert(dataToSave)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      if (!preferences.id && result.data) {
        setPreferences(prev => prev ? { ...prev, id: result.data.id } : null);
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => prev ? { ...prev, [key]: value } : null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Carregando configurações...
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <p>Erro ao carregar configurações de notificação</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Notificação
          </CardTitle>
          <CardDescription>
            Configure como e quando você deseja receber notificações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Canais de Notificação */}
          <div>
            <h3 className="text-lg font-medium mb-4">Canais de Notificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <Label htmlFor="in-app">Notificações no App</Label>
                </div>
                <Switch
                  id="in-app"
                  checked={preferences.inAppEnabled}
                  onCheckedChange={(checked) => updatePreference('inAppEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <Label htmlFor="email">Email</Label>
                </div>
                <Switch
                  id="email"
                  checked={preferences.emailEnabled}
                  onCheckedChange={(checked) => updatePreference('emailEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <Label htmlFor="sms">SMS</Label>
                  <Badge variant="outline" className="text-xs">Em breve</Badge>
                </div>
                <Switch
                  id="sms"
                  checked={preferences.smsEnabled}
                  onCheckedChange={(checked) => updatePreference('smsEnabled', checked)}
                  disabled
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <Label htmlFor="push">Push Notifications</Label>
                  <Badge variant="outline" className="text-xs">Em breve</Badge>
                </div>
                <Switch
                  id="push"
                  checked={preferences.pushEnabled}
                  onCheckedChange={(checked) => updatePreference('pushEnabled', checked)}
                  disabled
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tipos de Eventos */}
          <div>
            <h3 className="text-lg font-medium mb-4">Tipos de Eventos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="status-changes">Mudanças de Status</Label>
                <Switch
                  id="status-changes"
                  checked={preferences.statusChanges}
                  onCheckedChange={(checked) => updatePreference('statusChanges', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="technician-assignment">Atribuição de Técnico</Label>
                <Switch
                  id="technician-assignment"
                  checked={preferences.technicianAssignment}
                  onCheckedChange={(checked) => updatePreference('technicianAssignment', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="workshop-events">Eventos da Oficina</Label>
                <Switch
                  id="workshop-events"
                  checked={preferences.workshopEvents}
                  onCheckedChange={(checked) => updatePreference('workshopEvents', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="payment-events">Eventos de Pagamento</Label>
                <Switch
                  id="payment-events"
                  checked={preferences.paymentEvents}
                  onCheckedChange={(checked) => updatePreference('paymentEvents', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="diagnostic-events">Diagnósticos</Label>
                <Switch
                  id="diagnostic-events"
                  checked={preferences.diagnosticEvents}
                  onCheckedChange={(checked) => updatePreference('diagnosticEvents', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="completion-events">Conclusão de Serviços</Label>
                <Switch
                  id="completion-events"
                  checked={preferences.completionEvents}
                  onCheckedChange={(checked) => updatePreference('completionEvents', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Configurações Avançadas */}
          <div>
            <h3 className="text-lg font-medium mb-4">Configurações Avançadas</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="weekend-notifications">Notificações nos Fins de Semana</Label>
                <Switch
                  id="weekend-notifications"
                  checked={preferences.weekendNotifications}
                  onCheckedChange={(checked) => updatePreference('weekendNotifications', checked)}
                />
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <Button onClick={savePreferences} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
