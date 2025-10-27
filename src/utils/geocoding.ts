/**
 * Geocoding утилиты - AI-валидация мест рождения с координатами
 * Использует Claude Haiku 4.5 для определения координат по названию места
 */

import { callAI } from './aiClient';

/**
 * Результат валидации места
 */
export interface PlaceValidationResult {
  success: boolean;
  places?: PlaceInfo[];
  error?: string;
}

/**
 * Информация о месте
 */
export interface PlaceInfo {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  displayName: string; // Полное название для отображения (например, "Москва, Россия")
}

/**
 * AI-валидация места рождения с получением координат
 * @param placeInput - название места (например, "Москва" или "Springfield")
 * @returns результат валидации с координатами
 */
export async function validatePlaceWithAI(placeInput: string): Promise<PlaceValidationResult> {
  if (!placeInput || !placeInput.trim()) {
    return {
      success: false,
      error: 'Название места не указано',
    };
  }

  const placeName = placeInput.trim();

  // Промпт для Claude
  const prompt = `Определи географические координаты для места рождения: "${placeName}".

ВАЖНО:
1. Если это однозначное место (например, "Москва" → столица России), верни ОДИН вариант
2. Если это неоднозначное место (например, "Спрингфилд" → есть в США, Австралии и т.д.), верни ВСЕ популярные варианты (до 5 самых известных)
3. Если это малоизвестное или некорректное место, верни ошибку

Формат ответа - ТОЛЬКО JSON, без дополнительного текста:

Для однозначного места:
{
  "places": [
    {
      "city": "Москва",
      "country": "Россия",
      "latitude": 55.7558,
      "longitude": 37.6173
    }
  ]
}

Для неоднозначного места:
{
  "places": [
    {
      "city": "Спрингфилд",
      "country": "США (Иллинойс)",
      "latitude": 39.7817,
      "longitude": -89.6501
    },
    {
      "city": "Спрингфилд",
      "country": "США (Массачусетс)",
      "latitude": 42.1015,
      "longitude": -72.5898
    }
  ]
}

Для ошибки:
{
  "error": "Не удалось определить место. Проверьте правильность названия."
}

Верни ТОЛЬКО JSON, без markdown блоков и комментариев.`;

  try {
    // Вызов Claude API (Haiku 4.5)
    const response = await callAI({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: 1000,
      temperature: 0.3, // Низкая температура для точности
    });

    // Извлекаем текст ответа
    const responseText = response.text;

    if (!responseText) {
      return {
        success: false,
        error: 'Пустой ответ от AI',
      };
    }

    // Парсим JSON
    let parsed: any;
    try {
      // Удаляем возможные markdown блоки ```json ... ```
      const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response:', responseText);
      return {
        success: false,
        error: 'Не удалось распарсить ответ AI',
      };
    }

    // Проверяем наличие ошибки
    if (parsed.error) {
      return {
        success: false,
        error: parsed.error,
      };
    }

    // Проверяем наличие мест
    if (!parsed.places || !Array.isArray(parsed.places) || parsed.places.length === 0) {
      return {
        success: false,
        error: 'AI не вернул информацию о месте',
      };
    }

    // Форматируем результат
    const places: PlaceInfo[] = parsed.places.map((place: any) => ({
      city: place.city || '',
      country: place.country || '',
      latitude: parseFloat(place.latitude),
      longitude: parseFloat(place.longitude),
      displayName: `${place.city}, ${place.country}`,
    }));

    // Проверяем валидность координат
    for (const place of places) {
      if (
        isNaN(place.latitude) ||
        isNaN(place.longitude) ||
        place.latitude < -90 ||
        place.latitude > 90 ||
        place.longitude < -180 ||
        place.longitude > 180
      ) {
        return {
          success: false,
          error: 'AI вернул некорректные координаты',
        };
      }
    }

    return {
      success: true,
      places,
    };
  } catch (error: any) {
    console.error('Geocoding AI error:', error);
    return {
      success: false,
      error: error.message || 'Ошибка при запросе к AI',
    };
  }
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

/**
 * Проверка валидности координат
 * @param latitude - широта
 * @param longitude - долгота
 * @returns true, если координаты валидны
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
