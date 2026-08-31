import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Button } from "antd";
import { useEffect } from "react";
import { FiHelpCircle } from "react-icons/fi";

import { __ } from "../common/helpers/i18nWrap";
import { syncWpBackground } from "../common/helpers/syncWpBackground";
import { DevtoolsPortal } from "../components/DevtoolsPortal";
import Logo from "../components/Logo";
import AdminTour from "../components/onboarding/AdminTour";
import { OnboardingProvider } from "../components/onboarding/OnboardingProvider";
import { TOUR_ANCHOR } from "../components/onboarding/tourSteps";
import { useOnboarding } from "../components/onboarding/useOnboarding";
import WelcomeWizard from "../components/onboarding/WelcomeWizard";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => {
    syncWpBackground();
  }, []);

  return (
    <OnboardingProvider>
      <Shell />
    </OnboardingProvider>
  );
}

function Shell() {
  const { startTour } = useOnboarding();

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 px-4 pl-10">
        <Logo size={28} />
        <h3 className="m-0 text-lg font-semibold">Icon Indexa</h3>

        <Button
          data-tour={TOUR_ANCHOR.tourButton}
          className="ml-auto"
          size="small"
          icon={<FiHelpCircle />}
          onClick={startTour}
        >
          {__("Take a tour")}
        </Button>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <WelcomeWizard />
      <AdminTour />
      <DevtoolsPortal />
    </div>
  );
}
