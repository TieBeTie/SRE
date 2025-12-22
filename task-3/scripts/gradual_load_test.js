import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Более плавное увеличение нагрузки для поиска точки насыщения
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Разогрев: 10 VUs
    { duration: '3m', target: 10 },   // Удержание 10 VUs
    { duration: '2m', target: 20 },   // Увеличение до 20 VUs
    { duration: '3m', target: 20 },   // Удержание 20 VUs
    { duration: '2m', target: 30 },   // Увеличение до 30 VUs
    { duration: '3m', target: 30 },   // Удержание 30 VUs
    { duration: '1m', target: 0 },    // Завершение
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],    // < 5% ошибок
    errors: ['rate<0.05'],
  },
};

const BASE_URL = 'http://77.105.182.79';
const HEADERS = {
  'Host': 'student5-api.autobase.tech',
};

export default function () {
  // 80% GET /Cities/{id}, 20% GET /Cities
  if (Math.random() < 0.8) {
    const cityId = Math.floor(Math.random() * 10) + 1;
    const res = http.get(`${BASE_URL}/Cities/${cityId}`, { headers: HEADERS });
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
    });
    
    errorRate.add(!success);
  } else {
    const res = http.get(`${BASE_URL}/Cities`, { headers: HEADERS });
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
    });
    
    errorRate.add(!success);
  }
  
  sleep(Math.random() * 0.5 + 0.2); // 0.2-0.7 секунд
}

