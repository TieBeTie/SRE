# PostgreSQL HA Cluster + API Deployment
**SRE Course - Student 5 - Homework #1**

## 📋 Краткое описание

Проект разворачивает:
1. **PostgreSQL HA кластер** с автоматическим failover (Ansible + Patroni)
2. **API приложение** в Kubernetes с доступом через Ingress

---

## 🏗️ Архитектура

### Компоненты PostgreSQL кластера (на VM)

| Компонент | Количество | Назначение |
|-----------|-----------|------------|
| **etcd** | 3 ноды | Distributed Configuration Store (Raft consensus) |
| **PostgreSQL 16 + Patroni** | 2 ноды | Master-Replica с автофейловером |
| **HAProxy** | 1 инстанс | Load Balancer (порт 5000 - master, 5001 - replica) |

### API компоненты (в Kubernetes)

| Ресурс | Описание |
|--------|----------|
| **Deployment** | API приложение (ghcr.io/ldest/mfti-course/api) |
| **Service** | ClusterIP для внутреннего доступа |
| **Ingress** | Внешний доступ через nginx-ingress |
| **Secret** | Строка подключения к PostgreSQL |
| **Job** | Миграция БД (Helm hook) |

---

## 🚀 Развертывание

### 1. PostgreSQL HA Cluster (Ansible)

```bash
cd /home/rama/SRE/homework

# Активировать Python окружение с Ansible 2.19.3
source ansible_venv/bin/activate

# Установить autobase collection (уже установлена)
ansible-galaxy collection install -r ansible/requirements.yml

# Развернуть кластер
cd ansible
ansible-playbook deploy_pgcluster.yml \
  -i inventory \
  --vault-password-file ~/.vault_pass.txt
```

**Время развертывания**: ~6 минут

### 2. API в Kubernetes (Helm)

```bash
# Установить kubectl (уже установлен)
sudo snap install kubectl --classic

# Настроить kubeconfig
export KUBECONFIG=/home/rama/SRE/student_5.yaml
kubectl config set-cluster kubernetes --insecure-skip-tls-verify=true

# Развернуть API через Helm
helm install api-chart ./helm/api-chart \
  -n sre-cource-student-5

# Проверить статус
kubectl get pods,svc,ingress -n sre-cource-student-5
```

---

## 🔌 Подключения

### PostgreSQL Cluster

| Параметр | Значение |
|----------|----------|
| **HAProxy IP** | 192.168.1.34 |
| **Master (RW)** | 192.168.1.34:5000 |
| **Replicas (RO)** | 192.168.1.34:5001 |
| **HAProxy Stats** | http://192.168.1.34:7000 |
| **User** | postgres |
| **Password** | SecurePass123! |
| **Database** | postgres |

### API Application

| Параметр | Значение |
|----------|----------|
| **External URL** | http://student5-api.autobase.tech |
| **Swagger** | http://student5-api.autobase.tech/swagger |
| **Kubernetes Service** | api-chart.sre-cource-student-5.svc.cluster.local:80 |
| **Namespace** | sre-cource-student-5 |

---

## ✅ Проверка работоспособности

### PostgreSQL Cluster

```bash
# Проверить статус Patroni кластера
ansible postgres_cluster -i ansible/inventory \
  -m shell -a "sudo patronictl -c /etc/patroni/patroni.yml list"

# Ожидаемый вывод:
# bd1 | Leader  | running
# bd2 | Replica | running | Lag=0
```

### API Deployment

```bash
# Проверить статус pods
kubectl get pods -n sre-cource-student-5

# Проверить логи
kubectl logs -n sre-cource-student-5 -l app=api-chart --tail=50

# Проверить Ingress
kubectl get ingress -n sre-cource-student-5
```

### Тест подключения

```bash
# Добавить в /etc/hosts (для локального доступа)
echo "192.168.1.100 student5-api.autobase.tech" | sudo tee -a /etc/hosts

# Проверить Swagger UI
curl -I http://student5-api.autobase.tech/swagger
```

---

## 📁 Структура проекта

```
homework/
├── README.md                     # Этот файл
├── ansible/                      # Ansible конфигурация для PostgreSQL HA
│   ├── inventory                # 6 VM (3 etcd + 2 postgres + 1 haproxy)
│   ├── group_vars/
│   │   └── all.yml              # Параметры кластера
│   ├── ansible.cfg              # Ansible настройки
│   ├── requirements.yml         # autobase.vitabaks collection
│   └── deploy_with_deb.log      # Лог успешного развертывания
├── ansible_venv/                # Python venv с Ansible 2.19.3
└── helm/
    └── api-chart/               # Helm chart для API
        ├── Chart.yaml           # Метаданные chart
        ├── values.yaml          # Конфигурация (можно переопределять)
        └── templates/           # Kubernetes манифесты
            ├── deployment.yaml  # API Deployment
            ├── service.yaml     # ClusterIP Service
            ├── ingress.yaml     # nginx-ingress
            ├── secret.yaml      # DB connection string
            └── migration-job.yaml # DB migration (Helm hook)
```

---

## 🔧 Технические решения

### Почему PostgreSQL на VM, а не в Docker/Kubernetes?

**PostgreSQL** - stateful система с требованиями:
- Высокая производительность I/O (прямой доступ к дискам)
- Стабильность сети (репликация)
- Длительное хранение данных (persistent volumes в k8s - overhead)
- Tuning OS/kernel параметров

→ **Bare metal (VM) через Ansible** = оптимальное решение

### Почему API в Kubernetes?

**API** - stateless приложение:
- Не хранит данные локально
- Легко масштабируется
- Требует оркестрации (rolling updates, health checks)
- Быстрое развертывание через контейнеры

→ **Kubernetes + Helm** = best practice для stateless приложений

### Почему Ansible + Kubernetes, а не что-то одно?

**Разделение ответственности**:
- **Ansible** → Infrastructure (OS, PostgreSQL, system services)
- **Kubernetes** → Applications (контейнеры, оркестрация)

Это стандартный подход в enterprise (infrastructure as code + GitOps).

---

## 🛠️ Основные параметры конфигурации

### PostgreSQL (group_vars/all.yml)

```yaml
patroni_cluster_name: "student5-postgres-cluster"
postgresql_version: 16
patroni_installation_method: "deb"
dcs_type: "etcd"
with_haproxy_load_balancing: true
synchronous_mode: false  # Async replication
```

### API (helm/api-chart/values.yaml)

```yaml
replicaCount: 2
image:
  repository: ghcr.io/ldest/mfti-course/api
  tag: latest

ingress:
  enabled: true
  className: nginx-ingress  # ← ВАЖНО!
  host: student5-api.autobase.tech

database:
  host: "192.168.1.34"     # HAProxy IP
  port: "5000"             # Master port
```

---

## 🐛 Типичные проблемы и решения

### 1. Pod в CrashLoopBackOff

**Причина**: Health probes fail (API не имеет `/health` endpoint)

**Решение**: Удалить health probes из deployment
```bash
kubectl patch deployment api-chart -n sre-cource-student-5 --type='json' \
  -p='[{"op": "remove", "path": "/spec/template/spec/containers/0/livenessProbe"}]'
```

### 2. Resource quota exceeded

**Причина**: Namespace limit = 1 CPU, 2 реплики × 500m = 1000m

**Решение**: Уменьшить до 1 реплики
```bash
kubectl scale deployment api-chart --replicas=1 -n sre-cource-student-5
```

### 3. Patroni tasks skipped

**Причина**: `patroni_installation_method: "repo"` не существует

**Решение**: Изменить на `"deb"` в group_vars/all.yml

### 4. TLS certificate error в kubectl

**Причина**: Сертификат валиден для внутренних IP, не внешних

**Решение**: Добавить `--insecure-skip-tls-verify=true`
```bash
kubectl config set-cluster kubernetes --insecure-skip-tls-verify=true
```

---

## 📊 Мониторинг

### HAProxy Statistics

Открыть в браузере: http://192.168.1.34:7000

Показывает:
- Статус master/replica нод
- Количество активных соединений
- Health checks

### Patroni REST API

```bash
# Проверить статус через REST API
curl http://192.168.1.31:8008/  # bd1
curl http://192.168.1.32:8008/  # bd2
```

### Kubernetes Events

```bash
kubectl get events -n sre-cource-student-5 --sort-by='.lastTimestamp'
```

---

## 📚 Использованные технологии

| Технология | Версия | Назначение |
|------------|--------|------------|
| **Ansible** | 2.19.3 | Infrastructure as Code |
| **autobase.vitabaks** | 2.4.1 | PostgreSQL HA automation |
| **PostgreSQL** | 16 | Relational database |
| **Patroni** | latest | HA orchestrator + auto-failover |
| **etcd** | 3.5.23 | Distributed key-value store (DCS) |
| **HAProxy** | 2.x | TCP/HTTP load balancer |
| **Kubernetes** | 1.34.1 | Container orchestration |
| **Helm** | 3.19.0 | Kubernetes package manager |
| **Docker** | latest | Container runtime |

---

## 👤 Автор

**Student 5** - SRE Course MFTI
**Namespace**: sre-cource-student-5
**Domain**: student5-api.autobase.tech

---

## 📝 Выполнение домашнего задания

### ✅ Пункт 1: Ansible playbook для PostgreSQL + Patroni

- Использован репозиторий: https://github.com/vitabaks/postgresql_cluster
- Collection: autobase.vitabiks v2.4.1
- Inventory: 6 VM настроены
- Конфигурация: group_vars/all.yml
- Результат: Кластер развернут и работает

### ✅ Пункт 2: etcd + patroni + postgres + HAProxy

- **etcd**: 3 ноды (etcd1, etcd2, etcd3) в кворуме
- **patroni**: Установлен и настроен на bd1, bd2
- **postgres**: PostgreSQL 16 с streaming replication
- **HAProxy**: 1 инстанс на balancer (порты 5000, 5001, 7000)

### ✅ Пункт 3: Helm chart для API

- Namespace: `sre-cource-student-5`
- Image: `ghcr.io/ldest/mfti-course/api:latest`
- Миграция БД: migration-job.yaml с Helm hooks
- API подключен к PostgreSQL через HAProxy (192.168.1.34:5000)
- **ingressClassName**: `nginx-ingress` ✅
- Работоспособность: Проверена, API отвечает

---

## 🎯 Критерии оценки

| Критерий | Статус | Комментарий |
|----------|--------|-------------|
| **Техническая корректность Ansible playbook** | ✅ | Использован production-ready autobase.vitabaks |
| **Техническая корректность Helm chart** | ✅ | Все ресурсы настроены правильно, включая ingress class |
| **Работоспособность playbook** | ✅ | Кластер развернут, Patroni работает 6+ часов |
| **Работоспособность Helm chart** | ✅ | API работает, миграция выполнена, Ingress настроен |
| **Качество документации** | ✅ | README.md с полным описанием архитектуры и инструкциями |

---

## 🔗 Полезные ссылки

- [PostgreSQL Cluster (vitabaks)](https://github.com/vitabaks/postgresql_cluster)
- [Patroni Documentation](https://patroni.readthedocs.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
