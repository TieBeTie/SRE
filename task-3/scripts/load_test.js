import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Метрика для отслеживания ошибок
const errorRate = new Rate('errors');

// Конфигурация теста
export const options = {
  // Сценарий нагрузки: постепенное увеличение
  stages: [
    { duration: '2m', target: 100 },  // Разогрев: 100 VUs
    { duration: '2m', target: 200 },  // Увеличение до 200 VUs
    { duration: '2m', target: 200 },  // Удержание: 200 VUs
    { duration: '2m', target: 300 },  // Увеличение до 300 VUs
    { duration: '2m', target: 300 },  // Удержание: 300 VUs
    { duration: '2m', target: 400 },  // Увеличение до 400 VUs
    { duration: '2m', target: 400 },  // Удержание: 400 VUs
    { duration: '2m', target: 500 },  // Увеличение до 400 VUs
    { duration: '2m', target: 500 },  // Удержание: 400 VUs
    { duration: '2m', target: 600 },  // Увеличение до 400 VUs
    { duration: '2m', target: 600 },  // Удержание: 400 VUs
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
      'response has id': (r) => {
        if (r.status !== 200) {
          return false;
        }
        const body = r.json();
        return body && body.id !== undefined;
      },
    });

    errorRate.add(!success);
  }
  // 20% запросов - список городов
  else {
    const res = http.get(`${BASE_URL}/Cities`, { headers: HEADERS });

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response is array': (r) => {
        if (r.status !== 200) {
          return false;
        }
        const body = r.json();
        return Array.isArray(body);
      },
    });

    errorRate.add(!success);
  }

  // Think time: пауза между запросами
  sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 секунд
}


