import { createContext } from "react";

export interface OnboardingContextValue {
  closeWizard: () => void;
  endTour: () => void;
  finishWizard: () => Promise<void>;
  isTourOpen: boolean;
  isWizardOpen: boolean;
  startTour: () => void;
}

export const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);
