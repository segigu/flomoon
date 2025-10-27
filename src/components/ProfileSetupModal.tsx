import React, { useState, useEffect } from 'react';
import { FullScreenModal } from './FullScreenModal';
import { updateUserProfile, upsertPartner, UserProfileUpdate, PartnerUpdate } from '../utils/supabaseProfile';
import { validateBirthDate } from '../utils/dateValidation';
import { validatePlaceWithAI, PlaceInfo } from '../utils/geocoding';
import { getCurrentLocation } from '../utils/geolocation';
import styles from './ProfileSetupModal.module.css';

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
      setError('Введите место рождения');
      return;
    }

    setValidatingPlace(true);
    setError(null);
    setPlaceOptions([]);

    try {
      const result = await validatePlaceWithAI(birthPlace);

      if (!result.success) {
        setError(result.error || 'Не удалось определить координаты');
        return;
      }

      if (!result.places || result.places.length === 0) {
        setError('Не удалось найти это место');
        return;
      }

      // Если один вариант - автоматически заполняем
      if (result.places.length === 1) {
        const place = result.places[0];
        setBirthLatitude(place.latitude);
        setBirthLongitude(place.longitude);
        alert(`✓ Координаты определены: ${place.displayName}\n${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`);
      } else {
        // Несколько вариантов - показываем выбор
        setPlaceOptions(result.places);
      }
    } catch (err: any) {
      console.error('Place validation error:', err);
      setError(err.message || 'Ошибка при валидации места');
    } finally {
      setValidatingPlace(false);
    }
  };

  // Обработчик AI-валидации места партнёра
  const handleValidatePartnerPlace = async () => {
    if (!partnerBirthPlace.trim()) {
      setError('Введите место рождения партнёра');
      return;
    }

    setValidatingPartnerPlace(true);
    setError(null);
    setPartnerPlaceOptions([]);

    try {
      const result = await validatePlaceWithAI(partnerBirthPlace);

      if (!result.success) {
        setError(result.error || 'Не удалось определить координаты');
        return;
      }

      if (!result.places || result.places.length === 0) {
        setError('Не удалось найти это место');
        return;
      }

      // Если один вариант - автоматически заполняем
      if (result.places.length === 1) {
        const place = result.places[0];
        setPartnerBirthLatitude(place.latitude);
        setPartnerBirthLongitude(place.longitude);
        alert(`✓ Координаты партнёра определены: ${place.displayName}\n${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`);
      } else {
        // Несколько вариантов - показываем выбор
        setPartnerPlaceOptions(result.places);
      }
    } catch (err: any) {
      console.error('Partner place validation error:', err);
      setError(err.message || 'Ошибка при валидации места партнёра');
    } finally {
      setValidatingPartnerPlace(false);
    }
  };

  // Выбор варианта места (пользователь)
  const handleSelectPlace = (place: PlaceInfo) => {
    setBirthLatitude(place.latitude);
    setBirthLongitude(place.longitude);
    setPlaceOptions([]);
    alert(`✓ Выбрано: ${place.displayName}\n${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`);
  };

  // Выбор варианта места (партнёр)
  const handleSelectPartnerPlace = (place: PlaceInfo) => {
    setPartnerBirthLatitude(place.latitude);
    setPartnerBirthLongitude(place.longitude);
    setPartnerPlaceOptions([]);
    alert(`✓ Выбрано: ${place.displayName}\n${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`);
  };

  // Получение текущей геолокации
  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    setError(null);

    try {
      const result = await getCurrentLocation();

      if (!result.success) {
        setError(result.error || 'Не удалось получить геолокацию');
        return;
      }

      if (result.latitude && result.longitude) {
        setCurrentLatitude(result.latitude);
        setCurrentLongitude(result.longitude);
        alert(`✓ Текущая позиция определена:\n${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`);
      }
    } catch (err: any) {
      console.error('Geolocation error:', err);
      setError(err.message || 'Ошибка при получении геолокации');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация имени
    if (!displayName.trim()) {
      setError('Введите ваше имя');
      return;
    }

    // Валидация партнёра (если чекбокс включён)
    if (hasPartner && !partnerName.trim()) {
      setError('Введите имя партнёра');
      return;
    }

    // Валидация даты рождения пользователя
    if (birthDate) {
      const validation = validateBirthDate(birthDate);
      if (!validation.isValid) {
        setError(`Дата рождения: ${validation.error}`);
        return;
      }
    }

    // Валидация даты рождения партнёра
    if (hasPartner && partnerBirthDate) {
      const validation = validateBirthDate(partnerBirthDate);
      if (!validation.isValid) {
        setError(`Дата рождения партнёра: ${validation.error}`);
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
        locale: 'ru-RU',
      };

      const updatedProfile = await updateUserProfile(profileUpdate);

      if (!updatedProfile) {
        throw new Error('Не удалось обновить профиль');
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
          throw new Error('Не удалось сохранить данные партнёра');
        }
      }

      // Успешно сохранили
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Profile setup error:', err);
      setError(err.message || 'Произошла ошибка при сохранении');
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
      title={mode === 'setup' ? 'Создайте свой профиль' : 'Редактировать профиль'}
      closable={mode === 'edit'}
      backgroundColor="#FFF0F5"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Описание для режима setup */}
        {mode === 'setup' && (
          <p className={styles.description}>
            Расскажите о себе, чтобы мы могли персонализировать ваш опыт.
            Вы сможете изменить эти данные в настройках.
          </p>
        )}

        {/* ====== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====== */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>О вас</h3>

          {/* Имя */}
          <div className={styles.inputGroup}>
            <label htmlFor="displayName" className={styles.label}>
              Имя <span className={styles.required}>*</span>
            </label>
            <input
              id="displayName"
              type="text"
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Как вас зовут?"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Дата рождения */}
          <div className={styles.inputGroup}>
            <label htmlFor="birthDate" className={styles.label}>
              Дата рождения
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
              Время рождения
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
              Для точного астрологического анализа
            </p>
          </div>

          {/* Место рождения */}
          <div className={styles.inputGroup}>
            <label htmlFor="birthPlace" className={styles.label}>
              Место рождения
            </label>
            <input
              id="birthPlace"
              type="text"
              className={styles.input}
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="Город, страна"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleValidatePlace}
              disabled={loading || validatingPlace || !birthPlace.trim()}
              className={styles.secondaryButton}
              style={{ marginTop: '0.5rem' }}
            >
              {validatingPlace ? 'Проверка...' : '🌍 Проверить место'}
            </button>
            {birthLatitude && birthLongitude && (
              <p className={styles.hint}>
                ✓ Координаты: {birthLatitude.toFixed(4)}, {birthLongitude.toFixed(4)}
              </p>
            )}
            {placeOptions.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <p className={styles.hint}>Выберите правильный вариант:</p>
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

          {/* Геолокация (опционально) */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              Текущая геолокация (опционально)
            </label>
            <p className={styles.hint}>
              Для расчётов "здесь и сейчас" в астрологии
            </p>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={loading || gettingLocation}
              className={styles.secondaryButton}
            >
              {gettingLocation ? 'Получение...' : '📍 Получить текущую позицию'}
            </button>
            {currentLatitude && currentLongitude && (
              <p className={styles.hint}>
                ✓ Текущая позиция: {currentLatitude.toFixed(4)}, {currentLongitude.toFixed(4)}
              </p>
            )}
          </div>
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
              У меня есть партнёр
            </label>
          </div>

          {hasPartner && (
            <div className={styles.partnerFields}>
              <h3 className={styles.sectionTitle}>О вашем партнёре</h3>

              {/* Имя партнёра */}
              <div className={styles.inputGroup}>
                <label htmlFor="partnerName" className={styles.label}>
                  Имя партнёра <span className={styles.required}>*</span>
                </label>
                <input
                  id="partnerName"
                  type="text"
                  className={styles.input}
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Как зовут вашего партнёра?"
                  disabled={loading}
                />
              </div>

              {/* Дата рождения партнёра */}
              <div className={styles.inputGroup}>
                <label htmlFor="partnerBirthDate" className={styles.label}>
                  Дата рождения
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
                  Время рождения
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
                  Место рождения
                </label>
                <input
                  id="partnerBirthPlace"
                  type="text"
                  className={styles.input}
                  value={partnerBirthPlace}
                  onChange={(e) => setPartnerBirthPlace(e.target.value)}
                  placeholder="Город, страна"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handleValidatePartnerPlace}
                  disabled={loading || validatingPartnerPlace || !partnerBirthPlace.trim()}
                  className={styles.secondaryButton}
                  style={{ marginTop: '0.5rem' }}
                >
                  {validatingPartnerPlace ? 'Проверка...' : '🌍 Проверить место'}
                </button>
                {partnerBirthLatitude && partnerBirthLongitude && (
                  <p className={styles.hint}>
                    ✓ Координаты: {partnerBirthLatitude.toFixed(4)}, {partnerBirthLongitude.toFixed(4)}
                  </p>
                )}
                {partnerPlaceOptions.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p className={styles.hint}>Выберите правильный вариант:</p>
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
              mode === 'setup' ? 'Сохранить' : 'Обновить'
            )}
          </button>

          {mode === 'setup' && (
            <button
              type="button"
              className={styles.skipButton}
              onClick={handleSkip}
              disabled={loading}
            >
              Пропустить
            </button>
          )}
        </div>

        {mode === 'setup' && (
          <p className={styles.skipHint}>
            Вы сможете заполнить профиль позже в настройках
          </p>
        )}
      </form>
    </FullScreenModal>
  );
};
