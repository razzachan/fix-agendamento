
import React from "react";
import { ServiceOrderStatus } from "@/types";
import { getServiceFlow, ServiceFlowStep } from "@/utils/serviceFlowUtils";

interface UseServiceFlowResult {
  serviceFlow: ServiceFlowStep[];
  currentStep?: ServiceFlowStep;
  nextStep?: ServiceFlowStep;
}

export const useServiceFlow = (
  attendanceType: "em_domicilio" | "coleta_conserto" | "coleta_diagnostico",
  currentStatus?: ServiceOrderStatus
): UseServiceFlowResult => {
  // Validate the type to ensure it's one of the allowed values
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType
    : "em_domicilio";

  // Get the service flow for the specified attendance type
  const serviceFlow = getServiceFlow(validType);

  // Find the current step in the flow
  const currentStepIndex = currentStatus
    ? serviceFlow.findIndex(step => step.status === currentStatus)
    : -1;

  const currentStep = currentStepIndex >= 0 ? serviceFlow[currentStepIndex] : undefined;
  const nextStep = currentStepIndex >= 0 && currentStepIndex < serviceFlow.length - 1
    ? serviceFlow[currentStepIndex + 1]
    : undefined;

  // Log apenas em caso de erro
  if (currentStepIndex === -1 && currentStatus) {
    console.warn(`useServiceFlow: WARNING - Status "${currentStatus}" not found in flow for type "${validType}"`);
  }

  return { serviceFlow, currentStep, nextStep };
};

export default useServiceFlow;
