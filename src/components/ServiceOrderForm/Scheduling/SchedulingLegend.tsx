
import React from 'react';

const SchedulingLegend = () => {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className="flex items-center">
        <span className="inline-block w-3 h-3 bg-green-100 rounded-full mr-1"></span>
        <span>Disponível</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-3 h-3 bg-yellow-100 rounded-full mr-1"></span>
        <span>Parcial</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-3 h-3 bg-red-100 rounded-full mr-1"></span>
        <span>Lotado</span>
      </div>
    </div>
  );
};

export default SchedulingLegend;
