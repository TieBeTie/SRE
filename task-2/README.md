Домашнее задание №2: Мониторинг (Prometheus, Grafana, алерты, Golden Signals)

## Что сделано
- Prometheus на balancer (Ansible playbook `task-2/ansible/deploy_prometheus.yml`).
- Экспортеры: node_exporter (все ВМ), postgres_exporter (bd1/bd2), Patroni `/metrics` на 8008, etcd `/metrics` на 2379, blackbox_exporter на balancer (HTTP/TCP проверка API).
- Grafana: подключены datasources, есть дашборды, включая 4 Golden Signals по ingress.
- Алерты в Grafana: latency, errors 5xx, traffic low, saturation (active connections).

## Развертывание Prometheus и экспортеров
```bash
cd task-2/ansible
ansible-playbook -i inventory deploy_prometheus.yml
```
Что поднимется:
- Prometheus на balancer (9090, внутренний доступ; наружу через nginx 80, если настроен).
- node_exporter (9100) на etcd1/2/3, bd1/2, balancer.
- postgres_exporter (9187) на bd1/2.
- Patroni встроенный `/metrics` на 8008 (bd1/2).
- etcd метрики `/metrics` на 2379 (etcd1/2/3).
- blackbox_exporter на balancer (9115), таргет: `http://student5-api.autobase.tech/swagger/index.html` и TCP 80.

## Grafana
- URL: `http://grafana.training.course.sre.mts/` (добавить в hosts: `77.105.182.79 grafana.training.course.sre.mts`).
- Datasources:
  - Prometheus (balancer) для своих экспортеров.
  - Кластерный PrometheusK8s/VictoriaMetrics: `http://victoriametrics-victoria-metrics-single-server.monitoring.svc:8428` — использовать для ingress метрик и Golden Signals.
- Дашборды:
  - System/DB/etcd/blackbox (Prometheus balancer).
  - Ingress 4 Golden Signals (PrometheusK8s).

## Golden Signals (ingress)
- Используются метрики `nginx_ingress_controller_*`.
- Запросы в панелях:
  - Latency avg: `rate(..._latency_seconds_sum[5m]) / rate(..._latency_seconds_count[5m])`
  - Traffic RPS: `sum by (ingress) (rate(nginx_ingress_controller_requests[5m]))`
  - Errors 5xx: `sum by (ingress) (rate(nginx_ingress_controller_requests{status=~"5.."}[5m]))`
  - Saturation: `sum(nginx_ingress_controller_nginx_process_connections{state="active"})`

## Алерты (Grafana-managed)
- Latency avg > 0.5s (5m)
- Errors 5xx RPS > 1 (5m)
- Traffic RPS < 0.1 (5m) — опционально, настроено
- Active connections > 200 (5m)

## Структура
```
task-2/
├── ansible/
│   ├── inventory
│   ├── ansible.cfg
│   ├── group_vars/all.yml
│   ├── deploy_prometheus.yml   # главный плейбук (импортирует подплейбуки из tasks/)
│   └── tasks/                  # разбивка по подплейбукам:
│       ├── prometheus.yml
│       ├── node_exporter.yml
│       ├── postgres_exporter.yml
│       ├── blackbox_exporter.yml
│       ├── nginx_proxy.yml
│       └── hosts_entry.yml
├── helm/
│   └── api-chart/              # из ДЗ1 (для API), оставлено без изменений
└── README.md                   # этот файл
```

## Примечания
- Patroni exporter (Showmax) не ставился: пакет не собирается на Python 3.12. Используются встроенные метрики Patroni `/metrics` на 8008.
- Если нужен внешний доступ к Prometheus с balancer — прокси через nginx на 80, либо SSH туннель.
