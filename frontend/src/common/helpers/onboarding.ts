import config from "@/config/config";
import type { OnboardingFlag, OnboardingState } from "@/types/onboarding";

import { restRequest } from "./restRequest";
import { tryCatch } from "./tryCatch";

/**
 * Per-user onboarding state, localized into the page by Views\Head so the first paint
 * already knows whether to show anything. Shared by the admin app and the block editor.
 */
export function getInitialOnboardingState(): OnboardingState {
  return { ...config.ONBOARDING };
}

/**
 * Record that the user has seen or dismissed one onboarding surface.
 *
 * Deliberately fire-and-forget: onboarding UI closes immediately and a failed write only
 * means the user sees the wizard once more, which is far better than blocking the UI on
 * a network round trip.
 */
export async function markOnboardingSeen(flag: OnboardingFlag, seen = true): Promise<void> {
  await tryCatch(restRequest<unknown>("onboarding", { method: "POST", body: { [flag]: seen } }));
}
