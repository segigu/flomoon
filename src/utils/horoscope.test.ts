/**
 * @jest-environment jsdom
 */

import { buildDailyPrompt } from './horoscope';
import type { UserProfileData, PartnerData } from './userContext';

// Helper to create test user profile
const createUserProfile = (name: string): UserProfileData => ({
  id: 'user-123',
  email: 'test@example.com',
  display_name: name,
  birth_date: '1990-01-15',
  birth_time: '14:30',
  birth_place: 'Moscow',
  birth_latitude: 55.7558,
  birth_longitude: 37.6173,
  current_latitude: 55.7558,
  current_longitude: 37.6173,
  location_access_enabled: true,
  cycle_tracking_enabled: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
});

// Helper to create test partner
const createPartner = (name: string): PartnerData => ({
  id: 'partner-123',
  user_id: 'user-123',
  name,
  partner_name: name,
  birth_date: '1992-05-20',
  birth_time: '10:00',
  birth_place: 'St. Petersburg',
  birth_latitude: 59.9343,
  birth_longitude: 30.3351,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
});

describe('horoscope.ts - Adaptive Prompt Generation (Phase 1)', () => {
  const testDate = '2025-01-15';
  const testAstroHighlights = [
    'Moon in Pisces today',
    'Venus trine Mars tomorrow',
  ];
  const testWeatherSummary = 'Sunny, +5°C';
  const testCycleHint = 'Day 5 of cycle, ovulation approaching';

  describe('buildDailyPrompt() - 8 combinations (partner × weather × cycle)', () => {
    it('1. WITH partner, WITH weather, WITH cycle', () => {
      const userProfile = createUserProfile('Alice');
      const userPartner = createPartner('Bob');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        testWeatherSummary,
        testCycleHint,
        [],
        'ru',
        userProfile,
        userPartner
      );

      // Should mention partner name
      expect(prompt).toContain('Bob');
      // Should include weather
      expect(prompt).toContain(testWeatherSummary);
      // Should include cycle hint
      expect(prompt).toContain(testCycleHint);
    });

    it('2. WITH partner, WITH weather, WITHOUT cycle', () => {
      const userProfile = createUserProfile('Alice');
      const userPartner = createPartner('Bob');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        testWeatherSummary,
        null, // NO cycle
        [],
        'ru',
        userProfile,
        userPartner
      );

      expect(prompt).toContain('Bob');
      expect(prompt).toContain(testWeatherSummary);
      expect(prompt).not.toContain('Цикл:'); // No cycle section
    });

    it('3. WITH partner, WITHOUT weather, WITH cycle', () => {
      const userProfile = createUserProfile('Alice');
      const userPartner = createPartner('Bob');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        null, // NO weather
        testCycleHint,
        [],
        'ru',
        userProfile,
        userPartner
      );

      expect(prompt).toContain('Bob');
      expect(prompt).not.toContain('Погода на день:'); // No weather section
      expect(prompt).toContain(testCycleHint);
    });

    it('4. WITH partner, WITHOUT weather, WITHOUT cycle', () => {
      const userProfile = createUserProfile('Alice');
      const userPartner = createPartner('Bob');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        null,
        null,
        [],
        'ru',
        userProfile,
        userPartner
      );

      expect(prompt).toContain('Bob');
      expect(prompt).not.toContain('Погода на день:');
      expect(prompt).not.toContain('Цикл:');
    });

    it('5. WITHOUT partner, WITH weather, WITH cycle', () => {
      const userProfile = createUserProfile('Alice');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        testWeatherSummary,
        testCycleHint,
        [],
        'ru',
        userProfile,
        null // NO partner
      );

      // Should use default "партнёр" instead of specific name
      expect(prompt).toContain('партнёр');
      expect(prompt).toContain(testWeatherSummary);
      expect(prompt).toContain(testCycleHint);
    });

    it('6. WITHOUT partner, WITH weather, WITHOUT cycle', () => {
      const userProfile = createUserProfile('Alice');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        testWeatherSummary,
        null,
        [],
        'ru',
        userProfile,
        null
      );

      expect(prompt).toContain('партнёр');
      expect(prompt).toContain(testWeatherSummary);
      expect(prompt).not.toContain('Цикл:');
    });

    it('7. WITHOUT partner, WITHOUT weather, WITH cycle', () => {
      const userProfile = createUserProfile('Alice');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        null,
        testCycleHint,
        [],
        'ru',
        userProfile,
        null
      );

      expect(prompt).toContain('партнёр');
      expect(prompt).not.toContain('Погода на день:');
      expect(prompt).toContain(testCycleHint);
    });

    it('8. WITHOUT partner, WITHOUT weather, WITHOUT cycle (minimal)', () => {
      const userProfile = createUserProfile('Alice');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        null,
        null,
        [],
        'ru',
        userProfile,
        null
      );

      expect(prompt).toContain('партнёр');
      expect(prompt).not.toContain('Погода на день:');
      expect(prompt).not.toContain('Цикл:');
      // Should still have basic structure
      expect(prompt).toContain('гороскоп');
    });
  });

  describe('buildDailyPrompt() - NO hardcoded names (universal app)', () => {
    it('should NOT contain hardcoded "Настя" when using null profile', () => {
      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        null,
        null,
        [],
        'ru',
        null, // No profile - should use fallback
        null
      );

      // Should not contain old hardcoded name
      expect(prompt).not.toContain('Настя');
    });

    it('should NOT contain hardcoded "Сергей" when using null partner', () => {
      const userProfile = createUserProfile('Alice');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        null,
        null,
        [],
        'ru',
        userProfile,
        null // No partner - should use default "партнёр"
      );

      // Should not contain old hardcoded partner name
      expect(prompt).not.toContain('Сергей');
      expect(prompt).not.toContain('Sergey');
    });
  });

  describe('buildDailyPrompt() - Localization (universal defaults)', () => {
    it('should use English partner default when language=en and no partner', () => {
      const userProfile = createUserProfile('Alice');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        null,
        null,
        [],
        'en',
        userProfile,
        null
      );

      // English prompt should have "partner" (lowercase)
      expect(prompt.toLowerCase()).toContain('partner');
      expect(prompt).not.toContain('партнёр'); // Not Russian
    });

    it('should use German partner default when language=de and no partner', () => {
      const userProfile = createUserProfile('Alice');

      const prompt = buildDailyPrompt(
        testDate,
        testAstroHighlights,
        null,
        null,
        [],
        'de',
        userProfile,
        null
      );

      // German prompt should have "Partner" (capitalized)
      expect(prompt).toContain('Partner');
      expect(prompt).not.toContain('партнёр'); // Not Russian
    });
  });
});
