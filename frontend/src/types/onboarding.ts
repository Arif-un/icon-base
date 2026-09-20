export type OnboardingFlag = "adminTour" | "editorGuide" | "wizard";

export interface OnboardingState {
  adminTour: boolean;
  editorGuide: boolean;
  version: number;
  wizard: boolean;
}
