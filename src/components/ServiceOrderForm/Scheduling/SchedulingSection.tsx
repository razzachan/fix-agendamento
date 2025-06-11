
import React from 'react';
import CalendarSelector from './CalendarSelector';
import TimeSlotPicker from './TimeSlotPicker';
import TechnicianSelector from './TechnicianSelector';
import SchedulingLegend from './SchedulingLegend';

const SchedulingSection = () => {
  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Agendamento</h3>
        <SchedulingLegend />
      </div>
      
      <TechnicianSelector />
      <CalendarSelector />
      <TimeSlotPicker />
    </>
  );
};

export default SchedulingSection;
