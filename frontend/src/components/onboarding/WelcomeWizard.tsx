import { Button, Modal, Steps } from "antd";
import { useState } from "react";

import { __ } from "@/common/helpers/i18nWrap";
import config from "@/config/config";

import { useOnboarding } from "./useOnboarding";
import { wizardSteps } from "./wizardSteps";

export default function WelcomeWizard() {
  const { closeWizard, finishWizard, isWizardOpen, startTour } = useOnboarding();
  const [current, setCurrent] = useState(0);

  const step = wizardSteps[current];
  const isLastStep = current === wizardSteps.length - 1;

  async function createPost() {
    await finishWizard();
    window.location.assign(config.NEW_POST_URL);
  }

  return (
    <Modal
      open={isWizardOpen}
      onCancel={closeWizard}
      footer={null}
      width={620}
      title={__("Getting started with Icon Indexa")}
    >
      <Steps
        size="small"
        current={current}
        items={wizardSteps.map(({ key, title }) => ({ key, title }))}
      />

      <div className="mt-6 min-h-36 text-sm leading-relaxed">{step.content}</div>

      <div className="mt-6 flex items-center gap-2">
        <Button type="text" onClick={closeWizard}>
          {__("Skip")}
        </Button>

        <div className="ml-auto flex gap-2">
          {current > 0 && (
            <Button
              onClick={() => {
                setCurrent(current - 1);
              }}
            >
              {__("Back")}
            </Button>
          )}

          {isLastStep ? (
            <>
              <Button onClick={startTour}>{__("Take a tour")}</Button>
              <Button
                type="primary"
                onClick={() => {
                  void createPost();
                }}
              >
                {__("Create a new post")}
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              onClick={() => {
                setCurrent(current + 1);
              }}
            >
              {__("Next")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
