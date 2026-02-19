# Конфиги Nginx для litrep.ru (Ubuntu 24, без Docker)

Используются при развёртывании по инструкции `docs/DEPLOY-UBUNTU24.md`.

| Файл | Назначение |
|------|------------|
| **litrep-http-only.conf** | Только HTTP (порт 80). Ставится первым, чтобы Certbot мог получить сертификат. |
| **litrep.conf** | Полный конфиг: редирект HTTP→HTTPS и SSL. Ставится после выдачи сертификата. |
| **snippets/grav-common.conf** | Общие правила и безопасность для Grav. |
| **snippets/php-fpm.conf** | Обработка PHP через PHP-FPM (сокет php8.3). |

Остальные файлы (expo-land.conf, expotest.conf) — для других доменов/окружений.
