
import React from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Notification } from '@/types';
import { Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification,
  onRead
}) => {
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  // Função para formatar a data de forma relativa
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'agora mesmo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  // Escolher ícone com base no tipo
  const getIcon = () => {
    switch(notification.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenuItem 
      className={cn(
        "flex flex-col items-start p-3 cursor-pointer",
        !notification.read && "bg-blue-50"
      )}
      onClick={handleClick}
    >
      <div className="flex justify-between w-full">
        <h4 className="text-sm font-medium flex items-center gap-2">
          {getIcon()}
          {notification.title}
        </h4>
        <span className="text-xs text-gray-500">{formatRelativeTime(notification.time)}</span>
      </div>
      <p className="text-xs text-gray-600 mt-1 pl-6">{notification.description}</p>
    </DropdownMenuItem>
  );
};

export default NotificationItem;
