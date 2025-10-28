import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FullScreenModal.module.css';

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Цвет фона (по умолчанию: #FFF0F5 - lavender blush) */
  backgroundColor?: string;
  /** Можно ли закрыть модалку (по умолчанию: true) */
  closable?: boolean;
  /** Дополнительный CSS класс для кастомизации */
  className?: string;
}

/**
 * Универсальный full-screen модальный компонент для мобильной версии
 *
 * Паттерн: bottom sheet с анимацией снизу вверх
 * - Открывается: slide up from bottom
 * - Закрывается: slide down to bottom
 * - Размер: весь экран (100vw × 100vh)
 * - Структура: Header (title + close button) + Body (scrollable content)
 *
 * Эталон: Settings Modal (src/components/ModernNastiaApp.tsx)
 *
 * @example
 * <FullScreenModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Настройки"
 * >
 *   <div>Контент модалки</div>
 * </FullScreenModal>
 */
export const FullScreenModal: React.FC<FullScreenModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  backgroundColor = '#FFF0F5',
  closable = true,
  className = '',
}) => {
  const { t } = useTranslation('common');

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Закрывать только если клик по overlay, а не по контенту
    if (e.target === e.currentTarget && closable) {
      onClose();
    }
  };

  return (
    <div className={styles.modal} onClick={handleOverlayClick}>
      <div className={`${styles.fullScreenModal} ${className}`}>
        {/* Header */}
        <div className={styles.header} style={{ backgroundColor }}>
          <h3 className={styles.title}>{title}</h3>
          {closable && (
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label={t('close')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Body (scrollable) */}
        <div className={styles.body} style={{ backgroundColor }}>
          {children}
        </div>
      </div>
    </div>
  );
};
