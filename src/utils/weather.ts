const COBURG_COORDS = {
  latitude: 50.2584,
  longitude: 10.9629,
};

const WEATHER_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_TIMEZONE = 'Europe/Berlin';

type WeatherCode =
  | 0
  | 1
  | 2
  | 3
  | 45
  | 48
  | 51
  | 53
  | 55
  | 56
  | 57
  | 61
  | 63
  | 65
  | 66
  | 67
  | 71
  | 73
  | 75
  | 77
  | 80
  | 81
  | 82
  | 85
  | 86
  | 95
  | 96
  | 99;

function getWeatherCodeDescriptions(language: string): Record<WeatherCode, string> {
  if (language === 'en') {
    return {
      0: 'unexpectedly clear skies',
      1: 'mostly clear skies',
      2: 'variable cloudiness',
      3: 'solid gray',
      45: 'thick fog',
      48: 'frost and fog',
      51: 'light drizzle',
      53: 'drizzling rain',
      55: 'persistent drizzling rain',
      56: 'freezing drizzle',
      57: 'freezing rain',
      61: 'light rain',
      63: 'regular rain',
      65: 'downpour',
      66: 'freezing rain',
      67: 'freezing downpour',
      71: 'light snow',
      73: 'normal snow',
      75: 'snowstorm',
      77: 'ice pellets',
      80: 'short showers',
      81: 'rain squalls',
      82: 'three-act hurricane downpour',
      85: 'snow showers',
      86: 'heavy snow showers',
      95: 'nasty thunderstorm show',
      96: 'nasty thunderstorm with hail',
      99: 'hellish hail',
    };
  }

  if (language === 'de') {
    return {
      0: 'unerwartet klarem Himmel',
      1: 'fast klarem Himmel',
      2: 'wechselnder Bewölkung',
      3: 'durchgehender Grauheit',
      45: 'dichtem Nebel',
      48: 'Reif und Nebel',
      51: 'leichtem Nieselregen',
      53: 'Nieselregen',
      55: 'anhaltendem Nieselregen',
      56: 'gefrierendem Nieselregen',
      57: 'gefrierendem Regen',
      61: 'leichtem Regen',
      63: 'normalem Regen',
      65: 'Platzregen',
      66: 'gefrierendem Regen',
      67: 'gefrierendem Platzregen',
      71: 'leichtem Schnee',
      73: 'normalem Schnee',
      75: 'Schneesturm',
      77: 'Eiskörner',
      80: 'kurzen Schauern',
      81: 'Regenböen',
      82: 'dreiaktiger Hurrikan-Platzregen',
      85: 'Schneeschauern',
      86: 'schweren Schneeschauern',
      95: 'schmutziger Gewittershow',
      96: 'schmutzigem Gewitter mit Hagel',
      99: 'höllischem Hagel',
    };
  }

  // Russian (default)
  return {
    0: 'неожиданно ясным небом',
    1: 'почти ясным небом',
    2: 'переменной облачностью',
    3: 'сплошной серостью',
    45: 'густым туманом',
    48: 'изморозью и туманом',
    51: 'легкой моросью',
    53: 'моросящим дождём',
    55: 'затяжным моросящим дождём',
    56: 'ледяной моросью',
    57: 'ледяным дождём',
    61: 'лёгким дождиком',
    63: 'обычным дождём',
    65: 'ливнем',
    66: 'ледяным дождём',
    67: 'ледяным ливнем',
    71: 'порошей',
    73: 'нормальным снегом',
    75: 'снежной бурей',
    77: 'ледяной крупой',
    80: 'короткими ливнями',
    81: 'дождевыми шквалами',
    82: 'трёхактным ураганным ливнем',
    85: 'снежными зарядами',
    86: 'плотными снежными зарядами',
    95: 'грязным грозовым шоу',
    96: 'грязной грозой с градом',
    99: 'адским градом',
  };
}

interface WeatherQueryOptions {
  startDate: string;
  endDate: string;
  signal?: AbortSignal;
}

interface DailyWeatherData {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max?: number[];
  precipitation_sum?: number[];
  weathercode: number[];
  windspeed_10m_max?: number[];
}

interface WeatherApiResponse {
  daily?: DailyWeatherData;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildQueryUrl({ startDate, endDate }: WeatherQueryOptions): string {
  const params = new URLSearchParams({
    latitude: COBURG_COORDS.latitude.toString(),
    longitude: COBURG_COORDS.longitude.toString(),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'weathercode',
      'windspeed_10m_max',
    ].join(','),
    timezone: WEATHER_TIMEZONE,
    start_date: startDate,
    end_date: endDate,
  });

  return `${WEATHER_BASE_URL}?${params.toString()}`;
}

async function fetchWeatherRange(options: WeatherQueryOptions): Promise<DailyWeatherData | null> {
  try {
    const url = buildQueryUrl(options);
    const response = await fetch(url, { signal: options.signal });

    if (!response.ok) {
      console.warn('[Weather] Failed to fetch forecast:', response.status, response.statusText);
      return null;
    }

    const payload = (await response.json()) as WeatherApiResponse;
    if (!payload.daily || !Array.isArray(payload.daily.time)) {
      console.warn('[Weather] Unexpected forecast payload structure.');
      return null;
    }

    return payload.daily;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    console.warn('[Weather] Forecast request failed:', error);
    return null;
  }
}

function mapWeatherCode(code: number | undefined, language = 'ru'): string {
  if (code == null) {
    return language === 'en'
      ? 'strange skies without details'
      : language === 'de'
      ? 'seltsamem Himmel ohne Details'
      : 'странным небом без подробностей';
  }

  const descriptions = getWeatherCodeDescriptions(language);
  const mapped = descriptions[code as WeatherCode];
  if (mapped) {
    return mapped;
  }

  if (code >= 50 && code < 60) {
    return language === 'en'
      ? 'rainy dreariness'
      : language === 'de'
      ? 'regnerischer Trübsinn'
      : 'дождливой нудятиной';
  }
  if (code >= 60 && code < 70) {
    return language === 'en'
      ? 'rain of questionable mood'
      : language === 'de'
      ? 'Regen zweifelhafter Stimmung'
      : 'дождём сомнительного настроения';
  }
  if (code >= 70 && code < 80) {
    return language === 'en'
      ? 'snowy surprise'
      : language === 'de'
      ? 'schneereicher Überraschung'
      : 'снежным сюрпризом';
  }
  if (code >= 80 && code < 90) {
    return language === 'en'
      ? 'rainy bursts'
      : language === 'de'
      ? 'regnerischen Ausbrüchen'
      : 'дождливыми вспышками';
  }
  if (code >= 90) {
    return language === 'en'
      ? 'thunderstorm circus'
      : language === 'de'
      ? 'Gewitter-Zirkus'
      : 'грозовым цирком';
  }

  return language === 'en'
    ? 'unpredictable whims'
    : language === 'de'
    ? 'unvorhersehbaren Launen'
    : 'непредсказуемыми капризами';
}

function formatNumber(value: number | undefined | null, digits = 0): string | null {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }
  return value.toFixed(digits);
}

function formatDayName(isoDate: string, language = 'ru'): string {
  const date = new Date(`${isoDate}T12:00:00`);
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
}

function capitalize(text: string): string {
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDayList(days: string[], language = 'ru'): string {
  if (days.length === 0) {
    return '';
  }

  if (days.length === 1) {
    return days[0];
  }

  const conjunction = language === 'en' ? 'and' : language === 'de' ? 'und' : 'и';

  if (days.length === 2) {
    return `${days[0]} ${conjunction} ${days[1]}`;
  }

  return `${days.slice(0, -1).join(', ')} ${conjunction} ${days[days.length - 1]}`;
}

export async function fetchDailyWeatherSummary(
  isoDate: string,
  signal?: AbortSignal,
  language = 'ru',
): Promise<string | null> {
  const daily = await fetchWeatherRange({
    startDate: isoDate,
    endDate: isoDate,
    signal,
  });

  if (!daily) {
    return null;
  }

  const index = daily.time.findIndex(entry => entry === isoDate);
  if (index === -1) {
    return null;
  }

  const dayName = capitalize(formatDayName(isoDate, language));
  const tempMax = formatNumber(daily.temperature_2m_max[index]);
  const tempMin = formatNumber(daily.temperature_2m_min[index]);
  const precipProb = formatNumber(daily.precipitation_probability_max?.[index]);
  const precipSum = formatNumber(daily.precipitation_sum?.[index], 1);
  const wind = formatNumber(daily.windspeed_10m_max?.[index]);
  const weatherFlavor = mapWeatherCode(daily.weathercode[index], language);

  const segments: string[] = [];
  segments.push(
    language === 'en'
      ? `${dayName} smells like ${weatherFlavor}`
      : language === 'de'
      ? `${dayName} riecht nach ${weatherFlavor}`
      : `${dayName} пахнет ${weatherFlavor}`,
  );
  if (tempMax && tempMin) {
    segments.push(
      language === 'en'
        ? `temperature jumps from ${tempMin}°C to ${tempMax}°C`
        : language === 'de'
        ? `Temperatur springt von ${tempMin}°C bis ${tempMax}°C`
        : `температура скачет от ${tempMin}°C до ${tempMax}°C`,
    );
  } else if (tempMax) {
    segments.push(
      language === 'en'
        ? `maximum around ${tempMax}°C`
        : language === 'de'
        ? `Maximum etwa ${tempMax}°C`
        : `максимум около ${tempMax}°C`,
    );
  }

  if (precipProb) {
    segments.push(
      language === 'en'
        ? `chance of precipitation about ${precipProb}%`
        : language === 'de'
        ? `Niederschlagswahrscheinlichkeit etwa ${precipProb}%`
        : `шанс осадков примерно ${precipProb}%`,
    );
  } else if (precipSum && Number(precipSum) > 0) {
    segments.push(
      language === 'en'
        ? `precipitation will dump about ${precipSum} mm`
        : language === 'de'
        ? `Niederschlag wird etwa ${precipSum} mm abwerfen`
        : `осадков навалит около ${precipSum} мм`,
    );
  }

  if (wind) {
    segments.push(
      language === 'en'
        ? `wind will pick up to ${wind} km/h`
        : language === 'de'
        ? `Wind wird bis ${wind} km/h auffrischen`
        : `ветер разгонится до ${wind} км/ч`,
    );
  }

  return segments.join(', ');
}

export async function fetchWeeklyWeatherSummary(
  isoDate: string,
  signal?: AbortSignal,
  language = 'ru',
): Promise<string | null> {
  const start = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const endIso = toISODate(end);

  const daily = await fetchWeatherRange({
    startDate: isoDate,
    endDate: endIso,
    signal,
  });

  if (!daily) {
    return null;
  }

  const tempsMax = daily.temperature_2m_max.filter(value => value != null && !Number.isNaN(value));
  const tempsMin = daily.temperature_2m_min.filter(value => value != null && !Number.isNaN(value));
  const maxTemp = tempsMax.length ? Math.max(...tempsMax) : null;
  const minTemp = tempsMin.length ? Math.min(...tempsMin) : null;

  const precipDays: string[] = [];
  let peakPrecipProb = 0;
  let peakPrecipDay = '';

  daily.time.forEach((day, index) => {
    const prob = daily.precipitation_probability_max?.[index] ?? 0;
    if (prob >= 55) {
      precipDays.push(formatDayName(day, language));
    }
    if (prob > peakPrecipProb) {
      peakPrecipProb = prob;
      peakPrecipDay = formatDayName(day, language);
    }
  });

  let dominantCode: number | null = null;
  const codeCounts = new Map<number, number>();
  daily.weathercode.forEach(code => {
    const current = codeCounts.get(code) ?? 0;
    codeCounts.set(code, current + 1);
    if (!dominantCode || codeCounts.get(code)! > (codeCounts.get(dominantCode) ?? 0)) {
      dominantCode = code;
    }
  });

  const dominantDescription = mapWeatherCode(dominantCode ?? undefined, language);
  const segments: string[] = [];

  segments.push(
    language === 'en'
      ? `Week plays out with ${dominantDescription}`
      : language === 'de'
      ? `Woche spielt sich ab mit ${dominantDescription}`
      : `Неделя отыгрывается ${dominantDescription}`,
  );

  if (maxTemp !== null && minTemp !== null) {
    segments.push(
      language === 'en'
        ? `temperature jumps from ${minTemp.toFixed(0)}°C to ${maxTemp.toFixed(0)}°C`
        : language === 'de'
        ? `Temperatur springt von ${minTemp.toFixed(0)}°C bis ${maxTemp.toFixed(0)}°C`
        : `температура прыгает от ${minTemp.toFixed(0)}°C до ${maxTemp.toFixed(0)}°C`,
    );
  } else if (maxTemp !== null) {
    segments.push(
      language === 'en'
        ? `maximum will reach ${maxTemp.toFixed(0)}°C`
        : language === 'de'
        ? `Maximum wird ${maxTemp.toFixed(0)}°C erreichen`
        : `максимум дотянет до ${maxTemp.toFixed(0)}°C`,
    );
  }

  if (precipDays.length > 0) {
    const formattedDays = formatDayList(precipDays.map(capitalize), language);
    segments.push(
      language === 'en'
        ? `wettest days — ${formattedDays}`
        : language === 'de'
        ? `nasseste Tage — ${formattedDays}`
        : `самые мокрые дни — ${formattedDays}`,
    );
  } else if (peakPrecipProb >= 30 && peakPrecipDay) {
    segments.push(
      language === 'en'
        ? `precipitation possible closer to ${capitalize(peakPrecipDay)} (up to ${peakPrecipProb}% probability)`
        : language === 'de'
        ? `Niederschlag möglich näher zu ${capitalize(peakPrecipDay)} (bis zu ${peakPrecipProb}% Wahrscheinlichkeit)`
        : `осадки возможны ближе к ${capitalize(peakPrecipDay)} (до ${peakPrecipProb}% вероятности)`,
    );
  }

  const windValues = daily.windspeed_10m_max?.filter(value => value != null && !Number.isNaN(value)) ?? [];
  if (windValues.length > 0) {
    const maxWind = Math.max(...windValues);
    if (maxWind >= 35) {
      segments.push(
        language === 'en'
          ? `wind will rev up to ${maxWind.toFixed(0)} km/h`
          : language === 'de'
          ? `Wind wird bis ${maxWind.toFixed(0)} km/h aufdrehen`
          : `ветер раздухарится до ${maxWind.toFixed(0)} км/ч`,
      );
    } else if (maxWind >= 20) {
      segments.push(
        language === 'en'
          ? `wind will occasionally blow up to ${maxWind.toFixed(0)} km/h`
          : language === 'de'
          ? `Wind wird gelegentlich bis ${maxWind.toFixed(0)} km/h wehen`
          : `ветер временами поддувает до ${maxWind.toFixed(0)} км/ч`,
      );
    }
  }

  return segments.join(', ');
}
