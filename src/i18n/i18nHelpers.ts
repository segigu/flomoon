import i18n from './config';
import { SupportedLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './config';

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Get the current language code
 */
export function getCurrentLanguage(): SupportedLanguage {
  const currentLang = i18n.language;
  return isSupportedLanguage(currentLang) ? currentLang : DEFAULT_LANGUAGE;
}

/**
 * Change the application language
 * This will:
 * 1. Update i18next language
 * 2. Update localStorage
 * 3. Trigger re-render
 *
 * Note: Sync with Supabase should be done separately via updateUserProfile
 */
export async function changeLanguage(languageCode: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(languageCode);
  // i18next will automatically update localStorage via LanguageDetector
}

/**
 * Load language from user profile
 * This should be called when user profile is loaded from Supabase
 *
 * @param languageCode - Language code from Supabase user profile
 */
export async function loadLanguageFromProfile(languageCode: string | null | undefined): Promise<void> {
  if (languageCode && isSupportedLanguage(languageCode)) {
    await changeLanguage(languageCode);
  } else {
    // Fallback to default language
    await changeLanguage(DEFAULT_LANGUAGE);
  }
}

/**
 * Get language name in its native form
 */
export function getLanguageName(languageCode: SupportedLanguage): string {
  const languageNames: Record<SupportedLanguage, string> = {
    ru: 'Русский',
    en: 'English',
    de: 'Deutsch',
  };
  return languageNames[languageCode];
}

/**
 * Get all supported languages with their native names
 */
export function getSupportedLanguages(): Array<{ code: SupportedLanguage; name: string }> {
  return SUPPORTED_LANGUAGES.map(code => ({
    code,
    name: getLanguageName(code),
  }));
}
