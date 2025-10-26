// src/data/userProfile.ts
import type { AstroProfile } from './astroProfiles';

/**
 * Универсальная структура профиля пользователя.
 * Содержит все данные для персонализации AI-контента, гороскопов, историй.
 */
export interface UserProfile {
  /** Уникальный идентификатор пользователя */
  id: string;

  /** Полное имя для внутреннего использования */
  name: string;

  /** Отображаемое имя для UI (например, "Настя", "Твой") */
  displayName: string;

  /** Ссылка на ID астрологического профиля из astroProfiles.ts */
  astroProfileId: AstroProfile['id'];

  /** Партнёры для синастрии (например, романтические отношения) */
  relationshipPartners?: Array<{
    profileId: AstroProfile['id'];
    relationshipType: 'romantic' | 'family' | 'friend';
    name: string; // Имя партнёра для текстов
  }>;

  /** Контекст для персонализации AI-генерации */
  context: {
    /** Географическая локация (например, "Европа") */
    location: string;

    /** Черты личности для AI (например, ["самоирония", "чёрный юмор"]) */
    personalityTraits: string[];

    /** Стиль общения AI с пользователем */
    communicationStyle: 'sarcastic' | 'supportive' | 'direct' | 'gentle';

    /** Уровень ненормативной лексики в AI-ответах */
    profanityLevel: 'none' | 'light' | 'medium' | 'heavy';
  };

  /** Настройки пользователя */
  preferences: {
    /** Стиль гороскопов */
    horoscopeStyle: 'weekly' | 'daily' | 'both';

    /** Сложность интерактивных историй */
    storyComplexity: 'simple' | 'moderate' | 'deep';

    /** Включены ли push-уведомления */
    notificationsEnabled: boolean;
  };
}

/**
 * Словарь всех пользователей системы.
 * Ключ - уникальный ID пользователя.
 */
export const USER_PROFILES: Record<string, UserProfile> = {
  nastia: {
    id: 'nastia',
    name: 'Настя',
    displayName: 'Настя',
    astroProfileId: 'nastia',

    relationshipPartners: [
      {
        profileId: 'sergey',
        relationshipType: 'romantic',
        name: 'Сергей',
      },
    ],

    context: {
      location: 'Европа',
      personalityTraits: [
        'самоирония',
        'чёрный юмор',
        'усталость',
        'держится на характере',
      ],
      communicationStyle: 'sarcastic',
      profanityLevel: 'heavy',
    },

    preferences: {
      horoscopeStyle: 'both',
      storyComplexity: 'deep',
      notificationsEnabled: true,
    },
  },
};

/**
 * ID текущего активного пользователя.
 * В будущем будет загружаться из localStorage после авторизации.
 * Пока константа для совместимости.
 */
export const CURRENT_USER_ID = 'nastia';

/**
 * Получить профиль текущего активного пользователя.
 * @throws {Error} Если пользователь с CURRENT_USER_ID не найден.
 */
export function getCurrentUser(): UserProfile {
  const user = USER_PROFILES[CURRENT_USER_ID];

  if (!user) {
    throw new Error(
      `User profile not found: ${CURRENT_USER_ID}. ` +
      `Available profiles: ${Object.keys(USER_PROFILES).join(', ')}`
    );
  }

  return user;
}
