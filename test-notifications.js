#!/usr/bin/env node

// Тестовый скрипт для генерации уведомлений с примерами

const testCases = [
  {
    type: 'morning_brief',
    narrative: `🔥 Настя, сегодня Марс устроил разборки с Сатурном — будет жарко. Детвора орёт, экзамен маячит на горизонте, а Серёжа решил, что самое время обсудить планы на выходные. Держи нервы в кулаке и не забывай про кофе.

✨ Венера шепчет, что вечером будет шанс выдохнуть. Если успеешь дожить до вечера, конечно. Луна в твоём углу — интуиция на максимум, используй её, чтобы не нарваться на лишние проблемы. Финал дня обещает быть обнадёживающим, если ты не убьёшь никого до этого момента.`,
    context: { todayHuman: '20 октября' }
  },
  {
    type: 'fertile_window',
    context: {
      todayHuman: '15 октября',
      periodHuman: '28 октября',
      daysUntilOvulation: 2,
      daysWord: 'дня'
    }
  },
  {
    type: 'period_forecast',
    context: {
      todayHuman: '25 октября',
      periodHuman: '28 октября',
      daysUntilPeriod: 3,
      daysWord: 'дня'
    }
  },
  {
    type: 'period_delay_warning',
    context: {
      todayHuman: '1 ноября',
      periodHuman: '28 октября',
      daysPastPrediction: 4,
      daysPastPredictionWord: 'дня'
    }
  },
  {
    type: 'birthday',
    context: {
      todayHuman: '12 апреля',
      birthdayAge: 33
    }
  }
];

console.log('='.repeat(70));
console.log('ТЕСТИРОВАНИЕ ГЕНЕРАЦИИ УВЕДОМЛЕНИЙ');
console.log('='.repeat(70));
console.log();

for (const testCase of testCases) {
  console.log(`\n📱 Тип: ${testCase.type}`);
  console.log('-'.repeat(70));

  if (testCase.type === 'morning_brief') {
    console.log('\n📖 Гороскоп:');
    console.log(testCase.narrative.split('\n').map(l => '  ' + l).join('\n'));
    console.log();
  }

  console.log('📋 Контекст:');
  console.log('  ', JSON.stringify(testCase.context, null, 2).split('\n').join('\n   '));
  console.log();
  console.log('⏳ Ожидаем AI генерацию...');
  console.log();
}

console.log('='.repeat(70));
console.log('Примечание: Для реальной генерации нужны API ключи');
console.log('Сейчас показаны только тестовые кейсы');
console.log('='.repeat(70));
