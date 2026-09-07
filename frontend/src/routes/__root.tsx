import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { Button, Tooltip } from "antd";
import { useEffect } from "react";
import { FiHelpCircle, FiSettings } from "react-icons/fi";

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
      {/* Only the first right-hand control carries ml-auto: a second auto margin would split
          the free space between them instead of keeping the pair together on the right. */}
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

        <Tooltip title="Settings">
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex items-center text-gray-500 hover:text-gray-900"
            activeProps={{ className: "flex items-center text-gray-900" }}
          >
            <FiSettings size={18} />
          </Link>
        </Tooltip>
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
