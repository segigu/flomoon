import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from './AuthModal.module.css';

type AuthMode = 'login' | 'signup' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Валидация
    if (!email.trim()) {
      setError('Введите email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Некорректный email');
      return;
    }

    if (mode !== 'reset' && !password) {
      setError('Введите пароль');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Успешный вход
        onSuccess();
        onClose();
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Успешная регистрация (Supabase auto-confirm включен)
        setSuccessMessage('Регистрация успешна! Входим...');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;

        setSuccessMessage('Письмо для восстановления пароля отправлено на вашу почту');
        setTimeout(() => {
          setMode('login');
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err: any) {
      console.error('Auth error:', err);

      // Обработка типичных ошибок
      if (err.message.includes('Invalid login credentials')) {
        setError('Неверный email или пароль');
      } else if (err.message.includes('User already registered')) {
        setError('Пользователь с таким email уже существует');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Email не подтвержден. Проверьте почту.');
      } else {
        setError(err.message || 'Произошла ошибка');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.authModal} onClick={(e) => e.stopPropagation()}>
        {/* Кнопка закрытия */}
        <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Заголовок */}
        <h2 className={styles.title}>
          {mode === 'login' && 'Вход'}
          {mode === 'signup' && 'Регистрация'}
          {mode === 'reset' && 'Восстановление пароля'}
        </h2>

        {/* Табы переключения режима */}
        {mode !== 'reset' && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => switchMode('login')}
              disabled={loading}
            >
              Вход
            </button>
            <button
              className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
              onClick={() => switchMode('signup')}
              disabled={loading}
            >
              Регистрация
            </button>
          </div>
        )}

        {/* Форма */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Email */}
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {/* Password (только для login/signup) */}
          {mode !== 'reset' && (
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Пароль
              </label>
              <input
                id="password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Успешное сообщение */}
          {successMessage && (
            <div className={styles.success}>
              {successMessage}
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
              <>
                {mode === 'login' && 'Войти'}
                {mode === 'signup' && 'Зарегистрироваться'}
                {mode === 'reset' && 'Отправить письмо'}
              </>
            )}
          </button>

          {/* Ссылки */}
          <div className={styles.links}>
            {mode === 'login' && (
              <button
                type="button"
                className={styles.link}
                onClick={() => switchMode('reset')}
                disabled={loading}
              >
                Забыли пароль?
              </button>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                className={styles.link}
                onClick={() => switchMode('login')}
                disabled={loading}
              >
                ← Назад к входу
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
