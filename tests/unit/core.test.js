'use strict';
const { normalizeTitle, validateTicketInput, canChangeStatus } = require('../../src/core');

describe('Базовые unit-тесты (дополните своими)', () => {
  test('удаляет пробелы в начале и конце темы', () => {
    expect(normalizeTitle('  Ошибка принтера  ')).toBe('Ошибка принтера');
  });

  test('отклоняет неизвестную категорию', () => {
    const errors = validateTicketInput({
      title: 'Ошибка печати', description: 'Принтер не печатает документ',
      category: 'unknown', priority: 'low'
    });
    expect(errors).toHaveProperty('category');
  });

  test('запрещает возвращение из закрытого статуса', () => {
    expect(canChangeStatus('resolved', 'new')).toBe(false);
  });

  // Добавьте самостоятельные проверки границ, переходов и сортировки.
    // ==========================================
  // МОИ ТЕСТЫ (Поиск дефектов D-01 и D-02)
  // ==========================================

  test('D-01: замена множественных пробелов внутри темы', () => {
    // Требование: заменить любую последовательность пробельных символов одним пробелом
    // Фактически: функция делает только trim(), оставляя тройные пробелы внутри
    expect(normalizeTitle('  Сбой   VPN   в   корпусе  ')).toBe('Сбой VPN в корпусе');
  });

  test('D-02: валидация длины темы после нормализации', () => {
    // Требование: длина от 5 до 80 символов ПОСЛЕ нормализации
    // Входная строка: '   Тест   ' (10 символов). После нормализации: 'Тест' (4 символа).
    const errors = validateTicketInput({
      title: '   Тест   ', 
      description: 'Длинное описание для теста',
      category: 'network', 
      priority: 'high'
    });
    // Ожидаем, что валидация выдаст ошибку, так как нормализованная тема слишком короткая
    expect(errors).toHaveProperty('title'); 
  });

  test.each([
    ['1234', true],  // 4 символа - мало (ожидаем ошибку)
    ['12345', false], // 5 символов - норм (ошибки нет)
    ['a'.repeat(80), false], // 80 символов - норм (ошибки нет)
    ['a'.repeat(81), true],  // 81 символ - много (ожидаем ошибку)
  ])('Проверка границ длины темы: "%s"', (title, shouldError) => {
    const errors = validateTicketInput({ 
      title, 
      description: 'Валидное описание', 
      category: 'hardware', 
      priority: 'low' 
    });
    expect(!!errors.title).toBe(shouldError);
  });
});
