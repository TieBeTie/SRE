# Профиль нагрузки

## Эндпоинты
- `GET /Cities/{id}` — 80% запросов
- `GET /Cities` — 20% запросов

## Параметры
- Think time: 0.2-0.7 секунд
- Ramp-up: постепенное увеличение нагрузки

## Скрипты
- `scripts/smoke_test.js` — 5 VUs, 1 мин
- `scripts/load_test.js` — до 100 VUs, 11 мин
- `scripts/gradual_load_test.js` — до 30 VUs, 16 мин
