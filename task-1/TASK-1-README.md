Домашнее задание №1

1) Написать ansible playbook для развертывания postgresql в patroni сетапе. Пример (https://github.com/vitabaks/postgresql_cluster), который можно взять за основу.
2) Разворачиваем etcd, patroni, postgres и единственный инстанс Haproxy.
3) Написать helm chart для разворачивания api в выделенном неймспейсе. Docker image лежит в публичном registry, разворачивать стоит актуальную версию ghcr.io/ldest/mfti-course/api
Из образа вытащить скрипт миграции для создания БД, настроить API на работу с кластером бд через haproxy, проверить работоспособность

Важно! Кластер k8s один на всех, ingress так же один, соответственно, и ip адрес внешний будет так же один.
Разделять запросы будем через доменные имена, которые можно указать либо в заголовке Host, либо в файле hosts – как вам удобнее. Не забывайте про ingressClassName: nginx-ingress

Оценка домашнего задания будет по следующим критериям:
Техническая корректность playbookа и helm chartа
Работоспособность playbookа и helm chartа
Качество и наличие документации (опциональная история, но пару доп. баллов можете заработать)

---

# PostgreSQL HA Cluster + API Deployment
**SRE Course - Student 5**

Развертывание высокодоступного PostgreSQL кластера через Ansible и API приложения в Kubernetes через Helm.

## Архитектура

**PostgreSQL кластер (VM):**
- 3× etcd (Distributed Configuration Store)
- 2× PostgreSQL 16 + Patroni (Master-Replica с автофейловером)
- 1× HAProxy (порты 5000/5001/7000)

**API (Kubernetes):**
- Deployment (2 реплики)
- Service (ClusterIP)
- Ingress (nginx-ingress)
- Secret + Migration Job (Helm hooks)

## Быстрый старт

### PostgreSQL кластер

```bash
cd /home/rama/SRE/homework
source ansible_venv/bin/activate
cd ansible
ansible-playbook deploy_pgcluster.yml -i inventory --vault-password-file ~/.vault_pass.txt
```

**Время развертывания:** ~6 минут

### API в Kubernetes

```bash
export KUBECONFIG=/home/rama/SRE/student_5.yaml
kubectl config set-cluster kubernetes --insecure-skip-tls-verify=true
cd /home/rama/SRE/homework/task-1
helm install api-chart ./helm/api-chart -n sre-cource-student-5
```

### Проверка

```bash
# Поды должны быть Ready
kubectl get pods -n sre-cource-student-5

# Swagger UI через port-forward
kubectl port-forward -n sre-cource-student-5 svc/api-chart 8080:80
# Открыть: http://localhost:8080/swagger/index.html
```

## Подключения

**PostgreSQL:**
- HAProxy: `192.168.1.34`
- Master (RW): `192.168.1.34:5000`
- Replicas (RO): `192.168.1.34:5001`
- Stats: `http://192.168.1.34:7000`
- User/Password: `postgres/SecurePass123!`

**API:**
- Domain: `student5-api.autobase.tech`
- Swagger: `/swagger/index.html`
- Namespace: `sre-cource-student-5`

## Структура проекта

```
task-1/
├── ansible/
│   ├── inventory              # 6 VM (3 etcd + 2 postgres + 1 haproxy)
│   ├── group_vars/all.yml     # Параметры кластера
│   └── ansible.cfg
└── helm/api-chart/
    ├── values.yaml
    └── templates/
        ├── deployment.yaml    # API с TCP health probes
        ├── service.yaml
        ├── ingress.yaml       # ingressClassName: nginx-ingress
        ├── secret.yaml        # Helm hook (weight: -10)
        └── migration-job.yaml # Helm hook (weight: -5)
```

## Технические детали

### Миграция БД

SQL скрипт находится внутри Docker образа API (`/app/Migrations/init.sql`), но для выполнения нужен `psql`.

**Решение:**
- `initContainer` копирует SQL файл из API образа в shared volume
- Основной контейнер использует `postgres:alpine` для выполнения SQL через `psql`

**Порядок выполнения (Helm hooks):**
1. Secret создаётся первым (weight: -10)
2. Migration Job выполняется вторым (weight: -5)
3. Deployment запускается последним

### Health probes

API не имеет `/health` endpoint, только Swagger UI. Используются TCP socket probes для проверки доступности порта 80.

### Конфигурация

**PostgreSQL** (`ansible/group_vars/all.yml`):
- PostgreSQL 16
- Patroni с etcd DCS
- HAProxy load balancing
- Async replication

**API** (`helm/api-chart/values.yaml`):
- Image: `ghcr.io/ldest/mfti-course/api:latest`
- Replicas: 2
- Database: `192.168.1.34:5000` (HAProxy master)
- Environment: `Development` (для Swagger)

## Решение проблем

**Pod в CrashLoopBackOff:**
- Проверить, что health probes - TCP, не HTTP
- `kubectl describe pod -n sre-cource-student-5 -l app=api-chart`

**Resource quota exceeded:**
- Уменьшить replicas: `kubectl scale deployment api-chart --replicas=1 -n sre-cource-student-5`

**Migration Job не создаёт под:**
- Проверить, что resources указаны для initContainer в migration-job.yaml

**ObjectNotFoundException:**
- Нормально. Сначала создайте объект через POST, затем обновляйте через PUT.

## Выполнение заданий

✅ **Пункт 1:** Ansible playbook для PostgreSQL + Patroni
- Использована collection `autobase.vitabaks` v2.4.1
- Кластер развернут и работает

✅ **Пункт 2:** etcd + Patroni + PostgreSQL + HAProxy
- Все компоненты развернуты и настроены

✅ **Пункт 3:** Helm chart для API
- Миграция БД извлечена из образа и выполняется через Helm hook
- API подключён к PostgreSQL через HAProxy
- `ingressClassName: nginx-ingress` настроен
- API работает, поды Ready

## Технологии

- Ansible 2.19.3
- PostgreSQL 16 + Patroni + etcd 3.5.23
- HAProxy 2.x
- Kubernetes 1.34.1 + Helm 3.19.0

---

**Автор:** Student 5 - SRE Course MFTI  
**Namespace:** sre-cource-student-5  
**Domain:** student5-api.autobase.tech
