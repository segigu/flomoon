import { useEffect } from 'react';

/**
 * Hook для автоматического обновления Service Worker
 *
 * Отслеживает новые версии SW и автоматически перезагружает страницу
 * когда новая версия активируется.
 */
export function useServiceWorkerUpdate() {
  useEffect(() => {
    // Проверяем поддержку Service Worker
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // Слушаем событие controllerchange - срабатывает когда новый SW берет контроль
    const handleControllerChange = () => {
      console.log('🔄 New Service Worker activated, reloading page...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Хук больше не возвращает ничего - обновление происходит автоматически
  return {
    updateAvailable: false,
    updateApp: () => {},
  };
}
