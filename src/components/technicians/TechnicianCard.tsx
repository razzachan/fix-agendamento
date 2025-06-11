import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Phone, Mail, Wrench, AlertCircle } from 'lucide-react';
import { Technician } from '@/types';
import { Badge } from '@/components/ui/badge';

interface TechnicianCardProps {
  technician: Technician;
  isAdmin: boolean;
  onEdit: (technician: Technician) => void;
  onDelete: (id: string) => void;
  onAction: (action: string, id?: string) => void;
}

const TechnicianCard: React.FC<TechnicianCardProps> = ({
  technician,
  isAdmin,
  onEdit,
  onDelete,
  onAction
}) => {
  const isActive = technician.isActive !== undefined ? technician.isActive : true;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">{technician.name}</CardTitle>
            {isActive === false && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                Inativo
              </Badge>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600"
                onClick={() => onEdit(technician)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(technician.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{technician.email}</span>
          </div>
          
          {technician.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{technician.phone}</span>
            </div>
          )}
          
          {technician.specialties && technician.specialties.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-muted-foreground block mb-1">Especialidades:</span>
              <div className="flex flex-wrap gap-1">
                {technician.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TechnicianCard;
