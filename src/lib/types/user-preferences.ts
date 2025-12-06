export type OnboardingStatus = 'unknown' | 'skipped' | 'completed';
export interface UserPreferences {
  onboarding_status: OnboardingStatus;
}
