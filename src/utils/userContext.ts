/**
 * User Context Utility
 *
 * Provides helper functions to extract and format user/partner data
 * from Supabase database for AI prompts and content generation.
 *
 * Replaces hardcoded data from src/data/userProfile.ts
 */

export interface UserProfileData {
  display_name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  birth_latitude?: number;
  birth_longitude?: number;
  current_latitude?: number;
  current_longitude?: number;
  language_code?: string;
  location_access_enabled?: boolean;
  cycle_tracking_enabled?: boolean;
  [key: string]: any;
}

export interface PartnerData {
  name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  birth_latitude?: number;
  birth_longitude?: number;
  [key: string]: any;
}

/**
 * Extract user's display name from profile
 * @param profile User profile from Supabase
 * @param fallback Fallback name if not available
 * @returns Display name or fallback
 */
export function getUserName(profile: UserProfileData | null | undefined, fallback = ''): string {
  return profile?.display_name || fallback;
}

/**
 * Extract partner's name from partner data
 * @param partner Partner data from Supabase
 * @param fallback Fallback name if not available
 * @returns Partner name or fallback
 */
export function getPartnerName(partner: PartnerData | null | undefined, fallback = ''): string {
  return partner?.name || fallback;
}

/**
 * Get language code from user profile
 * @param profile User profile from Supabase
 * @param fallback Fallback language code
 * @returns Language code (e.g., 'ru', 'en', 'de')
 */
export function getLanguage(profile: UserProfileData | null | undefined, fallback = 'ru'): string {
  return profile?.language_code || fallback;
}

/**
 * Check if user has partner data with sufficient information
 * @param partner Partner data from Supabase
 * @returns True if partner exists with name AND birth date (required for astrology)
 */
export function hasPartner(partner: PartnerData | null | undefined): boolean {
  // Partner must have both name AND birth date for meaningful astrology calculations
  return !!(partner?.name && partner?.birth_date);
}

/**
 * Format user context for AI prompts
 * Returns object with user/partner names for prompt generation
 *
 * @param profile User profile from Supabase
 * @param partner Partner data from Supabase
 * @returns Object with userName and partnerName
 */
export function formatUserContext(
  profile: UserProfileData | null | undefined,
  partner: PartnerData | null | undefined
): { userName: string; partnerName: string } {
  return {
    userName: getUserName(profile),
    partnerName: getPartnerName(partner),
  };
}

/**
 * Get user birth data for astrology calculations
 * @param profile User profile from Supabase
 * @returns Birth data object or null if incomplete
 */
export function getUserBirthData(profile: UserProfileData | null | undefined): {
  date: string;
  time?: string;
  place?: string;
  latitude?: number;
  longitude?: number;
} | null {
  if (!profile?.birth_date) {
    return null;
  }

  return {
    date: profile.birth_date,
    time: profile.birth_time,
    place: profile.birth_place,
    latitude: profile.birth_latitude,
    longitude: profile.birth_longitude,
  };
}

/**
 * Get partner birth data for astrology calculations
 * @param partner Partner data from Supabase
 * @returns Birth data object or null if incomplete
 */
export function getPartnerBirthData(partner: PartnerData | null | undefined): {
  date: string;
  time?: string;
  place?: string;
  latitude?: number;
  longitude?: number;
} | null {
  if (!partner?.birth_date) {
    return null;
  }

  return {
    date: partner.birth_date,
    time: partner.birth_time,
    place: partner.birth_place,
    latitude: partner.birth_latitude,
    longitude: partner.birth_longitude,
  };
}

/**
 * Check if user has granted location access
 * @param profile User profile from Supabase
 * @returns True if location access is enabled, false otherwise (default: false for privacy)
 */
export function hasLocationAccess(profile: UserProfileData | null | undefined): boolean {
  // Privacy-first: default to false if not explicitly set
  return profile?.location_access_enabled === true;
}

/**
 * Get user's current coordinates for weather/location features
 * @param profile User profile from Supabase
 * @returns Coordinates object or null if not available or access denied
 */
export function getUserCoordinates(
  profile: UserProfileData | null | undefined
): { latitude: number; longitude: number } | null {
  // Privacy-first: check location access permission
  if (!hasLocationAccess(profile)) {
    return null;
  }

  // Check if coordinates are available
  if (
    profile?.current_latitude !== undefined &&
    profile?.current_latitude !== null &&
    profile?.current_longitude !== undefined &&
    profile?.current_longitude !== null
  ) {
    return {
      latitude: profile.current_latitude,
      longitude: profile.current_longitude,
    };
  }

  return null;
}

/**
 * Check if cycle tracking is enabled for the user
 * @param profile User profile from Supabase
 * @returns True if cycle tracking is enabled (default: true for main app feature)
 */
export function isCycleTrackingEnabled(profile: UserProfileData | null | undefined): boolean {
  // Default to true if not explicitly set (backward compatibility + main app feature)
  if (profile?.cycle_tracking_enabled === undefined || profile?.cycle_tracking_enabled === null) {
    return true;
  }
  return profile.cycle_tracking_enabled === true;
}
