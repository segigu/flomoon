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
import type { HistoryStoryOption } from '../utils/historyStory';
import { generateHistoryStoryChunk, type HistoryStoryMeta } from '../utils/historyStory';
import {
  calculateTypingDuration,
  calculatePauseBefore,
  calculatePauseAfter,
} from '../utils/planetMessages';
import styles from './NastiaApp.module.css';

// Константы для рандомных промптов
const HISTORY_START_PROMPTS = [
  'Давай проверим, насколько ты правдива с собой сегодня',
  'Готова разобрать себя на части? Звёзды уже наточили скальпель',
  'Что если астрология знает о тебе больше, чем ты думаешь?',
  'Твоя карта готова рассказать правду — ты?',
  'Проверь себя на честность, пока никто не видит',
];

const HISTORY_START_BUTTONS = [
  'Начать историю',
  'Проверить себя',
  'Узнать правду',
  'Погнали',
  'Давай',
  'Поехали',
];

const HISTORY_START_DESCRIPTIONS = [
  'Я создам для тебя персональную историю, в которой ты будешь делать выборы. А потом разберу каждое твоё решение по косточкам',
  'Тебя ждёт интерактивная история с выборами. В конце я проанализирую твои решения и скажу, где ты была честна с собой',
  'Пройдёшь через историю с развилками. Я буду следить за твоими выборами, а потом расскажу, что они говорят о тебе',
];

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

  // Finale interpretations
  const [finaleInterpretations, setFinaleInterpretations] = useState<{ human: string; astrological: string } | null>(null);
  const [finaleInterpretationMode, setFinaleInterpretationMode] = useState<'human' | 'astrological'>('human');

  // Рандомные тексты для idle экрана (генерируются один раз)
  const [startPrompt] = useState(() =>
    HISTORY_START_PROMPTS[Math.floor(Math.random() * HISTORY_START_PROMPTS.length)]
  );
  const [startButton] = useState(() =>
    HISTORY_START_BUTTONS[Math.floor(Math.random() * HISTORY_START_BUTTONS.length)]
  );
  const [startDescription] = useState(() =>
    HISTORY_START_DESCRIPTIONS[Math.floor(Math.random() * HISTORY_START_DESCRIPTIONS.length)]
  );

  // Анимация появления элементов idle экрана
  const [visibleElements, setVisibleElements] = useState<string[]>([]);

  // Refs для таймеров
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Refs для актуальных значений props (для использования в callback'ах)
  const personalizedMessagesRef = useRef(personalizedPlanetMessages);
  const isLoadingRef = useRef(isLoadingPersonalizedMessages);

  // Ref для результата AI генерации (чтобы не прерывать диалог планет)
  const aiResultRef = useRef<any>(null);

  // Флаг для остановки диалога после текущего сообщения
  const stopDialogueAfterCurrentRef = useRef<boolean>(false);

  // Флаг: был ли диалог запущен
  const dialogueStartedRef = useRef<boolean>(false);

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

    // Очистка чата
    chatManagerRef.current?.clearMessages();

    console.log('[DiscoverV2] Starting planet dialogue animation...');

    // ВАЖНО: Устанавливаем фазу и добавляем первое сообщение с задержкой
    // чтобы гарантировать, что React успел обновить state после clearMessages
    setTimeout(() => {
      chatManagerRef.current?.setPhase('dialogue');

      // Добавляем первое сообщение сразу после установки фазы
      setTimeout(() => {
        chatManagerRef.current?.addMessage({
          type: 'planet',
          author: 'Луна',
          content: 'Так, коллеги, собираемся! Сейчас обсудим, какую историю для Насти придумать...',
          time: getCurrentTime(),
          id: generateId(),
        });
      }, 50);
    }, 100);

    // 2. Планеты "подключаются" (системные сообщения)
    // Индивидуальные задержки отражают характер каждой планеты
    const planetsWithDelays = [
      { planet: 'Меркурий', delay: 600 },   // Самый быстрый - первый
      { planet: 'Марс', delay: 900 },       // Быстрый, решительный
      { planet: 'Венера', delay: 1300 },    // Легкая, но не спешит
      { planet: 'Уран', delay: 1500 },      // Непредсказуемый - может и быстро
      { planet: 'Плутон', delay: 2200 },    // Медленный, тяжеловесный
      { planet: 'Юпитер', delay: 2700 },    // Философский, неторопливый
      { planet: 'Сатурн', delay: 3300 },    // Строгий, размеренный
      { planet: 'Хирон', delay: 4000 },     // Задумчивый, медленный
      { planet: 'Нептун', delay: 4800 },    // Самый медленный - последний
    ];

    planetsWithDelays.forEach(({ planet, delay }) => {
      const t = setTimeout(() => {
        chatManagerRef.current?.addMessage({
          type: 'system',
          author: planet as any,
          content: 'подключился к чату...',
          time: getCurrentTime(),
          id: generateId(),
        });
      }, delay);
      timeoutsRef.current.push(t);
    });

    // 3. Диалог планет (показывается ПОКА грузится AI)
    // Используем ТОЛЬКО персонализированные сообщения (без fallback!)

    // Функция для запуска диалога с вариативными паузами
    const startDialogue = (dialogue: Array<{ planet: string; message: string }>) => {
      console.log('[DiscoverV2] Starting planet dialogue with', dialogue.length, 'messages');

      // Устанавливаем флаг, что диалог запущен
      dialogueStartedRef.current = true;

      // Если AI УЖЕ готова - устанавливаем флаг остановки сразу
      if (aiResultRef.current) {
        stopDialogueAfterCurrentRef.current = true;
        console.log('[DiscoverV2] AI already ready, dialogue will stop after first message');
      } else {
        // Сбрасываем флаг остановки
        stopDialogueAfterCurrentRef.current = false;
      }

      // Задержка после последнего подключения планет (Нептун: 4800ms) + пауза 600ms
      const startDelay = 5400;
      let messageIndex = 0;

      // Рекурсивная функция для генерации сообщений с индивидуальными паузами
      const generateMessage = (delay: number) => {
        // Проверяем, не нужно ли остановиться
        if (stopDialogueAfterCurrentRef.current) {
          console.log('[DiscoverV2] ⛔ Stopping dialogue as requested, showing AI result');
          if (aiResultRef.current) {
            showAIResult(aiResultRef.current);
            aiResultRef.current = null;
          }
          return;
        }

        if (messageIndex >= dialogue.length) {
          console.log('[DiscoverV2] ✅ All personalized messages shown');
          // Если AI уже готова - показываем результат
          if (aiResultRef.current) {
            console.log('[DiscoverV2] Dialogue complete, AI result ready, showing now');
            showAIResult(aiResultRef.current);
            aiResultRef.current = null;
          }
          return;
        }

        const { planet, message } = dialogue[messageIndex];
        messageIndex++;

        // Рассчитываем индивидуальную паузу перед началом печати для этой планеты
        const pauseBefore = calculatePauseBefore(planet);

        // Показываем индикатор печати с индивидуальной задержкой
        const t1 = setTimeout(() => {
          chatManagerRef.current?.setTyping(planet as any);
        }, delay + pauseBefore);
        timeoutsRef.current.push(t1);

        // Рассчитываем индивидуальную длительность печати на основе длины сообщения и скорости планеты
        const typingDuration = calculateTypingDuration(message, planet);

        // Добавляем сообщение после typing
        const t2 = setTimeout(() => {
          chatManagerRef.current?.setTyping(null);
          chatManagerRef.current?.addMessage({
            type: 'planet',
            author: planet as any,
            content: message,
            time: getCurrentTime(),
            id: generateId(),
          });

          // ПОСЛЕ отображения сообщения - проверяем, не нужно ли остановиться
          if (stopDialogueAfterCurrentRef.current) {
            console.log('[DiscoverV2] ⛔ Current message displayed, stopping dialogue, showing AI result');
            if (aiResultRef.current) {
              showAIResult(aiResultRef.current);
              aiResultRef.current = null;
            }
            return;
          }

          // Рассчитываем индивидуальную паузу после сообщения для этой планеты
          const pauseAfter = calculatePauseAfter(planet);
          generateMessage(pauseAfter);
        }, delay + pauseBefore + typingDuration);
        timeoutsRef.current.push(t2);
      };

      // Запускаем первое сообщение через начальную задержку (ПОСЛЕ подключения всех планет)
      generateMessage(startDelay);
    };

    // Проверяем, загружены ли персонализированные сообщения
    const currentMessages = personalizedMessagesRef.current;
    const currentLoading = isLoadingRef.current;

    if (currentMessages?.dialogue && currentMessages.dialogue.length > 0) {
      // Уже загружены - используем сразу
      console.log('[DiscoverV2] Using cached personalized messages');
      startDialogue(currentMessages.dialogue);
    } else if (currentLoading) {
      // Загружаются - ждём с polling (БЕЗ таймаута, пока AI не готова)
      console.log('[DiscoverV2] Waiting for personalized messages to load...');
      const checkInterval = 200; // проверяем каждые 200ms

      const checkMessages = () => {
        // Проверяем актуальное значение через ref
        const messages = personalizedMessagesRef.current;

        if (messages?.dialogue && messages.dialogue.length > 0) {
          console.log('[DiscoverV2] ✅ Personalized messages loaded, starting dialogue');
          startDialogue(messages.dialogue);
          return;
        }

        // Если AI уже готова и диалог не запустился - прекращаем ждать
        if (aiResultRef.current && !dialogueStartedRef.current) {
          console.log('[DiscoverV2] ⚠️ AI ready but no dialogue messages, showing AI result');
          showAIResult(aiResultRef.current);
          aiResultRef.current = null;
          return;
        }

        // Продолжаем проверять
        const t = setTimeout(checkMessages, checkInterval);
        timeoutsRef.current.push(t);
      };

      // Начинаем проверку через 200ms
      const t = setTimeout(checkMessages, checkInterval);
      timeoutsRef.current.push(t);
    } else {
      // Не загружаются и не загружены - пропускаем диалог
      console.log('[DiscoverV2] No personalized messages available, skipping dialogue');
    }

    // 4. Запускаем AI генерацию ПАРАЛЛЕЛЬНО (но НЕ прерываем диалог!)
    console.log('[DiscoverV2] Starting AI generation in background...');

    // Функция для показа результата AI (вызывается после завершения диалога)
    const showAIResult = (result: any) => {
      console.log('[DiscoverV2] Showing AI result');

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
            const options = result.options || [];
            chatManagerRef.current?.setChoices(options);
            setIsGenerating(false);

            // Для ПЕРВОГО сегмента истории делаем красивый скролл
            // Ждём появления ВСЕХ кнопок (анимация 500ms на кнопку)
            const expectedButtonCount = options.length + 1; // +1 для кастомной кнопки "Свой вариант"
            const animationDuration = expectedButtonCount * 500; // 500ms на кнопку

            console.log('[DiscoverV2] First story segment, will wait for', expectedButtonCount, 'buttons (', animationDuration, 'ms)');

            // Ждём окончания анимации появления ВСЕХ кнопок
            setTimeout(() => {
              console.log('[DiscoverV2] Button animation complete, performing reveal scroll');

              // Шаг 1: Скролл вниз до конца (показываем всё, включая кнопки)
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    window.scrollTo({
                      top: document.documentElement.scrollHeight,
                      behavior: 'smooth',
                    });
                    console.log('[DiscoverV2] Scrolled down to show everything');

                    // Шаг 2: Через 800ms откатываем к началу сообщения Луны
                    setTimeout(() => {
                      // Ищем сообщение Луны (type="moon")
                      const moonMessage = document.querySelector('[data-message-type="moon"]');
                      if (moonMessage) {
                        const rect = moonMessage.getBoundingClientRect();
                        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                        const moonTop = rect.top + currentScroll;

                        // Скроллим так, чтобы начало сообщения было под шапкой
                        // Шапка "История (NEW v2 🧪)" примерно 60px
                        const headerHeight = 60;
                        const targetScroll = moonTop - headerHeight;

                        console.log('[DiscoverV2] Scrolling back to moon message at', targetScroll);
                        window.scrollTo({
                          top: targetScroll,
                          behavior: 'smooth',
                        });
                      } else {
                        console.warn('[DiscoverV2] Moon message not found for scroll-back');
                      }
                    }, 800); // Пауза чтобы пользователь увидел всё
                  });
                });
              });
            }, animationDuration + 200); // +200ms запас после анимации
          }, 500);
        }, 1000);
      }, 1500);
    };

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

        // Сохраняем результат
        aiResultRef.current = result;

        // Если диалог УЖЕ запущен - устанавливаем флаг остановки
        if (dialogueStartedRef.current) {
          stopDialogueAfterCurrentRef.current = true;
          console.log('[DiscoverV2] Dialogue running, will stop after current message completes');
        } else {
          // Диалог не запущен - результат покажет polling при загрузке сообщений (или сразу если сообщения не загрузятся)
          console.log('[DiscoverV2] Dialogue not started yet, result saved for polling to handle');
        }

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

            // Сохраняем интерпретации для показа с переключателями
            setTimeout(() => {
              setFinaleInterpretations({
                human: result.finale!.humanInterpretation,
                astrological: result.finale!.astrologicalInterpretation,
              });
              setIsGenerating(false);

              // Reveal scroll для финала - откатываем к началу финального story-сообщения
              setTimeout(() => {
                console.log('[DiscoverV2] Finale interpretations ready, performing reveal scroll');

                // Шаг 1: Скролл вниз до конца
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      window.scrollTo({
                        top: document.documentElement.scrollHeight,
                        behavior: 'smooth',
                      });
                      console.log('[DiscoverV2] Scrolled down to show finale interpretations');

                      // Шаг 2: Через 800ms откатываем к началу финального story-сообщения
                      setTimeout(() => {
                        const allStoryMessages = document.querySelectorAll('[data-message-type="story"]');
                        const finaleStoryMessage = allStoryMessages[allStoryMessages.length - 1];

                        if (finaleStoryMessage) {
                          const rect = finaleStoryMessage.getBoundingClientRect();
                          const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                          const storyTop = rect.top + currentScroll;

                          const headerHeight = 60;
                          const targetScroll = storyTop - headerHeight;

                          console.log('[DiscoverV2] Scrolling back to finale story message at', targetScroll);
                          window.scrollTo({
                            top: targetScroll,
                            behavior: 'smooth',
                          });
                        }
                      }, 800);
                    });
                  });
                });
              }, 100);
            }, 800);
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
              const options = result.options || [];
              chatManagerRef.current?.setChoices(options);
              setIsGenerating(false);

              // Для сегментов 2-6 делаем reveal scroll к началу текущего story-сообщения
              const expectedButtonCount = options.length + 1; // +1 для кастомной кнопки
              const animationDuration = expectedButtonCount * 500; // 500ms на кнопку

              console.log('[DiscoverV2] Arc', nextArc, '- will wait for', expectedButtonCount, 'buttons (', animationDuration, 'ms)');

              // Ждём окончания анимации появления ВСЕХ кнопок
              setTimeout(() => {
                console.log('[DiscoverV2] Button animation complete, performing reveal scroll for arc', nextArc);

                // Шаг 1: Скролл вниз до конца
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      window.scrollTo({
                        top: document.documentElement.scrollHeight,
                        behavior: 'smooth',
                      });
                      console.log('[DiscoverV2] Scrolled down to show everything');

                      // Шаг 2: Через 800ms откатываем к началу ТЕКУЩЕГО story-сообщения
                      setTimeout(() => {
                        // Ищем последнее story-сообщение (текущий сегмент истории)
                        const allStoryMessages = document.querySelectorAll('[data-message-type="story"]');
                        const currentStoryMessage = allStoryMessages[allStoryMessages.length - 1];

                        if (currentStoryMessage) {
                          const rect = currentStoryMessage.getBoundingClientRect();
                          const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                          const storyTop = rect.top + currentScroll;

                          const headerHeight = 60;
                          const targetScroll = storyTop - headerHeight;

                          console.log('[DiscoverV2] Scrolling back to story segment', nextArc, 'at', targetScroll);
                          window.scrollTo({
                            top: targetScroll,
                            behavior: 'smooth',
                          });
                        }
                      }, 800); // Пауза чтобы пользователь увидел всё
                    });
                  });
                });
              }, animationDuration + 200); // +200ms запас после анимации
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

  const handleFinaleInterpretationToggle = useCallback((mode: 'human' | 'astrological') => {
    setFinaleInterpretationMode(mode);
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
    setFinaleInterpretations(null);
    setFinaleInterpretationMode('human');
    storySegmentsRef.current = [];

    // Очистка refs для синхронизации AI и диалога
    aiResultRef.current = null;
    stopDialogueAfterCurrentRef.current = false;
    dialogueStartedRef.current = false;
  }, []);

  // Обновляем refs при изменении props (для актуальности в callback'ах)
  useEffect(() => {
    personalizedMessagesRef.current = personalizedPlanetMessages;
    isLoadingRef.current = isLoadingPersonalizedMessages;
  }, [personalizedPlanetMessages, isLoadingPersonalizedMessages]);

  // Анимация появления элементов idle экрана
  useEffect(() => {
    if (isStarted) {
      setVisibleElements([]);
      return;
    }

    // Сбрасываем и запускаем анимацию
    setVisibleElements([]);
    const elementsToAnimate = ['icon', 'prompt', 'description', 'button'];
    const timers = elementsToAnimate.map((elementId, index) =>
      window.setTimeout(() => {
        setVisibleElements(prev => prev.includes(elementId) ? prev : [...prev, elementId]);
      }, 100 * index + 50)
    );

    return () => {
      timers.forEach(t => window.clearTimeout(t));
    };
  }, [isStarted]);

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
          <div className={`${styles.historyStartIconContainer} ${styles.calendarElementAnimated} ${visibleElements.includes('icon') ? styles.calendarElementVisible : ''}`}>
            <div className={styles.historyStartIcon}>✨</div>
          </div>
          <div>
            <div className={`${styles.historyStartPrompt} ${styles.calendarElementAnimated} ${visibleElements.includes('prompt') ? styles.calendarElementVisible : ''}`}>
              {startPrompt}
            </div>
            <div className={`${styles.historyStartDescription} ${styles.calendarElementAnimated} ${visibleElements.includes('description') ? styles.calendarElementVisible : ''}`}>
              {startDescription}
            </div>
          </div>
          <button
            type="button"
            className={`${styles.historyStartButton} ${styles.calendarElementAnimated} ${visibleElements.includes('button') ? styles.calendarElementVisible : ''}`}
            onClick={startPlanetDialogue}
            disabled={!hasAiCredentials}
          >
            {hasAiCredentials ? startButton : 'Настройте API ключи'}
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

          {/* Finale interpretations block */}
          {finaleInterpretations && !isGenerating && (
            <div className={`${styles.historyChatBubble} ${styles.historyFinalSummaryBubble}`}>
              <div className={styles.historyFinalSummaryHeader}>
                <div className={styles.historyFinalSummaryLabel}>Что мы о тебе узнали</div>
                <div className={styles.insightStyleToggle}>
                  <button
                    type="button"
                    className={`${styles.insightStyleButton} ${finaleInterpretationMode === 'human' ? styles.active : ''}`}
                    onClick={() => handleFinaleInterpretationToggle('human')}
                  >
                    На человеческом
                  </button>
                  <button
                    type="button"
                    className={`${styles.insightStyleButton} ${finaleInterpretationMode === 'astrological' ? styles.active : ''}`}
                    onClick={() => handleFinaleInterpretationToggle('astrological')}
                  >
                    На астрологическом
                  </button>
                </div>
              </div>
              <div className={styles.historyFinalSummaryText}>
                {finaleInterpretationMode === 'human' ? finaleInterpretations.human : finaleInterpretations.astrological}
              </div>
            </div>
          )}

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
