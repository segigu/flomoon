import React, { useState, useEffect } from 'react';
import { FullScreenModal } from './FullScreenModal';
import { updateUserProfile, upsertPartner, UserProfileUpdate, PartnerUpdate } from '../utils/supabaseProfile';
import styles from './ProfileSetupModal.module.css';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialName?: string;
  mode?: 'setup' | 'edit';
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialName = '',
  mode = 'setup'
}) => {
  // Профиль пользователя
  const [displayName, setDisplayName] = useState(initialName);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');

  // Партнёр
  const [hasPartner, setHasPartner] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerBirthDate, setPartnerBirthDate] = useState('');
  const [partnerBirthTime, setPartnerBirthTime] = useState('');
  const [partnerBirthPlace, setPartnerBirthPlace] = useState('');

  // UI состояние
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialName) {
      setDisplayName(initialName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

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

    setLoading(true);

    try {
      // Обновляем профиль пользователя
      const profileUpdate: UserProfileUpdate = {
        display_name: displayName.trim(),
        birth_date: birthDate || null,
        birth_time: birthTime || null,
        birth_place: birthPlace.trim() || null,
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
