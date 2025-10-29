import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CycleData } from '../types';
import { diffInDays } from '../utils/dateUtils';
import styles from './CycleLengthChart.module.css';

interface CycleLengthChartProps {
  cycles: CycleData[];
}

const CycleLengthChart: React.FC<CycleLengthChartProps> = ({ cycles }) => {
  const { t, i18n } = useTranslation('calendar');

  // Сортируем циклы по дате
  const sortedCycles = [...cycles].sort((a, b) =>
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  // Вычисляем длины циклов
  const cycleLengths: { date: Date; length: number; }[] = [];
  for (let i = 1; i < sortedCycles.length; i++) {
    const length = diffInDays(
      new Date(sortedCycles[i - 1].startDate),
      new Date(sortedCycles[i].startDate)
    );
    cycleLengths.push({
      date: new Date(sortedCycles[i].startDate),
      length,
    });
  }

  // Берем последние 12 циклов
  const recentCycles = cycleLengths.slice(-12);

  if (recentCycles.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>{t('chart.noData')}</p>
        <p className={styles.hint}>{t('chart.needTwoCycles')}</p>
      </div>
    );
  }

  // Определяем локаль на основе языка приложения
  const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'de' ? 'de-DE' : 'ru-RU';

  // Подготавливаем данные для recharts
  const normalBarColor = '#cbb6ff';
  const chartData = recentCycles.map(cycle => ({
    month: cycle.date.toLocaleDateString(locale, { month: 'short' }),
    length: cycle.length,
    fill: cycle.length >= 21 && cycle.length <= 35 ? normalBarColor : '#f59e0b'
  }));

  // Вычисляем среднее
  const lengths = recentCycles.map(c => c.length);
  const average = Math.round(lengths.reduce((sum, l) => sum + l, 0) / lengths.length);

  // Диапазон для оси Y
  const minValue = Math.min(...lengths) - 1;
  const maxValue = Math.max(...lengths) + 1;

  // Вычисляем ширину для горизонтального скроллинга
  const minWidth = Math.max(chartData.length * 60, 300); // минимум 60px на столбец

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{t('chart.title')}</h3>

      <div className={styles.chartScrollContainer}>
        <div style={{ minWidth: `${minWidth}px`, width: '100%' }}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 20, right: 70, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis
            domain={[minValue, maxValue]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
            formatter={(value: number) => [`${value} ${t('chart.days')}`, t('chart.cycleLength')]}
          />
          <ReferenceLine
            y={average}
            stroke="#9f3de6"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `${t('chart.avg')}${average}`,
              position: 'right',
              fill: '#9f3de6',
              fontSize: 11,
              fontWeight: 600
            }}
          />
          <Bar
            dataKey="length"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <rect key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartLegend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendBox} ${styles.legendNormal}`}></div>
          <span>{t('chart.normal')}</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendBox} ${styles.legendAbnormal}`}></div>
          <span>{t('chart.abnormal')}</span>
        </div>
      </div>
    </div>
  );
};

export default CycleLengthChart;
