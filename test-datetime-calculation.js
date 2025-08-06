// Teste para reproduzir o problema do horário 13h-17h

console.log('🔍 Testando cálculo de horário do modal de entrega...');

// Simular os dados que foram usados no modal
const formData = {
  scheduled_date: '2025-08-04',
  scheduled_time: '13:00'
};

// Construir fullDateTime exatamente como no código (ANTES)
const fullDateTimeOld = `${formData.scheduled_date}T${formData.scheduled_time}:00`;

// Construir fullDateTime com a CORREÇÃO
const fullDateTime = `${formData.scheduled_date}T${formData.scheduled_time}:00.000Z`;

console.log('📅 Dados de entrada:', {
  scheduled_date: formData.scheduled_date,
  scheduled_time: formData.scheduled_time,
  fullDateTimeOld,
  fullDateTime
});

// Testar ANTES da correção
const startTimeOld = new Date(fullDateTimeOld);
const endTimeOld = new Date(startTimeOld.getTime() + 60 * 60 * 1000);
console.log('❌ ANTES (problemático):', {
  start: startTimeOld.toISOString(),
  end: endTimeOld.toISOString(),
  duration: (endTimeOld.getTime() - startTimeOld.getTime()) / (1000 * 60 * 60) + ' horas'
});

// Testar parsing da data CORRIGIDA
const startTime = new Date(fullDateTime);
console.log('✅ DEPOIS (corrigido):', {
  original: fullDateTime,
  parsed: startTime.toISOString(),
  isValid: !isNaN(startTime.getTime())
});

// Calcular end_time (+1 hora)
const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
console.log('✅ End Time Corrigido:', {
  calculated: endTime.toISOString(),
  duration: (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) + ' horas'
});

// Verificar se há algum problema com timezone
console.log('🌍 Timezone Info:', {
  startTimeLocal: startTime.toString(),
  endTimeLocal: endTime.toString(),
  timezoneOffset: startTime.getTimezoneOffset()
});

// Testar diferentes formatos de entrada
console.log('\n🧪 Testando diferentes cenários...');

const testCases = [
  { date: '2025-08-04', time: '13:00' },
  { date: '2025-08-04', time: '14:00' },
  { date: '2025-08-04', time: '15:00' }
];

testCases.forEach((test, index) => {
  const fullDT = `${test.date}T${test.time}:00`;
  const start = new Date(fullDT);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  
  console.log(`Teste ${index + 1}:`, {
    input: fullDT,
    start: start.toISOString(),
    end: end.toISOString(),
    duration: (end.getTime() - start.getTime()) / (1000 * 60 * 60) + 'h'
  });
});
