# Краткая сводка

## 1. Профиль нагрузки
- Эндпоинты: `GET /Cities/{id}` (80%), `GET /Cities` (20%)
- Скрипты: [`scripts/smoke_test.js`](../scripts/smoke_test.js), [`scripts/load_test.js`](../scripts/load_test.js), [`scripts/gradual_load_test.js`](../scripts/gradual_load_test.js)
- Детали: [`LOAD_PROFILE.md`](LOAD_PROFILE.md)

## 2. Реализация
- Инструмент: k6
- 3 типа тестов: Smoke (5 VUs), Load (до 600 VUs), Gradual (до 480 VUs)
    
## 3. SLO/SLA
- Availability: 99.9% → 100% ✅
- Latency p95: < 500ms → 77.9ms (300 VUs, точка насыщения) ✅ / ~2s (600 VUs, максимальная производительность) ❌
- Error Rate: < 0.1% → 0% ✅
- Throughput: ≥ 100 RPS → 620 RPS (300 VUs) ✅ / 878 RPS (600 VUs) ✅

## 4. Максимальная производительность
- **Максимальная производительность:** ~878 RPS при 600 VUs (100% HTTP 200, 0% ошибок, но p95 latency ~2s превышает SLO) ([`screenshots/max_rps.png`](screenshots/max_rps.png))
- **Точка насыщения:** ~620 RPS при 300 VUs (все SLO выполнены, p95 latency 77.9ms) ([`screenshots/sla_rps.png`](screenshots/sla_rps.png), [`screenshots/sla_latency.png`](screenshots/sla_latency.png))

## 5. Узкое место
- **Соединения к PostgreSQL:** 300 соединений при тесте 600 VUs (точка насыщения), 223 соединения при тесте 300 VUs (максимальная производительность) ([`screenshots/postgres_active_connections.png`](screenshots/postgres_active_connections.png))
- CPU: 6.5% (не является узким местом) ([`screenshots/cpu_usage.png`](screenshots/cpu_usage.png))
- Конфигурация: 3 реплики × 0.3 CPU
