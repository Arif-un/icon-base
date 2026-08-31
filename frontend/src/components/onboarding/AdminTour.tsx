import { Tour } from "antd";

import { useShadowRoot } from "@/bootstrap/createReactShadow";

import { getAdminTourSteps } from "./tourSteps";
import { useOnboarding } from "./useOnboarding";

export default function AdminTour() {
  const { endTour, isTourOpen } = useOnboarding();
  const shadowRoot = useShadowRoot();

  // Unlike its other popups, antd's Tour does not read getPopupContainer from ConfigProvider
  // context — it only forwards a prop of that name through to rc-tour. Without this the mask
  // and popover portal into document.body, outside the shadow root, and render unstyled.
  function getPopupContainer(): HTMLElement {
    return shadowRoot?.querySelector<HTMLElement>("[data-app-root]") ?? document.body;
  }

  return (
    <Tour
      open={isTourOpen}
      onClose={endTour}
      onFinish={endTour}
      steps={getAdminTourSteps(shadowRoot ?? null)}
      getPopupContainer={getPopupContainer}
    />
  );
}
