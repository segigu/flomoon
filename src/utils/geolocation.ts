/**
 * Утилиты для работы с геолокацией
 * Получение текущих координат пользователя через Geolocation API
 */

export interface GeolocationResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  error?: string;
}

/**
 * Получить текущую геолокацию пользователя
 * @returns Результат с координатами или ошибкой
 */
export async function getCurrentLocation(): Promise<GeolocationResult> {
  // Проверка поддержки Geolocation API
  if (!navigator.geolocation) {
    return {
      success: false,
      error: 'Геолокация не поддерживается вашим браузером',
    };
  }

  return new Promise((resolve) => {
    const options: PositionOptions = {
      enableHighAccuracy: true, // Запросить более точные координаты
      timeout: 10000, // Таймаут 10 секунд
      maximumAge: 0, // Не использовать кэшированные данные
    };

    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({
          success: true,
          latitude,
          longitude,
        });
      },
      // Error callback
      (error) => {
        let errorMessage = 'Не удалось получить геолокацию';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Вы отказали в доступе к геолокации. Разрешите доступ в настройках браузера.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Информация о местоположении недоступна';
            break;
          case error.TIMEOUT:
            errorMessage = 'Превышено время ожидания запроса геолокации';
            break;
          default:
            errorMessage = error.message || 'Неизвестная ошибка геолокации';
        }

        resolve({
          success: false,
          error: errorMessage,
        });
      },
      options
    );
  });
}

/**
 * Проверка поддержки Geolocation API
 * @returns true, если браузер поддерживает геолокацию
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Форматирование координат для отображения
 * @param latitude - широта
 * @param longitude - долгота
 * @returns строка вида "55.7558, 37.6173"
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}
