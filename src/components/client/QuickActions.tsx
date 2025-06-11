import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Plus, 
  Calendar, 
  Phone,
  FileText,
  Star
} from 'lucide-react';

export function QuickActions() {
  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      'Olá! Gostaria de solicitar um serviço para meu equipamento.'
    );
    window.open(`https://api.whatsapp.com/send?phone=5548988332664&text=${message}`, '_blank');
  };

  const handlePhoneContact = () => {
    window.open('tel:+5548988332664', '_self');
  };

  const handleGoogleReview = () => {
    window.open('https://g.page/r/CfjiXeK7gOSLEAg/review', '_blank');
  };

  const actions = [
    {
      icon: MessageCircle,
      title: 'Solicitar Serviço',
      description: 'WhatsApp direto com nossa equipe',
      color: 'bg-green-600 hover:bg-green-700',
      textColor: 'text-white',
      action: handleWhatsAppContact
    },
    {
      icon: Phone,
      title: 'Ligar Agora',
      description: 'Fale conosco por telefone',
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white',
      action: handlePhoneContact
    },
    {
      icon: Calendar,
      title: 'Agendar Visita',
      description: 'Agende uma visita técnica',
      color: 'bg-purple-600 hover:bg-purple-700',
      textColor: 'text-white',
      action: handleWhatsAppContact
    },
    {
      icon: Star,
      title: 'Avaliar Serviço',
      description: 'Deixe sua avaliação no Google',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      textColor: 'text-white',
      action: handleGoogleReview
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5 text-green-600" />
          <span>Ações Rápidas</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              className={`${action.color} ${action.textColor} h-auto p-4 flex flex-col items-center space-y-2 transition-all duration-200 hover:scale-105`}
            >
              <action.icon className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold text-sm">{action.title}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>

        {/* Informações de Contato */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-sm font-medium text-gray-900">
                Horário de Atendimento
              </p>
              <p className="text-sm text-gray-600">
                Segunda a Sexta: 08:00 - 18:00 | Sábado: 08:00 - 12:00
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">WhatsApp</p>
                <p className="text-sm font-medium text-gray-900">(48) 98833-2664</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dica */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">💡 Dica:</p>
              <p>
                Para um atendimento mais rápido, tenha em mãos o modelo e marca do seu equipamento 
                ao entrar em contato conosco.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
