
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Factory, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TechnicianManagement from '@/components/technicians/TechnicianManagement';
import WorkshopManagement from '@/components/workshop/WorkshopManagement';

const Technicians: React.FC = () => {
  const [activeTab, setActiveTab] = useState("technicians");
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Técnicos & Oficinas</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="technicians" className="flex items-center">
            <Wrench className="h-4 w-4 mr-2" /> Técnicos
          </TabsTrigger>
          <TabsTrigger value="workshops" className="flex items-center">
            <Factory className="h-4 w-4 mr-2" /> Oficinas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="technicians" className="mt-0">
          <TechnicianManagement isAdmin={isAdmin} />
        </TabsContent>
        
        <TabsContent value="workshops" className="mt-0">
          <WorkshopManagement isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Technicians;
