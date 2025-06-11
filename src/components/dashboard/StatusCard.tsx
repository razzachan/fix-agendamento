
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  label: string;
  count: number;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ 
  label, 
  count, 
  icon: Icon, 
  bgColor, 
  textColor 
}) => {
  return (
    <div className={`flex flex-col space-y-1 ${bgColor} ${textColor} rounded-lg p-3`}>
      <span className={`text-xs font-medium ${textColor}`}>{label}</span>
      <div className="flex items-center">
        <Icon className="h-4 w-4 mr-1.5" />
        <span className="text-2xl font-bold">{count}</span>
      </div>
    </div>
  );
};

export default StatusCard;
