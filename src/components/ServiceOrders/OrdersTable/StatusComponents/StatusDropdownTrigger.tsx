
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { getStatusLabel, getStatusIcon } from '@/components/ServiceOrders/StatusBadge';

interface StatusDropdownTriggerProps {
  isUpdatingStatus: boolean;
  status: string;
}

const StatusDropdownTrigger: React.FC<StatusDropdownTriggerProps> = ({ 
  isUpdatingStatus,
  status
}) => {
  // Get the status label to display in the button
  const statusLabel = getStatusLabel(status);
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      className="hover:bg-primary/5 gap-2 px-2 py-1 h-auto min-w-[120px] justify-between w-full"
      disabled={isUpdatingStatus}
    >
      <div className="flex items-center gap-2">
        {isUpdatingStatus ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          getStatusIcon(status) || <AlertCircle className="h-4 w-4" />
        )}
        <span>{statusLabel}</span>
      </div>
      <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
    </Button>
  );
};

export default StatusDropdownTrigger;
