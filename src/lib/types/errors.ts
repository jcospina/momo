export const HOUSEHOLD_ERROR_CODES = [
  'household_name_required', // Trying to create a household without name
  'household_create_failed', // Error creating the household
  'household_membership_create_failed', // Error inserting an user into a household
  'household_full', // Household is full
  'household_invalid', // Error fetching household
  'no_household', // Household doesn't exists
  'user_has_a_household', // An user with household tried to get into another household
] as const;

export const PROFILE_ERRORS = ['profile_create_failed'] as const; // could not create profile for user

export const USER_PREFS_ERROR = ['user_pref_update_failed'] as const;

export const AUTH_ERRORS = [
  'auth_required', // Tried to fetch information without login
  'auth_exchange_failed', // Could not get session information
  'auth_user_missing', // Something very weird happened during login and there is no user,
  'auth_provider_failed', // Login with Google failed
  'auth_invalid_credentials', // signInWithPassword returned an auth error
  'auth_email_invalid', // Submitted email did not match the validation regex
  'auth_password_too_short', // Submitted password shorter than the minimum
  'auth_email_in_use', // Signup against an email that already exists
  'auth_signup_failed', // Generic signup failure
  'auth_demo_not_configured', // Demo env vars missing on the server
  'logout_failed',
] as const;

export type HouseholdError = (typeof HOUSEHOLD_ERROR_CODES)[number];
export type AuthErrors = (typeof AUTH_ERRORS)[number];
export type ProfileErrors = (typeof PROFILE_ERRORS)[number];

export type UserPreferencesError = (typeof USER_PREFS_ERROR)[number];

export type MomoError =
  | HouseholdError
  | AuthErrors
  | ProfileErrors
  | UserPreferencesError;
