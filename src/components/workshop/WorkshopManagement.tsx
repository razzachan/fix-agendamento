
import React from 'react';
import { User } from '@/types';
import WorkshopsList from './WorkshopsList';
import WorkshopActions from './WorkshopActions';
import WorkshopDialogs from './WorkshopDialogs';
import { useWorkshopManagement } from './hooks/useWorkshopManagement';

interface WorkshopManagementProps {
  isAdmin: boolean;
}

const WorkshopManagement: React.FC<WorkshopManagementProps> = ({ isAdmin }) => {
  const {
    workshops,
    isLoading,
    isWorkshopFormDialogOpen,
    setIsWorkshopFormDialogOpen,
    isWorkshopEditDialogOpen,
    setIsWorkshopEditDialogOpen,
    selectedWorkshop,
    handleEditWorkshop,
    handleDeleteWorkshop,
    handleAddSuccess,
    handleEditSuccess,
    refreshWorkshops
  } = useWorkshopManagement();

  return (
    <>
      <WorkshopActions 
        isAdmin={isAdmin}
        onAddWorkshop={() => setIsWorkshopFormDialogOpen(true)} 
      />

      <WorkshopsList 
        workshops={workshops}
        onDelete={handleDeleteWorkshop}
        onEdit={handleEditWorkshop}
        onRefresh={refreshWorkshops}
        isLoading={isLoading}
      />

      <WorkshopDialogs
        formDialogOpen={isWorkshopFormDialogOpen}
        setFormDialogOpen={setIsWorkshopFormDialogOpen}
        editDialogOpen={isWorkshopEditDialogOpen}
        setEditDialogOpen={setIsWorkshopEditDialogOpen}
        selectedWorkshop={selectedWorkshop}
        onAddSuccess={handleAddSuccess}
        onEditSuccess={handleEditSuccess}
      />
    </>
  );
};

export default WorkshopManagement;
