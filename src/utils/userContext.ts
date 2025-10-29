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
  language_code?: string;
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
 * Check if user has partner data
 * @param partner Partner data from Supabase
 * @returns True if partner exists and has name
 */
export function hasPartner(partner: PartnerData | null | undefined): boolean {
  return !!(partner?.name);
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
