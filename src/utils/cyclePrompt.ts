import { addDays } from './dateUtils';
import { calculateCycleStats, calculateFertileWindow } from './cycleUtils';
import type { CycleData } from '../types';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

type CyclePhase =
  | 'menstruation'
  | 'fertile'
  | 'ovulation'
  | 'pms'
  | 'delay'
  | 'neutral';

interface CyclePhaseResult {
  phase: CyclePhase;
  dayInPeriod?: number;
  periodLength?: number;
  daysUntilPeriod?: number;
  daysLate?: number;
}

interface CycleOccurrence {
  offset: number;
  date: Date;
  info: CyclePhaseResult;
}

function getOrdinalWords(language: string): Record<number, string> {
  if (language === 'en') {
    return {
      1: '1st',
      2: '2nd',
      3: '3rd',
      4: '4th',
      5: '5th',
      6: '6th',
      7: '7th',
    };
  }

  if (language === 'de') {
    return {
      1: 'erster',
      2: 'zweiter',
      3: 'dritter',
      4: 'vierter',
      5: 'fünfter',
      6: 'sechster',
      7: 'siebter',
    };
  }

  // Russian (default)
  return {
    1: 'первый',
    2: 'второй',
    3: 'третий',
    4: 'четвёртый',
    5: 'пятый',
    6: 'шестой',
    7: 'седьмой',
  };
}

function normalize(date: Date): number {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
}

function toDate(input: Date | string): Date {
  if (typeof input === 'string') {
    return new Date(`${input}T00:00:00`);
  }
  return new Date(input);
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((normalize(end) - normalize(start)) / MS_IN_DAY);
}

function findLatestCycle(cycles: CycleData[], target: Date): CycleData | null {
  if (!cycles.length) {
    return null;
  }

  const targetMs = normalize(target);
  let latest: CycleData | null = null;
  let latestStartMs = Number.NEGATIVE_INFINITY;

  for (const cycle of cycles) {
    if (!cycle?.startDate) {
      continue;
    }
    const start = toDate(cycle.startDate);
    const startMs = normalize(start);
    if (Number.isNaN(startMs) || startMs > targetMs) {
      continue;
    }
    if (startMs > latestStartMs) {
      latestStartMs = startMs;
      latest = cycle;
    }
  }

  return latest;
}

function estimatePeriodLength(cycle: CycleData, defaultLength = 5): number {
  if (cycle.endDate) {
    const start = toDate(cycle.startDate);
    const end = toDate(cycle.endDate);
    const length = daysBetween(start, end) + 1;
    if (length > 0) {
      return Math.min(Math.max(length, 2), 8);
    }
  }
  return defaultLength;
}

function pluralizeDays(value: number, language = 'ru'): string {
  if (language === 'en') {
    return value === 1 ? 'day' : 'days';
  }

  if (language === 'de') {
    return value === 1 ? 'Tag' : 'Tage';
  }

  // Russian (default) - complex plural rules
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) {
    return 'дней';
  }
  if (last === 1) {
    return 'день';
  }
  if (last >= 2 && last <= 4) {
    return 'дня';
  }
  return 'дней';
}

function getOrdinalWord(value: number, language = 'ru'): string {
  const ordinals = getOrdinalWords(language);
  return ordinals[value] ?? `${value}${language === 'en' ? 'th' : language === 'de' ? '.' : '-й'}`;
}

function evaluateCyclePhase(cycles: CycleData[], target: Date): CyclePhaseResult | null {
  if (!cycles.length) {
    return null;
  }

  const normalizedTargetMs = normalize(target);
  const stats = calculateCycleStats(cycles);
  const fertileWindow = calculateFertileWindow(cycles);
  const latestCycle = findLatestCycle(cycles, target);

  if (latestCycle?.startDate) {
    const start = toDate(latestCycle.startDate);
    const offset = daysBetween(start, target);
    const periodLength = estimatePeriodLength(latestCycle);

    if (offset >= 0 && offset <= periodLength - 1) {
      return {
        phase: 'menstruation',
        dayInPeriod: offset + 1,
        periodLength,
      };
    }
  }

  if (fertileWindow) {
    const startMs = normalize(fertileWindow.fertileStart);
    const endMs = normalize(fertileWindow.fertileEnd);
    const ovulationMs = normalize(fertileWindow.ovulationDay);

    if (normalizedTargetMs >= startMs && normalizedTargetMs <= endMs) {
      if (normalizedTargetMs === ovulationMs) {
        return {
          phase: 'ovulation',
        };
      }
      return {
        phase: 'fertile',
      };
    }
  }

  if (stats.nextPrediction) {
    const nextPrediction = toDate(stats.nextPrediction);
    const daysUntilPeriod = daysBetween(target, nextPrediction);
    const daysLate = daysBetween(nextPrediction, target);

    if (daysUntilPeriod > 0 && daysUntilPeriod <= 4) {
      return {
        phase: 'pms',
        daysUntilPeriod,
      };
    }

    if (daysLate > 0 && daysLate <= 7) {
      return {
        phase: 'delay',
        daysLate,
      };
    }
  }

  return {
    phase: 'neutral',
  };
}

function describeSpan(startOffset: number, endOffset: number, language = 'ru'): string {
  const length = endOffset - startOffset + 1;
  if (length >= 5) {
    return language === 'en'
      ? 'almost the entire week'
      : language === 'de'
      ? 'fast die ganze Woche'
      : 'почти всю неделю';
  }
  if (endOffset <= 1) {
    return language === 'en'
      ? 'early in the week'
      : language === 'de'
      ? 'am Anfang der Woche'
      : 'в начале недели';
  }
  if (startOffset <= 1 && endOffset <= 3) {
    return language === 'en'
      ? 'early and mid-week'
      : language === 'de'
      ? 'am Anfang und in der Mitte der Woche'
      : 'в начале и середине недели';
  }
  if (startOffset >= 5) {
    return language === 'en'
      ? 'towards the end of the week'
      : language === 'de'
      ? 'gegen Ende der Woche'
      : 'под конец недели';
  }
  if (startOffset >= 2 && endOffset <= 4) {
    return language === 'en'
      ? 'around mid-week'
      : language === 'de'
      ? 'etwa Mitte der Woche'
      : 'к середине недели';
  }
  if (startOffset >= 3 && endOffset >= 4) {
    return language === 'en'
      ? 'closer to the weekend'
      : language === 'de'
      ? 'näher zum Wochenende'
      : 'ближе к выходным';
  }
  return language === 'en'
    ? 'a few days'
    : language === 'de'
    ? 'einige Tage'
    : 'несколько дней';
}

function describeMoment(offset: number, language = 'ru'): string {
  if (offset <= 1) {
    return language === 'en'
      ? 'early in the week'
      : language === 'de'
      ? 'am Anfang der Woche'
      : 'в начале недели';
  }
  if (offset <= 3) {
    return language === 'en'
      ? 'around mid-week'
      : language === 'de'
      ? 'etwa Mitte der Woche'
      : 'примерно к середине недели';
  }
  if (offset <= 5) {
    return language === 'en'
      ? 'closer to the weekend'
      : language === 'de'
      ? 'näher zum Wochenende'
      : 'ближе к выходным';
  }
  return language === 'en'
    ? 'towards the end of the week'
    : language === 'de'
    ? 'gegen Ende der Woche'
    : 'под конец недели';
}

export function buildDailyCycleHint(
  cycles: CycleData[],
  isoDate: string,
  language = 'ru',
  userName?: string
): string | null {
  if (!cycles.length) {
    return null;
  }

  const target = toDate(isoDate);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const info = evaluateCyclePhase(cycles, target);
  if (!info) {
    return null;
  }

  // Use generic pronoun if userName not provided
  const herPronoun = language === 'en' ? 'her' : language === 'de' ? 'sie' : 'её';

  switch (info.phase) {
    case 'menstruation': {
      const dayWord = getOrdinalWord(info.dayInPeriod ?? 1, language);
      return language === 'en'
        ? `it's the ${dayWord} day of menstruation — mention cramps, fatigue, desire to wrap up in a blanket and be left alone.`
        : language === 'de'
        ? `es ist der ${dayWord} Tag der Menstruation — erwähne Krämpfe, Müdigkeit, Wunsch sich in eine Decke zu wickeln und in Ruhe gelassen zu werden.`
        : `сейчас идёт ${dayWord} день менструации — упомяни спазмы, усталость, желание завернуться в плед и чтобы ${herPronoun} никто не трогал.`;
    }
    case 'ovulation':
      return language === 'en'
        ? 'today is peak ovulation — hint at hormonal overload, libido spike and risk of sudden decisions.'
        : language === 'de'
        ? 'heute ist der Peak der Ovulation — deute auf hormonelle Überhitzung, Libido-Anstieg und Risiko plötzlicher Entscheidungen hin.'
        : 'сегодня самый пик овуляции — намекни на гормональный перегрев, скачок либидо и риск внезапных решений.';
    case 'fertile':
      return language === 'en'
        ? 'fertile window is in full swing — play up the heightened drive, sensitivity and eternal "just don\'t get pregnant".'
        : language === 'de'
        ? 'fertiles Fenster in vollem Gang — spiele den erhöhten Drive, Sensibilität und ewigen "nur nicht schwanger werden" aus.'
        : 'в разгаре фертильное окно — обыграй повышенный драйв, чувствительность и вечное «главное не залететь».';
    case 'pms': {
      const days = info.daysUntilPeriod ?? 1;
      return language === 'en'
        ? `about ${days} ${pluralizeDays(days, language)} until period — add PMS, irritation, carb cravings and desire to boss everyone around.`
        : language === 'de'
        ? `etwa ${days} ${pluralizeDays(days, language)} bis zur Menstruation — füge PMS hinzu, Reizbarkeit, Kohlenhydrat-Verlangen und Wunsch alle herumzukommandieren.`
        : `до месячных примерно ${days} ${pluralizeDays(days, language)} — добавь ПМС, раздражение, тягу к углеводам и желание всех построить.`;
    }
    case 'delay': {
      const daysLate = info.daysLate ?? 1;
      return language === 'en'
        ? `period is already ${daysLate} ${pluralizeDays(daysLate, language)} late — emphasize anxiety, obsessive symptom-checking and whisper "take a test".`
        : language === 'de'
        ? `Menstruation ist bereits ${daysLate} ${pluralizeDays(daysLate, language)} verspätet — betone Angst, zwanghafte Symptomprüfung und flüstere "mach einen Test".`
        : `менструация уже задерживается на ${daysLate} ${pluralizeDays(daysLate, language)} — подчеркни тревожность, навязчивые проверки симптомов и шёпот «сделай тест».`;
    }
    default:
      return language === 'en'
        ? 'cycle in a relatively calm phase — mention recovery, usual fatigue and background mood monitoring.'
        : language === 'de'
        ? 'Zyklus in einer relativ ruhigen Phase — erwähne Erholung, gewohnte Müdigkeit und Hintergrund-Stimmungsüberwachung.'
        : 'цикл в относительно спокойной фазе — упомяни восстановление, привычную усталость и фоновый контроль настроения.';
  }
}

export function buildWeeklyCycleHint(
  cycles: CycleData[],
  isoDate: string,
  language = 'ru',
  userName?: string
): string | null {
  if (!cycles.length) {
    return null;
  }

  const startDate = toDate(isoDate);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const occurrencesMap = new Map<CyclePhase, CycleOccurrence[]>();

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(startDate, offset);
    const info = evaluateCyclePhase(cycles, date);
    if (!info || info.phase === 'neutral') {
      continue;
    }
    const list = occurrencesMap.get(info.phase) ?? [];
    list.push({ offset, date, info });
    occurrencesMap.set(info.phase, list);
  }

  if (occurrencesMap.size === 0) {
    return language === 'en'
      ? 'cycle proceeds calmly this week — emphasize that at least the hormones are giving her a break.'
      : language === 'de'
      ? 'Zyklus läuft diese Woche ruhig — betone, dass wenigstens die Hormone eine Pause geben.'
      : 'цикл на неделе идёт в спокойном режиме — подчеркни, что хотя бы гормоны дают передышку.';
  }

  const segments: string[] = [];

  const menstruationDays = occurrencesMap.get('menstruation');
  if (menstruationDays?.length) {
    const first = menstruationDays[0];
    const last = menstruationDays[menstruationDays.length - 1];
    segments.push(
      language === 'en'
        ? `menstruation still holds ${describeSpan(first.offset, last.offset, language)} — insert about heating pads, painkillers and how she tears into everyone for disturbing her peace.`
        : language === 'de'
        ? `Menstruation hält noch ${describeSpan(first.offset, last.offset, language)} — füge ein über Wärmflaschen, Schmerzmittel und wie sie alle für die Störung ihrer Ruhe anschreit.`
        : `менструация ещё держится ${describeSpan(first.offset, last.offset, language)} — вставь про грелки, обезболь и как она рвёт всех за спокойствие.`,
    );
  }

  const fertileDays = occurrencesMap.get('fertile');
  if (fertileDays?.length) {
    const first = fertileDays[0];
    const last = fertileDays[fertileDays.length - 1];
    segments.push(
      language === 'en'
        ? `fertile window is active ${describeSpan(first.offset, last.offset, language)} — hint at heightened libido and fear of unplanned surprises.`
        : language === 'de'
        ? `fertiles Fenster ist aktiv ${describeSpan(first.offset, last.offset, language)} — deute auf erhöhte Libido und Angst vor ungeplanten Überraschungen hin.`
        : `фертильное окно активничает ${describeSpan(first.offset, last.offset, language)} — намекни на повышенное либидо и страх незапланированных сюрпризов.`,
    );
  }

  const ovulationDays = occurrencesMap.get('ovulation');
  if (ovulationDays?.length) {
    const day = ovulationDays[0];
    segments.push(
      language === 'en'
        ? `ovulation peak happens ${describeMoment(day.offset, language)} — add a joke about hormonal turbo mode and trying not to explode.`
        : language === 'de'
        ? `Ovulations-Peak passiert ${describeMoment(day.offset, language)} — füge einen Witz über hormonellen Turbo-Modus und Versuch nicht zu explodieren hinzu.`
        : `пик овуляции случится ${describeMoment(day.offset, language)} — добавь шутку про гормональный турбо-режим и попытку не взорваться.`,
    );
  }

  const pmsDays = occurrencesMap.get('pms');
  if (pmsDays?.length) {
    const first = pmsDays[0];
    const last = pmsDays[pmsDays.length - 1];
    const days = last.info.daysUntilPeriod ?? first.info.daysUntilPeriod ?? 2;
    segments.push(
      language === 'en'
        ? `PMS will start hitting ${describeSpan(first.offset, last.offset, language)} — show how she stress-eats and bosses everyone around, about ${days} ${pluralizeDays(days, language)} left until period.`
        : language === 'de'
        ? `PMS wird beginnen zu treffen ${describeSpan(first.offset, last.offset, language)} — zeige, wie sie Stress-isst und alle herumkommandiert, etwa ${days} ${pluralizeDays(days, language)} bis zur Menstruation.`
        : `ПМС начнёт накрывать ${describeSpan(first.offset, last.offset, language)} — покажи, как она заедает стресс и строит всех вокруг, до месячных останется ~${days} ${pluralizeDays(days, language)}.`,
    );
  }

  const delayDays = occurrencesMap.get('delay');
  if (delayDays?.length) {
    const day = delayDays[0];
    const daysLate = day.info.daysLate ?? 1;
    segments.push(
      language === 'en'
        ? `delay will loom in the background ${describeMoment(day.offset, language)} — add anxiety, calendar-checking and questionable Google searches (already ${daysLate} ${pluralizeDays(daysLate, language)} late).`
        : language === 'de'
        ? `Verspätung wird im Hintergrund hängen ${describeMoment(day.offset, language)} — füge Angst hinzu, Kalender-Prüfung und fragwürdige Google-Suchen (bereits ${daysLate} ${pluralizeDays(daysLate, language)} verspätet).`
        : `задержка будет висеть фоном ${describeMoment(day.offset, language)} — добавь тревожность, проверку календаря и сомнительные гугл-запросы (задержка уже ${daysLate} ${pluralizeDays(daysLate, language)}).`,
    );
  }

  if (segments.length === 0) {
    const herDative = language === 'en' ? 'her' : language === 'de' ? 'ihr' : (userName || 'ей');
    return language === 'en'
      ? 'cycle this week without special events — can let her recover a bit without hormonal swings.'
      : language === 'de'
      ? 'Zyklus diese Woche ohne besondere Ereignisse — kann ihr erlauben sich etwas zu erholen ohne hormonelle Schwankungen.'
      : `цикл на неделе без особых событий — можно позволить ${herDative} слегка восстановиться без гормональных качелей.`;
  }

  return segments.join(' ');
}

export function buildSergeyCycleHint(
  cycles: CycleData[],
  isoDate: string,
  language = 'ru',
  userName?: string,
  partnerName?: string
): string | null {
  if (!cycles.length) {
    return null;
  }

  const target = toDate(isoDate);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const info = evaluateCyclePhase(cycles, target);
  if (!info) {
    return null;
  }

  // Default names if not provided
  const user = userName || (language === 'en' ? 'she' : language === 'de' ? 'sie' : 'она');
  const partner = partnerName || (language === 'en' ? 'you' : language === 'de' ? 'du' : 'ты');

  // Genitive forms for Russian
  const userGenitive = userName ? `у ${userName}` : 'у неё';
  const partnerDative = partnerName ? partnerName.endsWith('а') || partnerName.endsWith('я') ? partnerName.slice(0, -1) + 'е' : `${partnerName}у` : 'тебе';

  switch (info.phase) {
    case 'menstruation': {
      const dayWord = getOrdinalWord(info.dayInPeriod ?? 1, language);
      return language === 'en'
        ? `${user} is on ${user === 'she' ? 'her' : 'their'} ${dayWord} day of menstruation — emphasize ${user === 'she' ? 'she\'s' : 'they\'re'} feeling awful, weak and irritated, and ${partner} better be compliant and without complaints.`
        : language === 'de'
        ? `${user} ist am ${dayWord} Tag ${user === 'sie' ? 'ihrer' : 'der'} Menstruation — betone, dass es ${user === 'sie' ? 'ihr' : 'ihnen'} schlecht geht, ${user === 'sie' ? 'sie' : 'sie'} schwach und gereizt ist, und ${partner} besser nachgiebig und ohne Ansprüche bist.`
        : `${userGenitive} ${dayWord} день менструации — сделай акцент, что ей плохо, она слабая и раздражённая, а ${partnerDative}, лучше быть податливым и без претензий.`;
    }
    case 'ovulation':
      return language === 'en'
        ? `${user} is at peak ovulation — emphasize ${user === 'she' ? 'her' : 'their'} hyperdrive and ${partner === 'you' ? 'your' : 'their'} attempts not to let it lead to an unplanned child.`
        : language === 'de'
        ? `${user} ist am Ovulations-Peak — betone ${user === 'sie' ? 'ihren' : 'den'} Hyperdrive und deine Versuche nicht ein ungeplantes Kind zuzulassen.`
        : `${userGenitive} пик овуляции — подчеркни её гипердрайв и твои попытки не довести дело до незапланированного ребёнка.`;
    case 'fertile':
      return language === 'en'
        ? `${user} has an active fertile window — mention hormonal swings, ${partner === 'you' ? 'your' : 'their'} paranoia about "getting knocked up" and need to hold the defense.`
        : language === 'de'
        ? `${user} hat ein aktives fertiles Fenster — erwähne hormonelle Schwankungen, deine Paranoia über "Schwangerschaft" und Notwendigkeit die Verteidigung zu halten.`
        : `${userGenitive} активное фертильное окно — упомяни гормональные качели, твою паранойю про «залёт» и необходимость держать оборону.`;
    case 'pms': {
      const days = info.daysUntilPeriod ?? 1;
      return language === 'en'
        ? `${user} has PMS, about ${days} ${pluralizeDays(days, language)} until period — show how ${user === 'she' ? 'she' : 'they'} explodes at the slightest thing, and ${partner} quietly hope to survive without a scandal.`
        : language === 'de'
        ? `${user} hat PMS, etwa ${days} ${pluralizeDays(days, language)} bis zur Menstruation — zeige, wie ${user === 'sie' ? 'sie' : 'sie'} bei kleinsten Anlässen explodiert, und du leise hoffst ohne Skandal zu überleben.`
        : `${userGenitive} ПМС, до месячных около ${days} ${pluralizeDays(days, language)} — покажи, как она взрывается с полоборота, а ты тихо надеешься выжить без скандала.`;
    }
    case 'delay': {
      const late = info.daysLate ?? 1;
      return language === 'en'
        ? `period is already ${late} ${pluralizeDays(late, language)} late, and ${partner} walks around with tests in ${partner === 'you' ? 'your' : 'their'} head — add anxiety and desire to control everything.`
        : language === 'de'
        ? `Menstruation ist bereits ${late} ${pluralizeDays(late, language)} verspätet, und ${partner} läuft mit Tests im Kopf herum — füge Angst hinzu und Wunsch alles zu kontrollieren.`
        : `месячные опаздывают уже на ${late} ${pluralizeDays(late, language)}, и ${partner} ходит с тестами в голове — добавь тревожность и желание всё контролировать.`;
    }
    default:
      return language === 'en'
        ? `${user}'s cycle is calm right now — note that at least the hormones aren't storming, but ${partner === 'you' ? 'you\'re' : 'they\'re'} still on edge.`
        : language === 'de'
        ? `${user}s Zyklus ist jetzt ruhig — bemerke, dass wenigstens die Hormone nicht stürmen, aber du bist trotzdem auf der Hut.`
        : `цикл ${userGenitive} сейчас спокойный — отметь, что хотя бы гормоны не штурмуют, но ты всё равно на стреме.`;
  }
}
