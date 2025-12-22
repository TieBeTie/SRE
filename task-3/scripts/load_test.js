import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Метрика для отслеживания ошибок
const errorRate = new Rate('errors');

// Конфигурация теста
export const options = {
  // Сценарий нагрузки: постепенное увеличение
  stages: [
    { duration: '1m', target: 10 },   // Разогрев: 10 VUs за 1 минуту
    { duration: '2m', target: 10 },   // Удержание: 10 VUs 2 минуты
    { duration: '1m', target: 50 },   // Увеличение до 50 VUs
    { duration: '2m', target: 50 },   // Удержание: 50 VUs 2 минуты
    { duration: '1m', target: 100 },  // Увеличение до 100 VUs
    { duration: '3m', target: 100 },  // Удержание: 100 VUs 3 минуты
    { duration: '1m', target: 0 },    // Плавное завершение
  ],
  
  // Пороги успешности
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% запросов < 500ms
    http_req_failed: ['rate<0.01'],    // < 1% ошибок
    errors: ['rate<0.01'],             // < 1% ошибок
  },
};

// Базовый URL и параметры
const BASE_URL = 'http://77.105.182.79';
const HEADERS = {
  'Host': 'student5-api.autobase.tech',
};

// Главная функция теста
export default function () {
  // 80% запросов - чтение конкретного города
  if (Math.random() < 0.8) {
    // Случайный ID от 1 до 10
    const cityId = Math.floor(Math.random() * 10) + 1;
    const res = http.get(`${BASE_URL}/Cities/${cityId}`, { headers: HEADERS });
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response has id': (r) => r.json('id') !== undefined,
    });
    
    errorRate.add(!success);
  } 
  // 20% запросов - список городов
  else {
    const res = http.get(`${BASE_URL}/Cities`, { headers: HEADERS });
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response is array': (r) => Array.isArray(r.json()),
    });
    
    errorRate.add(!success);
  }
  
  // Think time: пауза между запросами
  sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 секунд
}

