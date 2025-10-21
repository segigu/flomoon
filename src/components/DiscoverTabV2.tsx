/**
 * DiscoverTabV2 - новая версия вкладки "Узнай себя" с централизованным ChatManager
 *
 * Основные отличия от старой версии:
 * - Использует ChatManager для унифицированного управления чатом
 * - Единый useChatScroll для автоскролла
 * - Чистая архитектура без разрозненных состояний
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatManager, type ChatManagerHandle } from './chat/ChatManager';
import type { ChatPhase } from '../types/chat';
import type { HistoryStoryOption } from '../utils/historyStory';
import { generateHistoryStoryChunk, type HistoryStoryMeta } from '../utils/historyStory';
import styles from './NastiaApp.module.css';

interface PersonalizedPlanetMessages {
  dialogue: Array<{ planet: string; message: string }>;
  timestamp: number;
}

interface DiscoverTabV2Props {
  // Общие данные приложения
  hasAiCredentials: boolean;
  effectiveClaudeKey: string | null | undefined;
  effectiveClaudeProxyUrl: string | null | undefined;
  effectiveOpenAIKey: string | null | undefined;
  effectiveOpenAIProxyUrl: string | null | undefined;

  // Персонализированные сообщения планет (загружаются фоном)
  personalizedPlanetMessages: PersonalizedPlanetMessages | null;
  isLoadingPersonalizedMessages: boolean;

  // Callback для обновления badge
  onNewStoryMessage?: () => void;
}

export const DiscoverTabV2: React.FC<DiscoverTabV2Props> = ({
  hasAiCredentials,
  effectiveClaudeKey,
  effectiveClaudeProxyUrl,
  effectiveOpenAIKey,
  effectiveOpenAIProxyUrl,
  personalizedPlanetMessages,
  isLoadingPersonalizedMessages,
  onNewStoryMessage,
}) => {
  // ============================================================================
  // STATE & REFS
  // ============================================================================

  const chatManagerRef = useRef<ChatManagerHandle>(null);
  const [isStarted, setIsStarted] = useState(false); // Просто флаг: начали ли диалог
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyMeta, setStoryMeta] = useState<HistoryStoryMeta | null>(null);
  const [currentArc, setCurrentArc] = useState(1);
  const [storyContract, setStoryContract] = useState<string | null>(null);

  // Refs для таймеров
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // История сегментов для передачи в AI
  interface StorySegment {
    text: string;
    arc: number;
    optionTitle?: string;
    optionDescription?: string;
  }
  const storySegmentsRef = useRef<StorySegment[]>([]);

  // ============================================================================
  // AUTOSCROLL
  // ============================================================================

  const handleMessagesChange = useCallback(() => {
    // Тройной RAF для гарантированного рендера
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Скроллим до конца - tab bar учитывается через padding-bottom контейнера
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth',
          });
          console.log('[DiscoverV2] Auto-scroll to:', document.documentElement.scrollHeight);
        });
      });
    });
  }, []);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getCurrentTime = () =>
    new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ============================================================================
  // PLANET DIALOGUE GENERATION
  // ============================================================================

  const startPlanetDialogue = useCallback(async () => {
    if (!hasAiCredentials) {
      setError('Необходимо настроить API ключи в настройках');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setIsStarted(true);

    // Очистка предыдущих таймеров
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    // Очистка чата и установка фазы
    chatManagerRef.current?.clearMessages();
    chatManagerRef.current?.setPhase('dialogue');

    console.log('[DiscoverV2] Starting planet dialogue animation...');

    // 1. Первое сообщение от Луны - сразу
    setTimeout(() => {
      chatManagerRef.current?.addMessage({
        type: 'planet',
        author: 'Луна',
        content: 'Так, коллеги, собираемся! Сейчас обсудим нашу героиню.',
        time: getCurrentTime(),
        id: generateId(),
      });
    }, 100);

    // 2. Планеты "подключаются" (системные сообщения)
    const planets = ['Меркурий', 'Венера', 'Марс', 'Юпитер', 'Сатурн'];
    let connectionDelay = 600;
    planets.forEach((planet) => {
      const t = setTimeout(() => {
        chatManagerRef.current?.addMessage({
          type: 'system',
          author: 'system',
          content: `${planet} подключился к чату...`,
          time: getCurrentTime(),
          id: generateId(),
        });
      }, connectionDelay);
      timeoutsRef.current.push(t);
      connectionDelay += 400;
    });

    // 3. Диалог планет (показывается ПОКА грузится AI)
    // Используем персонализированные сообщения если есть, иначе fallback
    const dialogue = personalizedPlanetMessages?.dialogue || [
      { planet: 'Меркурий', message: 'Я думаю, ей нужна история о выборе.' },
      { planet: 'Венера', message: 'Согласна! Что-то про отношения и ценности.' },
      { planet: 'Марс', message: 'Или про действие! Надо вызов бросить.' },
      { planet: 'Луна', message: 'Хорошо, я вижу тему. Давайте про внутренний конфликт.' },
    ];

    let dialogueDelay = 2800;
    dialogue.forEach(({ planet, message }) => {
      const t1 = setTimeout(() => {
        chatManagerRef.current?.setTyping(planet as any);
      }, dialogueDelay);
      timeoutsRef.current.push(t1);

      const t2 = setTimeout(() => {
        chatManagerRef.current?.setTyping(null);
        chatManagerRef.current?.addMessage({
          type: 'planet',
          author: planet as any,
          content: message,
          time: getCurrentTime(),
          id: generateId(),
        });
      }, dialogueDelay + 1200);
      timeoutsRef.current.push(t2);

      dialogueDelay += 2000; // Следующее сообщение через 2 секунды
    });

    // 4. Запускаем AI генерацию ПАРАЛЛЕЛЬНО (не ждём диалога!)
    console.log('[DiscoverV2] Starting AI generation in background...');

    (async () => {
      try {
        const result = await generateHistoryStoryChunk({
          segments: [],
          currentChoice: undefined,
          summary: undefined,
          author: {
            name: 'История',
            stylePrompt: 'Пиши простым, современным языком. Используй короткие предложения. Избегай штампов.',
            genre: 'психологическая драма',
          },
          arcLimit: 7,
          mode: 'arc',
          currentArc: 1,
          contract: undefined,
          signal: undefined,
          claudeApiKey: effectiveClaudeKey || undefined,
          claudeProxyUrl: effectiveClaudeProxyUrl || undefined,
          openAIApiKey: effectiveOpenAIKey || undefined,
          openAIProxyUrl: effectiveOpenAIProxyUrl || undefined,
        });

        console.log('[DiscoverV2] AI generation completed!');

        // Очищаем все таймеры диалога (если AI быстрее)
        timeoutsRef.current.forEach(t => clearTimeout(t));
        timeoutsRef.current = [];

        chatManagerRef.current?.setTyping(null);

        // Сохраняем метаданные
        if (result.meta) {
          setStoryMeta(result.meta);
          setStoryContract(result.meta.contract);
        }

        const moonSummary = result.meta?.moonSummary || 'Сейчас расскажу вам историю...';
        const arc = result.node?.scene || 'История начинается...';

        // Переходим к фазе moon и показываем сообщение от Луны
        chatManagerRef.current?.setPhase('moon');
        chatManagerRef.current?.setTyping('Луна');

        setTimeout(() => {
          chatManagerRef.current?.setTyping(null);
          chatManagerRef.current?.addMessage({
            type: 'moon',
            author: 'Луна',
            content: moonSummary,
            time: getCurrentTime(),
            id: generateId(),
          });

          // Переходим к истории
          setTimeout(() => {
            chatManagerRef.current?.setPhase('story');
            chatManagerRef.current?.addMessage({
              type: 'story',
              author: 'История',
              content: arc,
              time: getCurrentTime(),
              id: generateId(),
            });

            storySegmentsRef.current.push({
              text: arc,
              arc: 1,
            });

            setTimeout(() => {
              chatManagerRef.current?.setChoices(result.options || []);
              setIsGenerating(false);
            }, 500);
          }, 1000);
        }, 1500);

      } catch (err) {
        console.error('[DiscoverV2] Error generating story:', err);
        setError(err instanceof Error ? err.message : 'Ошибка генерации истории');
        setIsGenerating(false);
        chatManagerRef.current?.setTyping(null);
      }
    })();

  }, [
    hasAiCredentials,
    effectiveClaudeKey,
    effectiveClaudeProxyUrl,
    effectiveOpenAIKey,
    effectiveOpenAIProxyUrl,
  ]);

  // ============================================================================
  // INTERACTIVE STORY
  // ============================================================================

  const handleChoiceSelect = useCallback(async (choice: HistoryStoryOption) => {
    console.log('[DiscoverV2] Choice selected:', choice.id, choice.title);

    setIsGenerating(true);

    // Скрываем кнопки и добавляем user message
    chatManagerRef.current?.setChoices([]);

    setTimeout(async () => {
      // Добавляем выбор пользователя как сообщение
      chatManagerRef.current?.addMessage({
        type: 'user',
        author: 'Настя',
        content: choice.description || choice.title,
        time: getCurrentTime(),
        id: generateId(),
      });

      // Показываем typing indicator
      setTimeout(async () => {
        chatManagerRef.current?.setTyping('История');

        try {
          const nextArc = currentArc + 1;
          const arcLimit = storyMeta?.arcLimit || 7;

          // Берём последние 4 сегмента для контекста
          const recentSegments = storySegmentsRef.current.slice(-4);

          // Проверяем, нужен ли финал
          const isFinaleTime = nextArc > arcLimit;

          const result = await generateHistoryStoryChunk({
            segments: recentSegments,
            currentChoice: choice,
            summary: undefined,
            author: {
              name: storyMeta?.author || 'История',
              stylePrompt: 'Пиши простым, современным языком. Используй короткие предложения. Избегай штампов.',
              genre: storyMeta?.genre || 'психологическая драма',
            },
            arcLimit,
            mode: isFinaleTime ? 'finale' : 'arc',
            currentArc: nextArc,
            contract: storyContract || undefined,
            signal: undefined,
            claudeApiKey: effectiveClaudeKey || undefined,
            claudeProxyUrl: effectiveClaudeProxyUrl || undefined,
            openAIApiKey: effectiveOpenAIKey || undefined,
            openAIProxyUrl: effectiveOpenAIProxyUrl || undefined,
          });

          chatManagerRef.current?.setTyping(null);

          if (isFinaleTime && result.finale) {
            // Показываем финал
            chatManagerRef.current?.setPhase('finale');

            chatManagerRef.current?.addMessage({
              type: 'story',
              author: 'История',
              content: result.finale.resolution,
              time: getCurrentTime(),
              id: generateId(),
            });

            setTimeout(() => {
              chatManagerRef.current?.addMessage({
                type: 'moon',
                author: 'Луна',
                content: result.finale!.humanInterpretation,
                time: getCurrentTime(),
                id: generateId(),
              });

              setTimeout(() => {
                chatManagerRef.current?.addMessage({
                  type: 'planet',
                  author: 'Меркурий',
                  content: result.finale!.astrologicalInterpretation,
                  time: getCurrentTime(),
                  id: generateId(),
                });
                setIsGenerating(false);
              }, 1500);
            }, 1000);
          } else {
            // Обычная дуга
            const arcText = result.node?.scene || 'История продолжается...';

            chatManagerRef.current?.addMessage({
              type: 'story',
              author: 'История',
              content: arcText,
              time: getCurrentTime(),
              id: generateId(),
            });

            // Сохраняем сегмент
            storySegmentsRef.current.push({
              text: arcText,
              arc: nextArc,
              optionTitle: choice.title,
              optionDescription: choice.description,
            });

            setCurrentArc(nextArc);

            // Показываем новые кнопки выбора
            setTimeout(() => {
              chatManagerRef.current?.setChoices(result.options || []);
              setIsGenerating(false);
            }, 500);
          }

        } catch (err) {
          console.error('[DiscoverV2] Error generating story continuation:', err);
          setError(err instanceof Error ? err.message : 'Ошибка генерации истории');
          setIsGenerating(false);
          chatManagerRef.current?.setTyping(null);
        }
      }, 800);
    }, 350); // Задержка для анимации скрытия кнопок

  }, [
    currentArc,
    storyMeta,
    storyContract,
    effectiveClaudeKey,
    effectiveClaudeProxyUrl,
    effectiveOpenAIKey,
    effectiveOpenAIProxyUrl,
  ]);

  const handleCustomOptionClick = useCallback(() => {
    console.log('[DiscoverV2] Custom voice option clicked');
    alert('Голосовой ввод пока не реализован');
  }, []);

  // ============================================================================
  // RESET
  // ============================================================================

  const resetDiscover = useCallback(() => {
    // Очистка таймеров
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    chatManagerRef.current?.clearMessages();
    setIsStarted(false);
    setIsGenerating(false);
    setError(null);
    setStoryMeta(null);
    setCurrentArc(1);
    setStoryContract(null);
    storySegmentsRef.current = [];
  }, []);

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={styles.historyChatContainer}>
      {/* Idle screen - кнопка запуска */}
      {!isStarted && (
        <div className={styles.historyStartScreen}>
          <div className={styles.historyStartIconContainer}>
            <div className={styles.historyStartIcon}>🔮</div>
          </div>
          <div>
            <div className={styles.historyStartPrompt}>
              Узнай себя через историю
            </div>
            <div className={styles.historyStartDescription}>
              Планеты создадут для тебя интерактивную историю, основанную на твоей натальной карте
            </div>
          </div>
          <button
            type="button"
            className={styles.historyStartButton}
            onClick={startPlanetDialogue}
            disabled={!hasAiCredentials}
          >
            {hasAiCredentials ? 'Начать путешествие' : 'Настройте API ключи'}
          </button>
        </div>
      )}

      {/* Dialogue/Story screen - ChatManager */}
      {isStarted && (
        <>
          {/* Заголовок с кнопкой закрытия */}
          <div className={styles.historyStoryHeader}>
            <h2 className={styles.historyStoryTitle}>
              История {' '}
              <span style={{ fontSize: '14px', opacity: 0.6 }}>
                (NEW v2 🧪)
              </span>
            </h2>
            <button
              type="button"
              className={styles.historyCloseButton}
              onClick={resetDiscover}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          {/* ChatManager - единый компонент для всех сообщений (уже содержит нужную обёртку) */}
          <ChatManager
            ref={chatManagerRef}
            onMessagesChange={handleMessagesChange}
            onChoiceSelect={handleChoiceSelect}
            onCustomOptionClick={handleCustomOptionClick}
            isActive={true}
            storyTitle="История"
          />

          {/* Error display */}
          {error && (
            <div className={styles.historyStoryError}>
              <span>{error}</span>
              <button
                type="button"
                className={styles.historyStoryRetry}
                onClick={startPlanetDialogue}
                disabled={isGenerating}
              >
                Попробовать снова
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
