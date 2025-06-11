
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Technician, ScheduledService } from '@/types';
import { scheduledServiceService } from '@/services';
import { technicianService } from '@/services/technician/technicianService';
import { format } from "date-fns";

export const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00"
];

interface SchedulingContextType {
  technicians: Technician[];
  scheduledServices: ScheduledService[];
  isLoading: boolean;
  availableTimeSlots: string[];
  monthSchedule: Record<string, number>;
  selectedDate: string | undefined;
  selectedTime: string | undefined;
  selectedTechnicianId: string | undefined;
}

const SchedulingContext = createContext<SchedulingContextType | undefined>(undefined);

export const useScheduling = () => {
  const context = useContext(SchedulingContext);
  if (!context) {
    throw new Error('useScheduling must be used within a SchedulingProvider');
  }
  return context;
};

export const SchedulingProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { watch } = useFormContext();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(timeSlots);
  const [monthSchedule, setMonthSchedule] = useState<Record<string, number>>({});
  
  const selectedDate = watch('scheduledDate');
  const selectedTime = watch('scheduledTime');
  const selectedTechnicianId = watch('technicianId');

  // Fetch technicians data
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const techsData = await technicianService.getAll();
        setTechnicians(techsData);
      } catch (error) {
        console.error("Error fetching technicians:", error);
      }
    };
    
    fetchTechnicians();
  }, []);

  // Fetch monthly schedule data when technician changes
  useEffect(() => {
    const fetchMonthlySchedule = async () => {
      if (!selectedTechnicianId) return;
      
      setIsLoading(true);
      try {
        // Get current month date range
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        // Get all services for this month
        const services = await scheduledServiceService.getByDateRange(startOfMonth, endOfMonth);
        const techServices = services.filter(service => service.technicianId === selectedTechnicianId);
        
        // Create a map of dates with appointment counts
        const scheduleCounts: Record<string, number> = {};
        techServices.forEach(service => {
          const dateKey = format(new Date(service.scheduledStartTime), 'yyyy-MM-dd');
          scheduleCounts[dateKey] = (scheduleCounts[dateKey] || 0) + 1;
        });
        
        setMonthSchedule(scheduleCounts);
      } catch (error) {
        console.error("Error fetching monthly schedule:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMonthlySchedule();
  }, [selectedTechnicianId]);

  // Fetch scheduled services for the selected date and technician
  useEffect(() => {
    const fetchScheduledServices = async () => {
      if (!selectedDate || !selectedTechnicianId) return;
      
      setIsLoading(true);
      try {
        const services = await scheduledServiceService.getTechnicianSchedule(
          selectedTechnicianId, 
          new Date(selectedDate)
        );
        setScheduledServices(services);
        
        // Update available time slots
        updateAvailableTimeSlots(services);
      } catch (error) {
        console.error("Error fetching scheduled services:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchScheduledServices();
  }, [selectedDate, selectedTechnicianId]);

  // Update available time slots based on existing schedules
  const updateAvailableTimeSlots = (services: ScheduledService[]) => {
    const bookedSlots = new Set<string>();
    
    services.forEach(service => {
      const startTime = new Date(service.scheduledStartTime);
      // Extract just the hour and minutes as "HH:MM"
      const timeSlot = format(startTime, "HH:mm");
      bookedSlots.add(timeSlot);
    });
    
    // Filter available time slots
    const available = timeSlots.filter(slot => !bookedSlots.has(slot));
    setAvailableTimeSlots(available);
  };

  return (
    <SchedulingContext.Provider 
      value={{ 
        technicians,
        scheduledServices,
        isLoading,
        availableTimeSlots,
        monthSchedule,
        selectedDate,
        selectedTime,
        selectedTechnicianId
      }}
    >
      {children}
    </SchedulingContext.Provider>
  );
};
