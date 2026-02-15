import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { CrmStatus } from '@/types/crm';
import { CRM_STATUS_LABELS } from '@/types/crm';

export function CrmStatusBadge({ status }: { status: CrmStatus }) {
  return (
    <Badge variant="outline">
      {CRM_STATUS_LABELS[status] || status}
    </Badge>
  );
}
