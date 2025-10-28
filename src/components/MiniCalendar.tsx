import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './MiniCalendar.module.css';

interface MiniCalendarProps {
  date: Date;
  imageUrl?: string; // Опциональная картинка справа (80×130)
  onDelete?: () => void; // Коллбэк для кнопки удаления
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ date, imageUrl, onDelete }) => {
  const { t } = useTranslation('calendar');

  // Получаем данные о месяце
  const year = date.getFullYear();
  const month = date.getMonth();
  const targetDay = date.getDate();

  // Название месяца (локализованное)
  const monthNames = [
    t('months.january'),
    t('months.february'),
    t('months.march'),
    t('months.april'),
    t('months.may'),
    t('months.june'),
    t('months.july'),
    t('months.august'),
    t('months.september'),
    t('months.october'),
    t('months.november'),
    t('months.december')
  ];

  // Дни недели (короткие, локализованные)
  const weekDays = [
    t('weekDays.mon'),
    t('weekDays.tue'),
    t('weekDays.wed'),
    t('weekDays.thu'),
    t('weekDays.fri'),
    t('weekDays.sat'),
    t('weekDays.sun')
  ];

  // Получаем первый день месяца
  const firstDay = new Date(year, month, 1);
  let firstDayOfWeek = firstDay.getDay();
  // Корректируем: воскресенье = 0, нужно сделать 7
  firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;

  // Количество дней в месяце
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Количество дней в предыдущем месяце
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Генерируем массив дней для отображения
  const days: Array<{ day: number; isCurrentMonth: boolean; isTarget: boolean }> = [];

  // Дни из предыдущего месяца
  for (let i = firstDayOfWeek - 1; i > 0; i--) {
    days.push({
      day: daysInPrevMonth - i + 1,
      isCurrentMonth: false,
      isTarget: false
    });
  }

  // Дни текущего месяца
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      isTarget: i === targetDay
    });
  }

  // Дни из следующего месяца (чтобы заполнить сетку)
  const remainingDays = 35 - days.length; // 5 недель максимум
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      isTarget: false
    });
  }

  return (
    <div className={styles.miniCalendar}>
      {/* Календарная сетка слева */}
      <div className={styles.calendarContent}>
        <div className={styles.monthName}>
          {monthNames[month]} {year}
        </div>

        <div className={styles.weekDays}>
          {weekDays.map((day, index) => (
            <div key={index} className={styles.weekDay}>
              {day}
            </div>
          ))}
        </div>

        <div className={styles.daysGrid}>
          {days.map((dayInfo, index) => (
            <div
              key={index}
              className={`${styles.day} ${
                !dayInfo.isCurrentMonth ? styles.otherMonth : ''
              } ${dayInfo.isTarget ? styles.targetDay : ''}`}
            >
              {dayInfo.day}
              {dayInfo.isTarget && (
                <svg
                  className={styles.handDrawnCircle}
                  viewBox="0 0 50 50"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ display: 'block' }}
                >
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="#ff6b9d"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Картинка справа (опционально) */}
      {imageUrl && (
        <div className={styles.imageContainer}>
          <img
            src={imageUrl}
            alt=""
            className={styles.image}
            onError={(e) => {
              // Fallback на default.png если картинка не загрузилась
              const target = e.target as HTMLImageElement;
              target.src = `${process.env.PUBLIC_URL}/images/calendar-months/default.png`;
            }}
          />
          {onDelete && (
            <button
              onClick={onDelete}
              className={styles.deleteButton}
              title="Удалить цикл"
              aria-label="Удалить цикл"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MiniCalendar;
