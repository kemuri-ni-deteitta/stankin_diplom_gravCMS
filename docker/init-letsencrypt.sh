#!/bin/sh
#
# Получение TLS-сертификата Let's Encrypt для litrep.ru
# Запускать один раз при первом развёртывании (когда DNS уже указывает на сервер).
#
# Варианты запуска:
#   A) Внутри контейнера (после docker run):
#      docker exec -it <container_name> /var/www/html/docker/init-letsencrypt.sh
#   B) На хосте, если certbot установлен и nginx отдаёт /.well-known из /var/www/certbot:
#      sudo ./docker/init-letsencrypt.sh
#
# Требования: домен litrep.ru и www.litrep.ru должны резолвиться на этот сервер.

set -e

DOMAIN="${DOMAIN:-litrep.ru}"
WEBROOT="${WEBROOT:-/var/www/certbot}"
EMAIL="${LETSENCRYPT_EMAIL:-}"

# Опция --email для соглашения с ToS и уведомлений об истечении (рекомендуется)
if [ -n "$EMAIL" ]; then
  EXTRA_OPTS="--email $EMAIL --agree-tos --no-eff-email"
else
  EXTRA_OPTS="--register-unsafely-without-email --agree-tos"
fi

echo "Obtaining Let's Encrypt certificate for $DOMAIN and www.$DOMAIN"
echo "Webroot: $WEBROOT"
certbot certonly --webroot -w "$WEBROOT" \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  $EXTRA_OPTS \
  --non-interactive --keep-until-expiring

echo "Certificate obtained. Reloading nginx..."
nginx -s reload 2>/dev/null || true
echo "Done."
