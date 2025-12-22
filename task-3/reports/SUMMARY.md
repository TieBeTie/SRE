# Краткая сводка

## 1. Профиль нагрузки
- Эндпоинты: `GET /Cities/{id}` (80%), `GET /Cities` (20%)
- Скрипты: `scripts/smoke_test.js`, `scripts/load_test.js`, `scripts/gradual_load_test.js`

## 2. Реализация
- Инструмент: k6
- 3 типа тестов: Smoke (5 VUs), Load (до 100 VUs), Gradual (до 30 VUs)

## 3. SLO/SLA
- Availability: 99.9% → 100% ✅
- Latency p95: < 500ms → 71ms ✅
- Error Rate: < 0.1% → 0% ✅
- Throughput: ≥ 100 RPS → 194 RPS ✅

## 4. Максимальная производительность
- **194 RPS** (200 VUs, 3 минуты, 0% ошибок)

## 5. Узкое место
- **Соединения к PostgreSQL** (194 соединения при пике)
- CPU: 6.5% (не является узким местом)
- Конфигурация: 3 реплики × 0.3 CPU
