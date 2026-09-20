import { useCallback, useMemo, useState, type ReactNode } from "react";

import { getInitialOnboardingState, markOnboardingSeen } from "@/common/helpers/onboarding";

import { OnboardingContext } from "./context";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => getInitialOnboardingState(), []);
  const [isWizardOpen, setIsWizardOpen] = useState(() => !initial.wizard);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Finishing and dismissing are the same commitment: the user has seen the wizard and it
  // must never reappear on its own. The tour stays launchable from the header afterwards.
  const closeWizard = useCallback(() => {
    setIsWizardOpen(false);
    void markOnboardingSeen("wizard");
  }, []);

  const startTour = useCallback(() => {
    setIsWizardOpen(false);
    setIsTourOpen(true);
    void markOnboardingSeen("wizard");
  }, []);

  const endTour = useCallback(() => {
    setIsTourOpen(false);
    void markOnboardingSeen("adminTour");
  }, []);

  // Used by the final CTA, which navigates away from this page. Awaiting the write first
  // avoids racing the unload and re-showing the wizard on the next visit.
  const finishWizard = useCallback(async () => {
    await markOnboardingSeen("wizard");
    setIsWizardOpen(false);
  }, []);

  const value = useMemo(
    () => ({ closeWizard, endTour, finishWizard, isTourOpen, isWizardOpen, startTour }),
    [closeWizard, endTour, finishWizard, isTourOpen, isWizardOpen, startTour],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
