# Профиль нагрузки

## Эндпоинты
- `GET /Cities/{id}` — 80% запросов
- `GET /Cities` — 20% запросов

## Параметры
- Think time: 0.2-0.7 секунд
- Ramp-up: постепенное увеличение нагрузки до целевого уровня

## Скрипты
- [`scripts/smoke_test.js`](../scripts/smoke_test.js) — 5 VUs, 1 мин (проверка доступности)
- [`scripts/load_test.js`](../scripts/load_test.js) — ступенчатая нагрузка до 600 VUs (поиск максимальной производительности)
- [`scripts/gradual_load_test.js`](../scripts/gradual_load_test.js) — плавный рост нагрузки до 480 VUs (~80% от максимума `load_test.js`, уточнение точки насыщения)
