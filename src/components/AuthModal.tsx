import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { FullScreenModal } from './FullScreenModal';
import styles from './AuthModal.module.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = 'login' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation('auth');
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация email
    if (!email.trim()) {
      setError(t('errors.emailRequired'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('errors.emailInvalid'));
      return;
    }

    // Валидация пароля
    if (!password) {
      setError(t('errors.passwordRequired'));
      return;
    }

    if (password.length < 6) {
      setError(t('errors.passwordTooShort'));
      return;
    }

    // Дополнительная валидация для регистрации
    if (mode === 'signup') {
      if (!confirmPassword) {
        setError(t('errors.confirmPasswordRequired'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('errors.passwordsMismatch'));
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        // Попытка входа
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Проверяем, может пользователя нет
          if (error.message.includes('Invalid login credentials') ||
              error.message.includes('Email not confirmed')) {
            setError(t('errors.userNotFound'));
          } else {
            throw error;
          }
          setLoading(false);
          return;
        }

        // Успешный вход
        onSuccess();
        onClose();
      } else {
        // Регистрация
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          // Auto-confirm включен - пользователь сразу авторизован
          onSuccess();
          onClose();
        } else {
          // Требуется подтверждение email
          setError(t('errors.signupSuccess'));
          setTimeout(() => {
            setMode('login');
            setPassword('');
            setConfirmPassword('');
            setError(null);
          }, 4000);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? t('title.login') : t('title.signup')}
      closable={false}
      backgroundColor="#FFF0F5"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Email */}
        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>
            {t('fields.email')}
          </label>
          <input
            id="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('placeholders.email')}
            disabled={loading}
            autoComplete="email"
            autoFocus
          />
        </div>

        {/* Password */}
        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            {t('fields.password')}
          </label>
          <input
            id="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('placeholders.password')}
            disabled={loading}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {/* Confirm Password (только для регистрации) */}
        {mode === 'signup' && (
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              {t('fields.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('placeholders.password')}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {/* Кнопка отправки */}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? (
            <span className={styles.spinner}></span>
          ) : (
            mode === 'login' ? t('buttons.login') : t('buttons.signup')
          )}
        </button>

        {/* Ссылка для переключения режима */}
        <div className={styles.links}>
          <button
            type="button"
            className={styles.link}
            onClick={switchMode}
            disabled={loading}
          >
            {mode === 'login'
              ? t('links.noAccount')
              : t('links.hasAccount')
            }
          </button>
        </div>
      </form>
    </FullScreenModal>
  );
};
