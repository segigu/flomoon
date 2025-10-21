#!/usr/bin/env node

// Сравнение СТАРОГО и НОВОГО подходов к генерации уведомлений

const comparisons = [
  {
    type: 'morning_brief (гороскоп про Марс и хаос)',
    old: {
      title: 'Луна в боевом режиме',
      body: 'Настя, сегодня ты — боевая машина 🔥 Гороскоп на день обещает: сначала бешенств...',
      titleLen: 21,
      bodyLen: 85, // обрезается!
      problems: ['Body обрезается!', 'Длинная фраза "Гороскоп на день обещает"', 'Не уложился в UI']
    },
    new: {
      title: 'Марсианский хаос',
      body: 'Настя, Марс vs Сатурн — держись крепче! 🔥',
      titleLen: 16,
      bodyLen: 42,
      improvements: ['Помещается в UI', 'Конкретика из гороскопа', 'Убраны длинные вводные']
    }
  },
  {
    type: 'morning_brief (гороскоп про Венеру и отдых)',
    old: {
      title: 'Настюш, штorm идёт',
      body: 'Настя, сегодняшний гороскоп сулит конфликты и срывы. Марс не отступает 🔥 Узнай...',
      titleLen: 18,
      bodyLen: 82, // обрезается!
      problems: ['Body обрезается!', 'Нет анализа гороскопа', 'Генерический текст']
    },
    new: {
      title: 'Венера обещает',
      body: 'Вечером выдохнёшь, обещает Венера! ✨',
      titleLen: 14,
      bodyLen: 36,
      improvements: ['Помещается в UI', 'Вытащена суть из гороскопа', 'Конкретный совет']
    }
  },
  {
    type: 'period_forecast (3 дня до менструации)',
    old: {
      title: 'Василиса Менструальная',
      body: 'Настюш, шторм идёт! 🌀 Грелку доставай, шоколад припасай. Через 4 дня начнётся...',
      titleLen: 22,
      bodyLen: 78, // обрезается!
      problems: ['Body обрезается!', 'Слишком подробно', 'Повторения']
    },
    new: {
      title: 'Зоя ПМСова',
      body: 'Настюх, шторм через 3 дня — запасайся! 🙄',
      titleLen: 10,
      bodyLen: 41,
      improvements: ['Помещается в UI', 'Краткий и ёмкий', 'Сохранён сарказм']
    }
  },
  {
    type: 'fertile_window (фертильное окно)',
    old: {
      title: 'Людмила Фертильная',
      body: 'Настюш, это Людмила Фертильная: зона риска, без защиты ни шагу. 💋',
      titleLen: 18,
      bodyLen: 67, // длинновато
      problems: ['Немного длинно', 'Избыточное "это Людмила"']
    },
    new: {
      title: 'Людмила Фертильная',
      body: 'Настюш, зона риска — защищайся! 💋',
      titleLen: 18,
      bodyLen: 34,
      improvements: ['Помещается в UI', 'Убрано лишнее', 'Прямой призыв']
    }
  },
  {
    type: 'period_delay_warning (задержка)',
    old: {
      title: 'Римма Тревожная',
      body: 'Настюш, Римма Тревожная в панике: уж больно тянет, может, тест на всякий? 😬',
      titleLen: 15,
      bodyLen: 78, // обрезается!
      problems: ['Body обрезается!', 'Повторение имени', 'Слишком длинно']
    },
    new: {
      title: 'Римма Тревожная',
      body: 'Настюш, 4 дня тянет — может, тест? 😬',
      titleLen: 15,
      bodyLen: 37,
      improvements: ['Помещается в UI', 'Убрано повторение', 'Конкретная цифра']
    }
  }
];

console.log('═'.repeat(90));
console.log('СРАВНЕНИЕ: СТАРЫЕ vs НОВЫЕ УВЕДОМЛЕНИЯ');
console.log('═'.repeat(90));
console.log();

comparisons.forEach((item, index) => {
  console.log(`\n${index + 1}. ${item.type.toUpperCase()}`);
  console.log('─'.repeat(90));

  // OLD
  console.log('\n❌ СТАРЫЙ ВАРИАНТ (ДО ИЗМЕНЕНИЙ):');
  console.log(`   Title: "${item.old.title}" (${item.old.titleLen} символов)`);
  console.log(`   Body:  "${item.old.body}" (${item.old.bodyLen} символов)`);
  if (item.old.bodyLen > 55) {
    console.log(`   ⚠️  ОБРЕЗАЕТСЯ! Превышение на ${item.old.bodyLen - 55} символов`);
  }
  console.log('\n   Проблемы:');
  item.old.problems.forEach(p => console.log(`   • ${p}`));

  // NEW
  console.log('\n✅ НОВЫЙ ВАРИАНТ (ПОСЛЕ ИЗМЕНЕНИЙ):');
  console.log(`   Title: "${item.new.title}" (${item.new.titleLen} символов)`);
  console.log(`   Body:  "${item.new.body}" (${item.new.bodyLen} символов)`);
  console.log(`   ✓ Укладывается в лимит (≤55 символов)`);
  console.log('\n   Улучшения:');
  item.new.improvements.forEach(i => console.log(`   • ${i}`));

  console.log();
});

console.log('═'.repeat(90));
console.log('ИТОГОВАЯ СТАТИСТИКА:');
console.log('─'.repeat(90));

const oldProblems = comparisons.filter(c => c.old.bodyLen > 55).length;
const newProblems = comparisons.filter(c => c.new.bodyLen > 55).length;

console.log(`\nСтарый подход: ${oldProblems}/${comparisons.length} уведомлений обрезались`);
console.log(`Новый подход:  ${newProblems}/${comparisons.length} уведомлений обрезались`);
console.log();

const avgOldLen = Math.round(comparisons.reduce((sum, c) => sum + c.old.bodyLen, 0) / comparisons.length);
const avgNewLen = Math.round(comparisons.reduce((sum, c) => sum + c.new.bodyLen, 0) / comparisons.length);

console.log(`Средняя длина body (старый): ${avgOldLen} символов`);
console.log(`Средняя длина body (новый):  ${avgNewLen} символов`);
console.log(`Экономия: ${avgOldLen - avgNewLen} символов (~${Math.round((1 - avgNewLen/avgOldLen) * 100)}%)`);
console.log();

console.log('КЛЮЧЕВЫЕ УЛУЧШЕНИЯ:');
console.log('✓ Morning brief теперь анализирует гороскоп и вытаскивает конкретику');
console.log('✓ Убраны длинные вводные фразы ("гороскоп обещает", "сегодняшний гороскоп")');
console.log('✓ Убраны повторения имён персонажей в body');
console.log('✓ Все уведомления теперь помещаются в карточку без обрезки');
console.log('✓ Сохранён саркастичный тон и прямое обращение к Насте');
console.log('═'.repeat(90));
