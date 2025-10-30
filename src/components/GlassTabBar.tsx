import React from 'react';
import { Calendar, Activity, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './GlassTabBar.module.css';
import { isCycleTrackingEnabled, type UserProfileData } from '../utils/userContext';

export type TabId = 'calendar' | 'cycles' | 'discover' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

interface GlassTabBarProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  cycleCount?: number;
  daysUntilNext?: number; // Количество дней до следующего цикла
  hasNewStory?: boolean; // Флаг для показа badge на "Узнай себя"
  userProfile?: UserProfileData | null; // Профиль пользователя для проверки cycle_tracking_enabled
}

// Tab configuration moved inside component to access t() function

export const GlassTabBar: React.FC<GlassTabBarProps> = ({
  activeTab,
  onTabChange,
  cycleCount,
  daysUntilNext,
  hasNewStory,
  userProfile,
}) => {
  const { t } = useTranslation('tabs');

  // Base tabs configuration
  const allTabs: Tab[] = [
    {
      id: 'calendar',
      label: t('calendar'),
      icon: <Calendar size={24} />,
    },
    {
      id: 'cycles',
      label: t('cycles'),
      icon: <Activity size={24} />,
    },
    {
      id: 'discover',
      label: t('discover'),
      icon: <span style={{ fontSize: '24px' }}>🔮</span>,
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: <Settings size={24} />,
    },
  ];

  // Conditionally filter 'cycles' tab based on cycle tracking setting
  // Privacy-first: hide cycles tab if user disabled cycle tracking
  const tabs = allTabs.filter((tab) => {
    if (tab.id === 'cycles') {
      return isCycleTrackingEnabled(userProfile);
    }
    return true;
  });

  return (
    <div className={styles.glassTabBarContainer}>
      <div className={styles.glassTabBarGradient} />
      <nav className={styles.glassTabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          // Кастомная иконка для вкладки "Календарь" - квадратик с днями до следующего цикла
          let tabIcon = tab.icon;

          if (tab.id === 'calendar' && daysUntilNext !== undefined) {
            tabIcon = (
              <div className={styles.calendarDaysSquare}>
                <span className={styles.calendarDaysNumber}>{daysUntilNext}</span>
              </div>
            );
          } else if (tab.id === 'cycles' && cycleCount !== undefined && cycleCount > 0) {
            // Кастомная иконка для вкладки "Циклы" - кружок с числом
            tabIcon = (
              <div className={styles.cycleCountCircle}>
                <span className={styles.cycleCountNumber}>{cycleCount}</span>
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`${styles.tabButton} ${isActive ? styles.active : ''}`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={styles.tabIcon}>
                {tabIcon}
                {/* Badge с цифрой для "Узнай себя" при новых сообщениях */}
                {tab.id === 'discover' && hasNewStory && !isActive && (
                  <span className={styles.notificationBadge}>1</span>
                )}
              </div>
              <div className={styles.tabLabel}>
                {tab.label}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
