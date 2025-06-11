
import React from 'react';
import { User } from '@/types';
import WorkshopsTable from './WorkshopsTable';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableIcon, Grid3x3Icon } from 'lucide-react';
import { WorkshopGrid } from './WorkshopGrid';

interface WorkshopsListProps {
  workshops: User[];
  onDelete: (id: string) => Promise<boolean>;
  onEdit: (workshop: User) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const WorkshopsList: React.FC<WorkshopsListProps> = ({
  workshops,
  onDelete,
  onEdit,
  onRefresh,
  isLoading
}) => {
  return (
    <Card>
      <CardContent className="p-0">
        <Tabs defaultValue="table" className="w-full">
          <div className="flex justify-end px-4 pt-2">
            <TabsList>
              <TabsTrigger value="table" className="flex items-center">
                <TableIcon className="h-4 w-4 mr-2" />
                Tabela
              </TabsTrigger>
              <TabsTrigger value="grid" className="flex items-center">
                <Grid3x3Icon className="h-4 w-4 mr-2" />
                Cards
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="table">
            <WorkshopsTable 
              workshops={workshops}
              onDelete={onDelete}
              onEdit={onEdit}
              isLoading={isLoading}
            />
          </TabsContent>
          <TabsContent value="grid">
            <WorkshopGrid 
              workshops={workshops}
              onDelete={onDelete}
              onEdit={onEdit}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WorkshopsList;
