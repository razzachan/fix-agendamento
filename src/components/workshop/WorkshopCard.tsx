
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Factory, Mail, Phone, MapPin } from 'lucide-react';
import { User } from '@/types';

interface WorkshopCardProps {
  workshop: User;
  onEdit: (workshop: User) => void;
  onDelete: (id: string) => Promise<boolean>;
}

const WorkshopCard: React.FC<WorkshopCardProps> = ({
  workshop,
  onEdit,
  onDelete
}) => {
  const handleDelete = async () => {
    await onDelete(workshop.id);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-amber-600" />
          {workshop.name}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          {workshop.email}
        </CardDescription>
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {workshop.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{workshop.phone}</span>
          </div>
        )}
        {workshop.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <span>{workshop.address}</span>
              {(workshop.city || workshop.state) && (
                <span className="block">
                  {workshop.city}{workshop.city && workshop.state && ', '}{workshop.state}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onEdit(workshop)}
        >
          Editar
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WorkshopCard;
