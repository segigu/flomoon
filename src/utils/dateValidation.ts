/**
 * Утилиты для валидации дат рождения
 */

/**
 * Минимальная допустимая дата рождения (01.01.1900)
 */
const MIN_BIRTH_DATE = new Date('1900-01-01');

/**
 * Валидация даты рождения
 * @param dateString - дата в формате ISO (YYYY-MM-DD) из input type="date"
 * @returns объект с результатом валидации
 */
export function validateBirthDate(dateString: string | null): {
  isValid: boolean;
  error?: string;
} {
  if (!dateString) {
    return { isValid: false, error: 'Дата рождения не указана' };
  }

  const date = new Date(dateString);

  // Проверка на невалидную дату
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Некорректная дата' };
  }

  // Проверка минимальной даты (не раньше 1900)
  if (date < MIN_BIRTH_DATE) {
    return { isValid: false, error: 'Дата не может быть раньше 01.01.1900' };
  }

  // Проверка максимальной даты (не в будущем)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Сброс времени для корректного сравнения

  if (date > today) {
    return { isValid: false, error: 'Дата не может быть в будущем' };
  }

  return { isValid: true };
}

/**
 * Проверка, что год находится в допустимом диапазоне
 * (используется для дополнительной валидации)
 * @param year - год (число)
 * @returns true, если год валидный
 */
export function isValidYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear;
}

/**
 * Форматирование даты для отображения (DD.MM.YYYY)
 * @param isoDateString - дата в формате ISO (YYYY-MM-DD)
 * @returns дата в формате DD.MM.YYYY
 */
export function formatDateForDisplay(isoDateString: string): string {
  const date = new Date(isoDateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Конвертация DD.MM.YYYY в ISO формат (YYYY-MM-DD)
 * @param ddmmyyyy - дата в формате DD.MM.YYYY
 * @returns дата в формате ISO (YYYY-MM-DD)
 */
export function convertToISO(ddmmyyyy: string): string | null {
  const parts = ddmmyyyy.split('.');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;

  // Проверка, что все части являются числами
  if (!/^\d+$/.test(day) || !/^\d+$/.test(month) || !/^\d+$/.test(year)) {
    return null;
  }

  // Создаём дату в формате ISO
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  // Проверяем, что дата валидна
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return null;

  return isoDate;
}
