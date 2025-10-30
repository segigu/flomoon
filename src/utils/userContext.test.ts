/**
 * @jest-environment jsdom
 */

import {
  getUserName,
  getPartnerName,
  hasPartner,
  hasLocationAccess,
  getUserCoordinates,
  isCycleTrackingEnabled,
  type UserProfileData,
  type PartnerData,
} from './userContext';

describe('userContext.ts - User Profile Helpers', () => {
  describe('getUserName()', () => {
    it('should return display_name from userProfile if provided', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Alice',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: undefined,
        current_longitude: undefined,
        location_access_enabled: false,
        cycle_tracking_enabled: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(getUserName(profile)).toBe('Alice');
    });

    it('should return empty string when userProfile is null (universal default)', () => {
      expect(getUserName(null)).toBe('');
    });

    it('should return empty string when userProfile is undefined', () => {
      expect(getUserName(undefined)).toBe('');
    });

    it('should return empty string when display_name is null', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: undefined,
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: undefined,
        current_longitude: undefined,
        location_access_enabled: false,
        cycle_tracking_enabled: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(getUserName(profile)).toBe('');
    });

    it('should return empty string when display_name is empty string', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: '',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: undefined,
        current_longitude: undefined,
        location_access_enabled: false,
        cycle_tracking_enabled: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(getUserName(profile)).toBe('');
    });

    it('should accept custom fallback', () => {
      expect(getUserName(null, 'friend')).toBe('friend');
    });

    it('should NOT contain hardcoded "Сергей" or "Настя" anywhere (universal app)', () => {
      const result = getUserName(null);
      expect(result).not.toContain('Сергей');
      expect(result).not.toContain('Sergey');
      expect(result).not.toContain('Настя');
    });
  });

  describe('getPartnerName()', () => {
    it('should return partner name when partner has name', () => {
      const partner: PartnerData = {
        id: 'partner-123',
        user_id: 'user-123',
        name: 'Bob',
        partner_name: 'Bob',
        birth_date: '1990-05-15',
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(getPartnerName(partner)).toBe('Bob');
    });

    it('should return empty string when partner is null (universal default)', () => {
      expect(getPartnerName(null)).toBe('');
    });

    it('should return empty string when partner is undefined', () => {
      expect(getPartnerName(undefined)).toBe('');
    });

    it('should accept custom fallback when provided', () => {
      expect(getPartnerName(null, 'Partner')).toBe('Partner');
    });

    it('should return partner_name if name is null but partner_name exists', () => {
      const partner: PartnerData = {
        id: 'partner-123',
        user_id: 'user-123',
        name: undefined,
        partner_name: 'Charlie',
        birth_date: '1990-05-15',
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(getPartnerName(partner)).toBe('Charlie');
    });

    it('should NOT contain hardcoded "Сергей" anywhere (universal app)', () => {
      const result = getPartnerName(null);
      expect(result).not.toContain('Сергей');
      expect(result).not.toContain('Sergey');
    });
  });

  describe('hasPartner()', () => {
    it('should return true when partner has both name AND birth_date', () => {
      const partner: PartnerData = {
        id: 'partner-123',
        user_id: 'user-123',
        name: 'Bob',
        partner_name: 'Bob',
        birth_date: '1990-05-15',
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(hasPartner(partner)).toBe(true);
    });

    it('should return false when partner is null', () => {
      expect(hasPartner(null)).toBe(false);
    });

    it('should return false when partner is undefined', () => {
      expect(hasPartner(undefined)).toBe(false);
    });

    it('should return false when partner has name but NO birth_date', () => {
      const partner: PartnerData = {
        id: 'partner-123',
        user_id: 'user-123',
        name: 'Bob',
        partner_name: 'Bob',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(hasPartner(partner)).toBe(false);
    });

    it('should return false when partner has birth_date but NO name', () => {
      const partner: PartnerData = {
        id: 'partner-123',
        user_id: 'user-123',
        name: undefined,
        partner_name: undefined,
        birth_date: '1990-05-15',
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(hasPartner(partner)).toBe(false);
    });
  });

  describe('hasLocationAccess()', () => {
    it('should return true when location_access_enabled is true', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Alice',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: 50.0,
        current_longitude: 10.0,
        location_access_enabled: true,
        cycle_tracking_enabled: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(hasLocationAccess(profile)).toBe(true);
    });

    it('should return false when location_access_enabled is false (privacy-first)', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Alice',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: undefined,
        current_longitude: undefined,
        location_access_enabled: false,
        cycle_tracking_enabled: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(hasLocationAccess(profile)).toBe(false);
    });

    it('should return false when profile is null', () => {
      expect(hasLocationAccess(null)).toBe(false);
    });

    it('should return false when profile is undefined', () => {
      expect(hasLocationAccess(undefined)).toBe(false);
    });
  });

  describe('getUserCoordinates()', () => {
    it('should return coordinates when location_access_enabled and coordinates exist', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Alice',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: 50.2584,
        current_longitude: 10.9629,
        location_access_enabled: true,
        cycle_tracking_enabled: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const coords = getUserCoordinates(profile);
      expect(coords).toEqual({ latitude: 50.2584, longitude: 10.9629 });
    });

    it('should return null when location_access_enabled is false (privacy-first)', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Alice',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: 50.0,
        current_longitude: 10.0,
        location_access_enabled: false,
        cycle_tracking_enabled: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(getUserCoordinates(profile)).toBeNull();
    });

    it('should return null when coordinates are null', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Alice',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: undefined,
        current_longitude: undefined,
        location_access_enabled: true,
        cycle_tracking_enabled: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(getUserCoordinates(profile)).toBeNull();
    });

    it('should return null when profile is null', () => {
      expect(getUserCoordinates(null)).toBeNull();
    });
  });

  describe('isCycleTrackingEnabled()', () => {
    it('should return true when cycle_tracking_enabled is true', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Alice',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: undefined,
        current_longitude: undefined,
        location_access_enabled: false,
        cycle_tracking_enabled: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(isCycleTrackingEnabled(profile)).toBe(true);
    });

    it('should return false when cycle_tracking_enabled is false', () => {
      const profile: UserProfileData = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Alice',
        birth_date: undefined,
        birth_time: undefined,
        birth_place: undefined,
        birth_latitude: undefined,
        birth_longitude: undefined,
        current_latitude: undefined,
        current_longitude: undefined,
        location_access_enabled: false,
        cycle_tracking_enabled: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(isCycleTrackingEnabled(profile)).toBe(false);
    });

    it('should return true when profile is null (default for backward compatibility)', () => {
      expect(isCycleTrackingEnabled(null)).toBe(true);
    });

    it('should return true when profile is undefined', () => {
      expect(isCycleTrackingEnabled(undefined)).toBe(true);
    });
  });
});
