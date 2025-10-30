import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import Russian translations
import ruCommon from './locales/ru/common.json';
import ruTabs from './locales/ru/tabs.json';
import ruAuth from './locales/ru/auth.json';
import ruProfile from './locales/ru/profile.json';
import ruProfileSetup from './locales/ru/profileSetup.json';
import ruCalendar from './locales/ru/calendar.json';
import ruSettings from './locales/ru/settings.json';
import ruDiscover from './locales/ru/discover.json';
import ruNotifications from './locales/ru/notifications.json';
import ruErrors from './locales/ru/errors.json';
import ruValidation from './locales/ru/validation.json';
import ruInsights from './locales/ru/insights.json';

// Import English translations (будут переведены в задаче 2.5.3)
import enCommon from './locales/en/common.json';
import enTabs from './locales/en/tabs.json';
import enAuth from './locales/en/auth.json';
import enProfile from './locales/en/profile.json';
import enProfileSetup from './locales/en/profileSetup.json';
import enCalendar from './locales/en/calendar.json';
import enSettings from './locales/en/settings.json';
import enDiscover from './locales/en/discover.json';
import enNotifications from './locales/en/notifications.json';
import enErrors from './locales/en/errors.json';
import enValidation from './locales/en/validation.json';
import enInsights from './locales/en/insights.json';

// Import German translations (будут переведены в задаче 2.5.3)
import deCommon from './locales/de/common.json';
import deTabs from './locales/de/tabs.json';
import deAuth from './locales/de/auth.json';
import deProfile from './locales/de/profile.json';
import deProfileSetup from './locales/de/profileSetup.json';
import deCalendar from './locales/de/calendar.json';
import deSettings from './locales/de/settings.json';
import deDiscover from './locales/de/discover.json';
import deNotifications from './locales/de/notifications.json';
import deErrors from './locales/de/errors.json';
import deValidation from './locales/de/validation.json';
import deInsights from './locales/de/insights.json';

// Supported languages
export const SUPPORTED_LANGUAGES = ['ru', 'en', 'de'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Default language (fallback when user language not set or not supported)
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Translation resources
const resources = {
  ru: {
    common: ruCommon,
    tabs: ruTabs,
    auth: ruAuth,
    profile: ruProfile,
    profileSetup: ruProfileSetup,
    calendar: ruCalendar,
    settings: ruSettings,
    discover: ruDiscover,
    notifications: ruNotifications,
    errors: ruErrors,
    validation: ruValidation,
    insights: ruInsights,
  },
  en: {
    common: enCommon,
    tabs: enTabs,
    auth: enAuth,
    profile: enProfile,
    profileSetup: enProfileSetup,
    calendar: enCalendar,
    settings: enSettings,
    discover: enDiscover,
    notifications: enNotifications,
    errors: enErrors,
    validation: enValidation,
    insights: enInsights,
  },
  de: {
    common: deCommon,
    tabs: deTabs,
    auth: deAuth,
    profile: deProfile,
    profileSetup: deProfileSetup,
    calendar: deCalendar,
    settings: deSettings,
    discover: deDiscover,
    notifications: deNotifications,
    errors: deErrors,
    validation: deValidation,
    insights: deInsights,
  },
};

i18n
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE, // Fallback to English if language not set
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'common',
    ns: [
      'common',
      'tabs',
      'auth',
      'profile',
      'profileSetup',
      'calendar',
      'settings',
      'discover',
      'notifications',
      'errors',
      'validation',
      'insights',
    ],
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    // Language is now managed by database (users.language_code)
    // Initial language set from DB on login, changed via Settings modal
    react: {
      useSuspense: false, // Disable suspense for now
    },
  });

export default i18n;
