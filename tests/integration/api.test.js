'use strict';
const { createApp } = require('../../src/app');

let server;
let base;

beforeEach(async () => {
  server = createApp({ seed: [] });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/health отвечает HTTP 200', async () => {
  const response = await fetch(`${base}/api/health`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('POST /api/tickets создает корректную заявку', async () => {
  const response = await fetch(`${base}/api/tickets`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Сбой принтера', description: 'Принтер в аудитории не отвечает',
      category: 'hardware', priority: 'medium'
    })
  });
  const body = await response.json();
  expect(response.status).toBe(201);
  expect(body.ticket.id).toBe(1);
  expect(body.ticket.status).toBe('new');
});

// Добавьте проверки GET с фильтрами, некорректных запросов,
// запретных переходов статуса и последовательных запросов к API.


// ==========================================
// МОИ ИНТЕГРАЦИОННЫЕ ТЕСТЫ (Поиск дефектов D-03, D-04, D-05)
// ==========================================

test('Успешное создание и чтение заявки', async () => {
  const createRes = await fetch(`${base}/api/tickets`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Уникальная заявка', description: 'Описание для теста', category: 'network', priority: 'high' })
  });
  const created = await createRes.json();
  
  const getRes = await fetch(`${base}/api/tickets`);
  const list = await getRes.json();
  expect(list.total).toBe(1);
  expect(list.items[0].id).toBe(created.ticket.id);
});

test('Ошибка валидации 400 не создает заявку', async () => {
  const res = await fetch(`${base}/api/tickets`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Кор', description: 'Валидное описание', category: 'network', priority: 'high' })
  });
  expect(res.status).toBe(400);
  
  const listRes = await fetch(`${base}/api/tickets`);
  const list = await listRes.json();
  expect(list.total).toBe(0); 
});

test('D-03: Поиск должен быть регистронезависимым', async () => {
  await fetch(`${base}/api/tickets`, { 
    method: 'POST', headers: { 'content-type': 'application/json' }, 
    body: JSON.stringify({ title: 'Проблема с VPN', description: 'Описание сети', category: 'network', priority: 'high' }) 
  });
  
  // Ищем строчными буквами "vpn", хотя в заголовке "VPN"
  const res = await fetch(`${base}/api/tickets?search=vpn`);
  const body = await res.json();
  expect(body.total).toBe(1); 
});

test('D-04: Сортировка по приоритету (сначала High)', async () => {
  await fetch(`${base}/api/tickets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Low заявка', description: 'Текст описания 1', category: 'network', priority: 'low' }) });
  await fetch(`${base}/api/tickets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'High заявка', description: 'Текст описания 2', category: 'network', priority: 'high' }) });

  const res = await fetch(`${base}/api/tickets`);
  const body = await res.json();
  
  expect(body.items[0].title).toBe('High заявка'); 
  expect(body.items[1].title).toBe('Low заявка');
});

test('D-05: Запрет перехода new -> resolved (HTTP 409)', async () => {
  const createRes = await fetch(`${base}/api/tickets`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Тест статуса', description: 'Описание статуса', category: 'hardware', priority: 'low' })
  });
  const created = await createRes.json();

  const patchRes = await fetch(`${base}/api/tickets/${created.ticket.id}/status`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'resolved' })
  });
  expect(patchRes.status).toBe(409); 
});

test('TDD: Фильтр по приоритету priority=high', async () => {
  // Создаем две заявки с разным приоритетом
  await fetch(`${base}/api/tickets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'High заявка', description: 'Описание High', category: 'network', priority: 'high' }) });
  await fetch(`${base}/api/tickets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Low заявка', description: 'Описание Low', category: 'network', priority: 'low' }) });

  // Запрашиваем только high
  const res = await fetch(`${base}/api/tickets?priority=high`);
  const body = await res.json();
  
  // Ожидаем, что вернется только 1 заявка (High)
  expect(body.total).toBe(1);
  expect(body.items[0].priority).toBe('high');
});