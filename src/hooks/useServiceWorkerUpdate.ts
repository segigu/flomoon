import { useState, useEffect } from 'react';

/**
 * Hook для автоматического обновления Service Worker
 *
 * Отслеживает новые версии SW и предоставляет UI для обновления
 *
 * @returns {Object} - { updateAvailable, updateApp }
 * - updateAvailable: boolean - есть ли доступное обновление
 * - updateApp: () => void - функция для применения обновления
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Слушаем событие от serviceWorkerRegistration.ts
    const handleUpdate = (event: CustomEvent<ServiceWorkerRegistration>) => {
      const registration = event.detail;
      const waiting = registration.waiting;

      if (waiting) {
        setWaitingWorker(waiting);
        setUpdateAvailable(true);

        console.log('🎉 Новая версия приложения доступна!');
      }
    };

    window.addEventListener('serviceWorkerUpdate' as any, handleUpdate as EventListener);

    return () => {
      window.removeEventListener('serviceWorkerUpdate' as any, handleUpdate as EventListener);
    };
  }, []);

  const updateApp = () => {
    if (!waitingWorker) {
      console.warn('No waiting service worker to update');
      return;
    }

    // Отправляем сообщение waiting worker чтобы он применил обновление
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });

    // Слушаем когда новый SW станет активным
    waitingWorker.addEventListener('statechange', () => {
      if (waitingWorker.state === 'activated') {
        console.log('✅ Service Worker обновлён, перезагружаю страницу...');
        window.location.reload();
      }
    });
  };

  return {
    updateAvailable,
    updateApp,
  };
}
