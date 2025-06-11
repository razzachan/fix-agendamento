
import React from 'react';
import SchedulingSection from './SchedulingSection';
import { SchedulingProvider } from './SchedulingContext';
import LoadingIndicator from './LoadingIndicator';

const SchedulingWrapper = () => {
  return (
    <SchedulingProvider>
      <div className="space-y-4 bg-muted/30 p-4 rounded-md">
        <SchedulingSection />
        <LoadingIndicator />
      </div>
    </SchedulingProvider>
  );
};

export default SchedulingWrapper;
