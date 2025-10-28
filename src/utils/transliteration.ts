/**
 * Transliteration utilities for Russian names
 * Used to display Russian names in Latin script when UI language is not Russian
 */

/**
 * Transliteration map (Cyrillic → Latin)
 * Based on common international practice for Russian names
 *
 * Examples:
 * - Сергей → Sergey
 * - Настя → Nastya
 * - Александр → Alexander
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  // Uppercase
  'А': 'A',
  'Б': 'B',
  'В': 'V',
  'Г': 'G',
  'Д': 'D',
  'Е': 'E',
  'Ё': 'Yo',
  'Ж': 'Zh',
  'З': 'Z',
  'И': 'I',
  'Й': 'Y',
  'К': 'K',
  'Л': 'L',
  'М': 'M',
  'Н': 'N',
  'О': 'O',
  'П': 'P',
  'Р': 'R',
  'С': 'S',
  'Т': 'T',
  'У': 'U',
  'Ф': 'F',
  'Х': 'Kh',
  'Ц': 'Ts',
  'Ч': 'Ch',
  'Ш': 'Sh',
  'Щ': 'Shch',
  'Ъ': '',
  'Ы': 'Y',
  'Ь': '',
  'Э': 'E',
  'Ю': 'Yu',
  'Я': 'Ya',

  // Lowercase
  'а': 'a',
  'б': 'b',
  'в': 'v',
  'г': 'g',
  'д': 'd',
  'е': 'e',
  'ё': 'yo',
  'ж': 'zh',
  'з': 'z',
  'и': 'i',
  'й': 'y',
  'к': 'k',
  'л': 'l',
  'м': 'm',
  'н': 'n',
  'о': 'o',
  'п': 'p',
  'р': 'r',
  'с': 's',
  'т': 't',
  'у': 'u',
  'ф': 'f',
  'х': 'kh',
  'ц': 'ts',
  'ч': 'ch',
  'ш': 'sh',
  'щ': 'shch',
  'ъ': '',
  'ы': 'y',
  'ь': '',
  'э': 'e',
  'ю': 'yu',
  'я': 'ya',
};

/**
 * Transliterates a Russian name to Latin script
 *
 * @param name - Original name (can be Russian or already Latin)
 * @returns Transliterated name
 *
 * @example
 * transliterateRussianName('Сергей') // => 'Sergey'
 * transliterateRussianName('Настя') // => 'Nastya'
 * transliterateRussianName('John') // => 'John' (already Latin, unchanged)
 */
export function transliterateRussianName(name: string): string {
  if (!name) return name;

  // Check if name contains Cyrillic characters
  const hasCyrillic = /[\u0400-\u04FF]/.test(name);

  // If no Cyrillic, return as-is (already Latin or other script)
  if (!hasCyrillic) {
    return name;
  }

  // Transliterate each character
  return name
    .split('')
    .map(char => TRANSLITERATION_MAP[char] ?? char)
    .join('');
}

/**
 * Returns display name based on language
 *
 * - Russian language: returns original name
 * - Other languages: returns transliterated name (Cyrillic → Latin)
 *
 * @param originalName - Original name (as stored in database)
 * @param language - Current UI language ('ru', 'en', 'de')
 * @returns Name to display in UI
 *
 * @example
 * getDisplayName('Сергей', 'ru') // => 'Сергей'
 * getDisplayName('Сергей', 'en') // => 'Sergey'
 * getDisplayName('Сергей', 'de') // => 'Sergey'
 * getDisplayName('John', 'en') // => 'John'
 */
export function getDisplayName(originalName: string, language: string): string {
  // If Russian language, show original
  if (language === 'ru') {
    return originalName;
  }

  // Otherwise, transliterate
  return transliterateRussianName(originalName);
}
