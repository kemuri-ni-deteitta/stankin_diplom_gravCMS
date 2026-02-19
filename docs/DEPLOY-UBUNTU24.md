# Развёртывание Grav (litrep.ru) на Ubuntu 24 без Docker

Пошаговая инструкция: клонирование репозитория на сервер и настройка Nginx + PHP-FPM + Let's Encrypt. Docker не используется.

---

## Требования

- Сервер Ubuntu 24.04 LTS с доступом по SSH (root или sudo).
- Домены **litrep.ru** и **www.litrep.ru** указывают на IP этого сервера (A-записи в DNS).
- URL репозитория с проектом (Git).

---

## 1. Установка пакетов

```bash
sudo apt update
sudo apt install -y nginx php8.3-fpm php8.3-gd php8.3-xml php8.3-mbstring php8.3-curl php8.3-zip php8.3-intl php8.3-opcache certbot python3-certbot-nginx git
```

Для Ubuntu 24 по умолчанию ставится PHP 8.3; сокет будет `php8.3-fpm.sock` (уже прописан в `snippets/php-fpm.conf`).

---

## 2. Клонирование проекта

Клонируйте репозиторий **так, чтобы корень репозитория стал корнем сайта** (в `/var/www/litrep` лежат сразу `index.php`, `user/`, `system/`, `webserver-configs/` и т.д.):

```bash
sudo mkdir -p /var/www/litrep
sudo git clone <URL-вашего-репозитория> /var/www/litrep
```

Если репозиторий клонируется в подпапку (например `GravDiplom`), перенесите содержимое в корень сайта:

```bash
# если склонировали в /var/www/litrep/gravExpo или /var/www/litrep/GravDiplom:
sudo mv /var/www/litrep/gravExpo/* /var/www/litrep/  2>/dev/null || true
sudo mv /var/www/litrep/gravExpo/.* /var/www/litrep/  2>/dev/null || true
sudo rmdir /var/www/litrep/gravExpo 2>/dev/null || true
# (аналогично для GravDiplom — замените gravExpo на имя папки)
```

Права и каталоги для Grav:

```bash
sudo chown -R www-data:www-data /var/www/litrep
sudo chmod -R 755 /var/www/litrep
sudo chmod -R 775 /var/www/litrep/cache /var/www/litrep/logs /var/www/litrep/images /var/www/litrep/tmp /var/www/litrep/backup 2>/dev/null || true
```

Убедитесь, что в корне сайта есть конфиги Nginx и snippets:

```bash
ls /var/www/litrep/webserver-configs/nginx/litrep-http-only.conf
ls /var/www/litrep/webserver-configs/nginx/litrep.conf
ls /var/www/litrep/webserver-configs/nginx/snippets/
```

Должны быть файлы `litrep-http-only.conf`, `litrep.conf` и каталог `snippets/` с `grav-common.conf` и `php-fpm.conf`. Если чего-то нет — подтяните последние изменения из репозитория (`git pull`) или склонируйте заново.

---

## 3. Зависимости PHP (Composer)

Если в репозитории нет каталога `vendor/`, установите зависимости на сервере:

```bash
cd /var/www/litrep
sudo -u www-data composer install --no-dev --optimize-autoloader
```

(Установите `composer`, если его нет: `sudo apt install -y composer`.)

---

## 4. Snippets Nginx

Скопируйте общие фрагменты конфигурации (Grav + PHP-FPM) в каталог Nginx:

```bash
sudo mkdir -p /etc/nginx/snippets
sudo cp -r /var/www/litrep/webserver-configs/nginx/snippets/* /etc/nginx/snippets/
```

Проверьте сокет PHP в `php-fpm.conf` (для Ubuntu 24 обычно подходит как есть):

```bash
grep fastcgi_pass /etc/nginx/snippets/php-fpm.conf
# Должно быть: unix:/run/php/php8.3-fpm.sock
```

---

## 5. Первый запуск: только HTTP (для Certbot)

Поставьте конфиг **без HTTPS** — он нужен, чтобы Let's Encrypt мог проверить домен по HTTP:

```bash
sudo cp /var/www/litrep/webserver-configs/nginx/litrep-http-only.conf /etc/nginx/sites-available/litrep.conf
sudo ln -sf /etc/nginx/sites-available/litrep.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Если `nginx -t` выдаёт ошибку — исправьте путь к snippets или к сокету PHP (см. шаг 4).

---

## 6. Получение сертификата Let's Encrypt

Подставьте свой email вместо `ваш@email.ru`:

```bash
sudo certbot certonly --webroot -w /var/www/litrep -d litrep.ru -d www.litrep.ru --agree-tos --email ваш@email.ru
```

При успехе сертификаты появятся в `/etc/letsencrypt/live/litrep.ru/`.

---

## 7. Включение HTTPS

Замените конфиг на полный (редирект HTTP→HTTPS и SSL):

```bash
sudo cp /var/www/litrep/webserver-configs/nginx/litrep.conf /etc/nginx/sites-available/litrep.conf
sudo nginx -t && sudo systemctl reload nginx
```

Если Nginx ругается на отсутствие `options-ssl-nginx.conf` или `ssl-dhparams.pem`, один раз выполните:

```bash
sudo certbot install --cert-name litrep.ru
```

затем снова `sudo nginx -t && sudo systemctl reload nginx`.

---

## 8. Автопродление сертификата

Проверка и продление уже настроены через таймер certbot:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## 9. Проверка

- В браузере откройте: **https://litrep.ru**
- В админке Grav при необходимости очистите кеш (Инструменты → Очистить кеш или удалите содержимое `cache/`).

---

## Файлы конфигурации в репозитории

Все конфиги лежат в репозитории в каталоге `webserver-configs/nginx/`:

| Файл | Назначение |
|------|------------|
| `litrep-http-only.conf` | Только HTTP — для первого запуска и получения сертификата (шаг 5). |
| `litrep.conf` | Полный конфиг с HTTPS (шаг 7). |
| `snippets/grav-common.conf` | Общие правила и безопасность для Grav. |
| `snippets/php-fpm.conf` | Обработка PHP (сокет php8.3-fpm). |

Подробнее: `webserver-configs/nginx/README.md`.

---

## Если что-то пошло не так

- **Нет файлов litrep-http-only.conf / litrep.conf** — убедитесь, что клонировали актуальный репозиторий и корень сайта совпадает с корнем репозитория (см. шаг 2). Выполните `ls /var/www/litrep/webserver-configs/nginx/` и при необходимости сделайте `git pull` или клонирование заново.
- **502 Bad Gateway** — проверьте, что запущен PHP-FPM: `sudo systemctl status php8.3-fpm`, и путь к сокету в `/etc/nginx/snippets/php-fpm.conf` совпадает с версией PHP.
- **403 Forbidden** — проверьте владельца и права: `sudo chown -R www-data:www-data /var/www/litrep`, права на `cache/`, `logs/`, `images/`, `tmp/`, `backup/` — 775.
