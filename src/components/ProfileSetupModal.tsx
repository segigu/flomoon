import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FullScreenModal } from './FullScreenModal';
import { updateUserProfile, upsertPartner, UserProfileUpdate, PartnerUpdate } from '../utils/supabaseProfile';
import { validateBirthDate } from '../utils/dateValidation';
import { validatePlaceWithAI, PlaceInfo } from '../utils/geocoding';
import { getCurrentLocation } from '../utils/geolocation';
import styles from './ProfileSetupModal.module.css';

/**
 * Detect browser language and map to supported languages
 * Priority: browser language → fallback to 'en'
 * Supported: ru, en, de
 */
function detectBrowserLanguage(): string {
  const browserLang = navigator.language.toLowerCase();

  // Direct match for supported languages
  if (browserLang === 'ru' || browserLang.startsWith('ru-')) {
    return 'ru';
  }
  if (browserLang === 'de' || browserLang.startsWith('de-')) {
    return 'de';
  }
  if (browserLang === 'en' || browserLang.startsWith('en-')) {
    return 'en';
  }

  // Default fallback to English for all other languages
  console.log(`⚠️ Unsupported browser language: ${browserLang}, defaulting to 'en'`);
  return 'en';
}

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialName?: string;
  initialBirthDate?: string;
  initialBirthTime?: string;
  initialBirthPlace?: string;
  initialPartner?: any;
  mode?: 'setup' | 'edit';
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialName = '',
  initialBirthDate = '',
  initialBirthTime = '',
  initialBirthPlace = '',
  initialPartner = null,
  mode = 'setup'
}) => {
  const { t } = useTranslation('profileSetup');

  // Профиль пользователя
  const [displayName, setDisplayName] = useState(initialName);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [birthTime, setBirthTime] = useState(initialBirthTime);
  const [birthPlace, setBirthPlace] = useState(initialBirthPlace);

  // Партнёр
  const [hasPartner, setHasPartner] = useState(!!initialPartner);
  const [partnerName, setPartnerName] = useState(initialPartner?.name || '');
  const [partnerBirthDate, setPartnerBirthDate] = useState(initialPartner?.birth_date || '');
  const [partnerBirthTime, setPartnerBirthTime] = useState(initialPartner?.birth_time || '');
  const [partnerBirthPlace, setPartnerBirthPlace] = useState(initialPartner?.birth_place || '');

  // Координаты
  const [birthLatitude, setBirthLatitude] = useState<number | null>(null);
  const [birthLongitude, setBirthLongitude] = useState<number | null>(null);
  const [partnerBirthLatitude, setPartnerBirthLatitude] = useState<number | null>(initialPartner?.birth_latitude || null);
  const [partnerBirthLongitude, setPartnerBirthLongitude] = useState<number | null>(initialPartner?.birth_longitude || null);

  // AI-валидация места
  const [validatingPlace, setValidatingPlace] = useState(false);
  const [placeOptions, setPlaceOptions] = useState<PlaceInfo[]>([]);
  const [validatingPartnerPlace, setValidatingPartnerPlace] = useState(false);
  const [partnerPlaceOptions, setPartnerPlaceOptions] = useState<PlaceInfo[]>([]);

  // Геолокация (текущие координаты)
  const [currentLatitude, setCurrentLatitude] = useState<number | null>(null);
  const [currentLongitude, setCurrentLongitude] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Текущее местоположение (текстовое поле + AI-geocoding)
  const [currentLocation, setCurrentLocation] = useState('');
  const [validatingCurrentLocation, setValidatingCurrentLocation] = useState(false);
  const [currentLocationOptions, setCurrentLocationOptions] = useState<PlaceInfo[]>([]);

  // Настройки приватности/функционала
  const [cycleTrackingEnabled, setCycleTrackingEnabled] = useState(true); // Default true - main app feature

  // UI состояние
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Обновляем все поля при открытии модала
      setDisplayName(initialName);
      setBirthDate(initialBirthDate);
      setBirthTime(initialBirthTime);
      setBirthPlace(initialBirthPlace);
      setHasPartner(!!initialPartner);
      setPartnerName(initialPartner?.name || '');
      setPartnerBirthDate(initialPartner?.birth_date || '');
      setPartnerBirthTime(initialPartner?.birth_time || '');
      setPartnerBirthPlace(initialPartner?.birth_place || '');
    }
  }, [isOpen, initialName, initialBirthDate, initialBirthTime, initialBirthPlace, initialPartner]);

  if (!isOpen) return null;

  // Обработчик AI-валидации места пользователя
  const handleValidatePlace = async () => {
    if (!birthPlace.trim()) {
      setError(t('errors.enterBirthPlace'));
      return;
    }

    setValidatingPlace(true);
    setError(null);
    setPlaceOptions([]);

    try {
      const result = await validatePlaceWithAI(birthPlace);

      if (!result.success) {
        setError(result.error || t('errors.failedToGetCoordinates'));
        return;
      }

      if (!result.places || result.places.length === 0) {
        setError(t('errors.placeNotFound'));
        return;
      }

      // Если один вариант - автоматически заполняем
      if (result.places.length === 1) {
        const place = result.places[0];
        setBirthLatitude(place.latitude);
        setBirthLongitude(place.longitude);
        alert(t('alerts.coordinatesDetermined', { name: place.displayName, lat: place.latitude.toFixed(4), lng: place.longitude.toFixed(4) }));
      } else {
        // Несколько вариантов - показываем выбор
        setPlaceOptions(result.places);
      }
    } catch (err: any) {
      console.error('Place validation error:', err);
      setError(err.message || t('errors.placeValidationError'));
    } finally {
      setValidatingPlace(false);
    }
  };

  // Обработчик AI-валидации места партнёра
  const handleValidatePartnerPlace = async () => {
    if (!partnerBirthPlace.trim()) {
      setError(t('errors.enterPartnerBirthPlace'));
      return;
    }

    setValidatingPartnerPlace(true);
    setError(null);
    setPartnerPlaceOptions([]);

    try {
      const result = await validatePlaceWithAI(partnerBirthPlace);

      if (!result.success) {
        setError(result.error || t('errors.failedToGetCoordinates'));
        return;
      }

      if (!result.places || result.places.length === 0) {
        setError(t('errors.placeNotFound'));
        return;
      }

      // Если один вариант - автоматически заполняем
      if (result.places.length === 1) {
        const place = result.places[0];
        setPartnerBirthLatitude(place.latitude);
        setPartnerBirthLongitude(place.longitude);
        alert(t('alerts.partnerCoordinatesDetermined', { name: place.displayName, lat: place.latitude.toFixed(4), lng: place.longitude.toFixed(4) }));
      } else {
        // Несколько вариантов - показываем выбор
        setPartnerPlaceOptions(result.places);
      }
    } catch (err: any) {
      console.error('Partner place validation error:', err);
      setError(err.message || t('errors.partnerPlaceValidationError'));
    } finally {
      setValidatingPartnerPlace(false);
    }
  };

  // Обработчик AI-валидации текущего местоположения
  const handleValidateCurrentLocation = async () => {
    if (!currentLocation.trim()) {
      setError(t('errors.enterCurrentLocation'));
      return;
    }

    setValidatingCurrentLocation(true);
    setError(null);
    setCurrentLocationOptions([]);

    try {
      const result = await validatePlaceWithAI(currentLocation);

      if (!result.success) {
        setError(result.error || t('errors.failedToGetCoordinates'));
        return;
      }

      if (!result.places || result.places.length === 0) {
        setError(t('errors.placeNotFound'));
        return;
      }

      // Если один вариант - автоматически заполняем
      if (result.places.length === 1) {
        const place = result.places[0];
        setCurrentLatitude(place.latitude);
        setCurrentLongitude(place.longitude);
        alert(t('alerts.currentLocationDetermined', { name: place.displayName, lat: place.latitude.toFixed(4), lng: place.longitude.toFixed(4) }));
      } else {
        // Несколько вариантов - показываем выбор
        setCurrentLocationOptions(result.places);
      }
    } catch (err: any) {
      console.error('Current location validation error:', err);
      setError(err.message || t('errors.currentLocationValidationError'));
    } finally {
      setValidatingCurrentLocation(false);
    }
  };

  // Выбор варианта места (пользователь)
  const handleSelectPlace = (place: PlaceInfo) => {
    setBirthLatitude(place.latitude);
    setBirthLongitude(place.longitude);
    setPlaceOptions([]);
    alert(t('alerts.placeSelected', { name: place.displayName, lat: place.latitude.toFixed(4), lng: place.longitude.toFixed(4) }));
  };

  // Выбор варианта места (партнёр)
  const handleSelectPartnerPlace = (place: PlaceInfo) => {
    setPartnerBirthLatitude(place.latitude);
    setPartnerBirthLongitude(place.longitude);
    setPartnerPlaceOptions([]);
    alert(t('alerts.placeSelected', { name: place.displayName, lat: place.latitude.toFixed(4), lng: place.longitude.toFixed(4) }));
  };

  // Выбор варианта текущего местоположения
  const handleSelectCurrentLocation = (place: PlaceInfo) => {
    setCurrentLatitude(place.latitude);
    setCurrentLongitude(place.longitude);
    setCurrentLocationOptions([]);
    alert(t('alerts.currentLocationSelected', { name: place.displayName, lat: place.latitude.toFixed(4), lng: place.longitude.toFixed(4) }));
  };

  // Получение текущей геолокации
  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    setError(null);

    try {
      const result = await getCurrentLocation();

      if (!result.success) {
        setError(result.error || t('errors.failedToGetGeolocation'));
        return;
      }

      if (result.latitude && result.longitude) {
        setCurrentLatitude(result.latitude);
        setCurrentLongitude(result.longitude);
        alert(t('alerts.currentPositionDetermined', { lat: result.latitude.toFixed(4), lng: result.longitude.toFixed(4) }));
      }
    } catch (err: any) {
      console.error('Geolocation error:', err);
      setError(err.message || t('errors.geolocationError'));
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация имени
    if (!displayName.trim()) {
      setError(t('errors.enterYourName'));
      return;
    }

    // Валидация партнёра (если чекбокс включён)
    if (hasPartner && !partnerName.trim()) {
      setError(t('errors.enterPartnerName'));
      return;
    }

    // Валидация даты рождения пользователя
    if (birthDate) {
      const validation = validateBirthDate(birthDate);
      if (!validation.isValid) {
        setError(t('errors.birthDateError', { error: validation.error }));
        return;
      }
    }

    // Валидация даты рождения партнёра
    if (hasPartner && partnerBirthDate) {
      const validation = validateBirthDate(partnerBirthDate);
      if (!validation.isValid) {
        setError(t('errors.partnerBirthDateError', { error: validation.error }));
        return;
      }
    }

    setLoading(true);

    try {
      // Обновляем профиль пользователя
      const profileUpdate: UserProfileUpdate = {
        display_name: displayName.trim(),
        birth_date: birthDate || null,
        birth_time: birthTime || null,
        birth_place: birthPlace.trim() || null,
        birth_latitude: birthLatitude,
        birth_longitude: birthLongitude,
        current_latitude: currentLatitude,
        current_longitude: currentLongitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language_code: detectBrowserLanguage(), // Auto-detect from browser, user can change in Settings
        // Privacy-first: location_access_enabled = true ONLY if coordinates provided
        location_access_enabled: (currentLatitude !== null && currentLongitude !== null),
        // Cycle tracking: user choice, defaults to true (main app feature)
        cycle_tracking_enabled: cycleTrackingEnabled,
      };

      const updatedProfile = await updateUserProfile(profileUpdate);

      if (!updatedProfile) {
        throw new Error(t('errors.failedToUpdateProfile'));
      }

      // Обновляем партнёра (если нужно)
      if (hasPartner) {
        const partnerUpdate: PartnerUpdate = {
          name: partnerName.trim(),
          birth_date: partnerBirthDate || null,
          birth_time: partnerBirthTime || null,
          birth_place: partnerBirthPlace.trim() || null,
          birth_latitude: partnerBirthLatitude,
          birth_longitude: partnerBirthLongitude,
        };

        const updatedPartner = await upsertPartner(partnerUpdate);

        if (!updatedPartner) {
          throw new Error(t('errors.failedToSavePartnerData'));
        }
      }

      // Успешно сохранили
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Profile setup error:', err);
      setError(err.message || t('errors.savingError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // В режиме setup можно пропустить, в edit - нет
    if (mode === 'setup') {
      onSuccess();
      onClose();
    }
  };

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'setup' ? t('title.createProfile') : t('title.editProfile')}
      closable={mode === 'edit'}
      backgroundColor="#FFF0F5"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Описание для режима setup */}
        {mode === 'setup' && (
          <p className={styles.description}>
            {t('description.setupMode')}
          </p>
        )}

        {/* ====== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====== */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('sections.aboutYou')}</h3>

          {/* Имя */}
          <div className={styles.inputGroup}>
            <label htmlFor="displayName" className={styles.label}>
              {t('fields.name')} <span className={styles.required}>*</span>
            </label>
            <input
              id="displayName"
              type="text"
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('placeholders.whatIsYourName')}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Дата рождения */}
          <div className={styles.inputGroup}>
            <label htmlFor="birthDate" className={styles.label}>
              {t('fields.birthDate')}
            </label>
            <input
              id="birthDate"
              type="date"
              className={styles.input}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              min="1900-01-01"
              max={new Date().toISOString().split('T')[0]}
              disabled={loading}
            />
          </div>

          {/* Время рождения */}
          <div className={styles.inputGroup}>
            <label htmlFor="birthTime" className={styles.label}>
              {t('fields.birthTime')}
            </label>
            <input
              id="birthTime"
              type="time"
              step="60"
              className={styles.input}
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              disabled={loading}
            />
            <p className={styles.hint}>
              {t('hints.forAstrologicalAnalysis')}
            </p>
          </div>

          {/* Место рождения */}
          <div className={styles.inputGroup}>
            <label htmlFor="birthPlace" className={styles.label}>
              {t('fields.birthPlace')}
            </label>
            <input
              id="birthPlace"
              type="text"
              className={styles.input}
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder={t('placeholders.cityCountry')}
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleValidatePlace}
              disabled={loading || validatingPlace || !birthPlace.trim()}
              className={styles.secondaryButton}
              style={{ marginTop: '0.5rem' }}
            >
              {validatingPlace ? t('buttons.checking') : t('buttons.checkPlace')}
            </button>
            {birthLatitude && birthLongitude && (
              <p className={styles.hint}>
                {t('hints.coordinates', { lat: birthLatitude.toFixed(4), lng: birthLongitude.toFixed(4) })}
              </p>
            )}
            {placeOptions.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <p className={styles.hint}>{t('hints.selectCorrectOption')}</p>
                {placeOptions.map((place, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className={styles.secondaryButton}
                    style={{ marginTop: '0.25rem', width: '100%', textAlign: 'left' }}
                  >
                    📍 {place.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Текущее местоположение (для погоды и гороскопов) */}
          <div className={styles.inputGroup}>
            <label htmlFor="currentLocation" className={styles.label}>
              {t('fields.currentLocation')}
            </label>
            <p className={styles.hint}>
              {t('hints.forWeatherAndHoroscopes')}
            </p>
            <input
              id="currentLocation"
              type="text"
              className={styles.input}
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder={t('placeholders.moscowRussia')}
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleValidateCurrentLocation}
              disabled={loading || validatingCurrentLocation || !currentLocation.trim()}
              className={styles.secondaryButton}
              style={{ marginTop: '0.5rem' }}
            >
              {validatingCurrentLocation ? t('buttons.checking') : t('buttons.checkPlace')}
            </button>
            {currentLatitude && currentLongitude && (
              <p className={styles.hint}>
                {t('hints.coordinates', { lat: currentLatitude.toFixed(4), lng: currentLongitude.toFixed(4) })}
              </p>
            )}
            {currentLocationOptions.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <p className={styles.hint}>{t('hints.selectCorrectOption')}</p>
                {currentLocationOptions.map((place, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectCurrentLocation(place)}
                    className={styles.secondaryButton}
                    style={{ marginTop: '0.25rem', width: '100%', textAlign: 'left' }}
                  >
                    📍 {place.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Геолокация (опционально) */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              {t('fields.currentGeolocation')}
            </label>
            <p className={styles.hint}>
              {t('hints.forHereAndNow')}
            </p>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={loading || gettingLocation}
              className={styles.secondaryButton}
            >
              {gettingLocation ? t('buttons.getting') : t('buttons.getCurrentPosition')}
            </button>
            {currentLatitude && currentLongitude && (
              <p className={styles.hint}>
                {t('hints.currentPosition', { lat: currentLatitude.toFixed(4), lng: currentLongitude.toFixed(4) })}
              </p>
            )}
          </div>
        </div>

        {/* ====== НАСТРОЙКИ ПРИВАТНОСТИ ====== */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('sections.privacySettings')}</h3>
          <p className={styles.hint}>
            {t('hints.youCanChangeAnytime')}
          </p>

          {/* Чекбокс: Использовать функционал циклов */}
          <div className={styles.checkboxGroup} style={{ marginTop: '1rem' }}>
            <input
              id="cycleTrackingEnabled"
              type="checkbox"
              className={styles.checkbox}
              checked={cycleTrackingEnabled}
              onChange={(e) => setCycleTrackingEnabled(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="cycleTrackingEnabled" className={styles.checkboxLabel}>
              {t('fields.useCycleTracking')}
            </label>
          </div>
          <p className={styles.hint} style={{ marginLeft: '2rem' }}>
            {t('hints.cycleTrackingExplanation')}
          </p>
        </div>

        {/* ====== ПАРТНЁР (ОПЦИОНАЛЬНО) ====== */}
        <div className={styles.section}>
          <div className={styles.checkboxGroup}>
            <input
              id="hasPartner"
              type="checkbox"
              className={styles.checkbox}
              checked={hasPartner}
              onChange={(e) => setHasPartner(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="hasPartner" className={styles.checkboxLabel}>
              {t('sections.havePartner')}
            </label>
          </div>

          {hasPartner && (
            <div className={styles.partnerFields}>
              <h3 className={styles.sectionTitle}>{t('sections.aboutPartner')}</h3>

              {/* Имя партнёра */}
              <div className={styles.inputGroup}>
                <label htmlFor="partnerName" className={styles.label}>
                  {t('fields.partnerName')} <span className={styles.required}>*</span>
                </label>
                <input
                  id="partnerName"
                  type="text"
                  className={styles.input}
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder={t('placeholders.whatIsPartnerName')}
                  disabled={loading}
                />
              </div>

              {/* Дата рождения партнёра */}
              <div className={styles.inputGroup}>
                <label htmlFor="partnerBirthDate" className={styles.label}>
                  {t('fields.birthDate')}
                </label>
                <input
                  id="partnerBirthDate"
                  type="date"
                  className={styles.input}
                  value={partnerBirthDate}
                  onChange={(e) => setPartnerBirthDate(e.target.value)}
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]}
                  disabled={loading}
                />
              </div>

              {/* Время рождения партнёра */}
              <div className={styles.inputGroup}>
                <label htmlFor="partnerBirthTime" className={styles.label}>
                  {t('fields.birthTime')}
                </label>
                <input
                  id="partnerBirthTime"
                  type="time"
                  step="60"
                  className={styles.input}
                  value={partnerBirthTime}
                  onChange={(e) => setPartnerBirthTime(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Место рождения партнёра */}
              <div className={styles.inputGroup}>
                <label htmlFor="partnerBirthPlace" className={styles.label}>
                  {t('fields.birthPlace')}
                </label>
                <input
                  id="partnerBirthPlace"
                  type="text"
                  className={styles.input}
                  value={partnerBirthPlace}
                  onChange={(e) => setPartnerBirthPlace(e.target.value)}
                  placeholder={t('placeholders.cityCountry')}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handleValidatePartnerPlace}
                  disabled={loading || validatingPartnerPlace || !partnerBirthPlace.trim()}
                  className={styles.secondaryButton}
                  style={{ marginTop: '0.5rem' }}
                >
                  {validatingPartnerPlace ? t('buttons.checking') : t('buttons.checkPlace')}
                </button>
                {partnerBirthLatitude && partnerBirthLongitude && (
                  <p className={styles.hint}>
                    {t('hints.coordinates', { lat: partnerBirthLatitude.toFixed(4), lng: partnerBirthLongitude.toFixed(4) })}
                  </p>
                )}
                {partnerPlaceOptions.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p className={styles.hint}>{t('hints.selectCorrectOption')}</p>
                    {partnerPlaceOptions.map((place, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectPartnerPlace(place)}
                        className={styles.secondaryButton}
                        style={{ marginTop: '0.25rem', width: '100%', textAlign: 'left' }}
                      >
                        📍 {place.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ошибка */}
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {/* Кнопки */}
        <div className={styles.buttons}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.spinner}></span>
            ) : (
              mode === 'setup' ? t('buttons.save') : t('buttons.update')
            )}
          </button>

          {mode === 'setup' && (
            <button
              type="button"
              className={styles.skipButton}
              onClick={handleSkip}
              disabled={loading}
            >
              {t('buttons.skip')}
            </button>
          )}
        </div>

        {mode === 'setup' && (
          <p className={styles.skipHint}>
            {t('hints.canFillLater')}
          </p>
        )}
      </form>
    </FullScreenModal>
  );
};
