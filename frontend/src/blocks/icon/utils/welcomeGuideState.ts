import { getInitialOnboardingState } from "@/common/helpers/onboarding";

/**
 * Module-scoped so the guide auto-opens at most once per editor session.
 *
 * A per-block flag would not be enough: the localized "seen" state is a snapshot taken when
 * the page loaded, so after dismissing the guide on one Icon block it would still read as
 * unseen when a second Icon block is selected.
 */
let autoOpened = false;

export function shouldAutoOpenWelcomeGuide(): boolean {
  if (autoOpened || getInitialOnboardingState().editorGuide) {
    return false;
  }

  autoOpened = true;

  return true;
}

/** Test seam — resets the once-per-session latch. */
export function resetWelcomeGuideLatch(): void {
  autoOpened = false;
}
