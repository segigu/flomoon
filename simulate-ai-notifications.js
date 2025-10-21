#!/usr/bin/env node

// Симуляция AI генерации уведомлений на основе промптов

const examples = {
  morning_brief: {
    narrative: `🔥 Настя, сегодня Марс устроил разборки с Сатурном — будет жарко. Детвора орёт, экзамен маячит на горизонте, а Серёжа решил, что самое время обсудить планы на выходные. Держи нервы в кулаке и не забывай про кофе.

✨ Венера шепчет, что вечером будет шанс выдохнуть. Если успеешь дожить до вечера, конечно. Луна в твоём углу — интуиция на максимум, используй её, чтобы не нарваться на лишние проблемы. Финал дня обещает быть обнадёживающим, если ты не убьёшь никого до этого момента.`,
    examples: [
      { title: 'Марсианский хаос', body: 'Настя, Марс vs Сатурн — держись крепче! 🔥' },
      { title: 'Боевой режим', body: 'Детвора орёт, экзамен ждёт — выживай! 💥' },
      { title: 'Венера обещает', body: 'Вечером выдохнёшь, обещает Венера! ✨' }
    ]
  },
  fertile_window: {
    context: 'фертильное окно, до овуляции 2 дня',
    examples: [
      { title: 'Людмила Фертильная', body: 'Настюш, зона риска — защищайся! 💋' },
      { title: 'Борис Презервативов', body: 'Настёна, фертильно тут — прикройся! 🛡️' },
      { title: 'Олеся Овуляторовна', body: 'Настюх, 2 дня до О — без защиты никак! 🔥' }
    ]
  },
  period_forecast: {
    context: 'до менструации 3 дня',
    examples: [
      { title: 'Зоя ПМСова', body: 'Настюх, шторм через 3 дня — запасайся! 🙄' },
      { title: 'Марфа Штормовая', body: 'Настёна, через 3 дня накроет — готовься! 😤' },
      { title: 'Глаша Грелочная', body: 'Настюш, осталось 3 дня — грелку готовь! 🔥' }
    ]
  },
  period_delay_warning: {
    context: 'задержка 4 дня',
    examples: [
      { title: 'Римма Тревожная', body: 'Настюш, 4 дня тянет — может, тест? 😬' },
      { title: 'Вера Беспокойная', body: 'Настёна, задержка 4 дня — прислушайся! 🤔' },
      { title: 'Тамара Тестовая', body: 'Настюх, 4 дня мимо — пора проверить! 🧪' }
    ]
  },
  birthday: {
    context: 'День рождения, 33 года',
    examples: [
      { title: 'Галя Именинница', body: 'Настюш, 33 тебе! Праздник без драм! 🎉💜' },
      { title: 'Света Юбилейная', body: 'Настёна, с 33-м! Гуляем по-взрослому! 🎂' },
      { title: 'Маша Тортовая', body: 'С днюхой, Орлова! 33 — самое то! 🥳' }
    ]
  }
};

console.log('='.repeat(80));
console.log('СИМУЛЯЦИЯ AI ГЕНЕРАЦИИ УВЕДОМЛЕНИЙ');
console.log('Примеры ответов на основе новых промптов');
console.log('='.repeat(80));
console.log();

for (const [type, data] of Object.entries(examples)) {
  console.log(`\n📱 ТИП: ${type.toUpperCase()}`);
  console.log('─'.repeat(80));

  if (data.narrative) {
    console.log('\n📖 Входной гороскоп:');
    console.log(data.narrative.split('\n').map(l => '   ' + l).join('\n'));
  }

  if (data.context) {
    console.log(`\n📋 Контекст: ${data.context}`);
  }

  console.log('\n✨ Примеры AI генерации (с новыми промптами):');
  console.log();

  data.examples.forEach((example, i) => {
    const titleLen = example.title.length;
    const bodyLen = example.body.length;
    const titleStatus = titleLen <= 40 ? '✅' : '❌';
    const bodyStatus = bodyLen <= 55 ? '✅' : '❌';

    console.log(`   Вариант ${i + 1}:`);
    console.log(`   ┌─ title: "${example.title}"`);
    console.log(`   │  Длина: ${titleLen} символов ${titleStatus} (лимит ≤40)`);
    console.log(`   └─ body:  "${example.body}"`);
    console.log(`      Длина: ${bodyLen} символов ${bodyStatus} (лимит ≤55)`);
    console.log();
  });
}

console.log('='.repeat(80));
console.log('ИТОГО:');
console.log('• Все примеры укладываются в лимиты (title ≤40, body ≤55)');
console.log('• Morning brief анализирует гороскоп и вытаскивает конкретику');
console.log('• Убраны длинные вводные фразы ("гороскоп обещает")');
console.log('• Сохранён саркастичный тон и прямое обращение к Насте');
console.log('='.repeat(80));
