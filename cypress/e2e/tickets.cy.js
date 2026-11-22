import { TicketsPage } from '../pages/TicketsPage';
import { TicketForm } from '../pages/TicketForm';

const page = new TicketsPage();
const form = new TicketForm();

describe('HelpDesk — E2E тесты', () => {
  beforeEach(() => {
    cy.request('POST', '/api/__reset');
    page.open();
  });

  it('Сценарий 1: Создание заявки через форму', () => {
    form.fill({ title: 'Новая E2E заявка', description: 'Описание для E2E теста', priority: 'high' }); // <-- Указали high
    form.submit();
    
    form.message().should('contain', 'создана');
    page.items().should('have.length', 5); 
    page.items().first().should('contain', 'Новая E2E заявка'); // Теперь она точно первая
  });

  it('Сценарий 2: Поиск + Фильтр по приоритету', () => {
    page.setPriority('high');
    page.items().should('have.length', 2); 
    
    page.searchFor('Wi-Fi');
    page.items().should('have.length', 1);
    page.items().first().should('contain', 'Wi-Fi');
  });

  it('Сценарий 3: Перевод заявки в работу и завершение', () => {
    cy.contains('В работу').click();
    cy.contains('Завершить').should('be.visible').click();
    page.items().first().should('contain', 'Завершена');
  });

  it('D-06: XSS защита — HTML-теги не должны выполняться', () => {
    // Создаем high приоритет, чтобы она была первой
    form.fill({ title: '<b>XSS Тест</b>', description: 'Описание с <script>alert(1)</script>', priority: 'high' });
    form.submit();
    
    // Проверяем первую заявку
    page.items().first().find('b').should('not.exist');
    page.items().first().should('contain', '<b>XSS Тест</b>');
  });
});