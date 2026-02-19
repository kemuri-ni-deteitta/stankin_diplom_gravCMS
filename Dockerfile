FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# System packages, Nginx, Supervisor, PHP 8.1 and required extensions for Grav
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    ca-certificates curl unzip git \
    nginx supervisor \
    certbot \
    openssl \
    php8.1-fpm php8.1-cli \
    php8.1-gd php8.1-xml php8.1-mbstring php8.1-curl php8.1-zip php8.1-apcu php8.1-intl php8.1-opcache \
 && rm -rf /var/lib/apt/lists/*

# Configure PHP (use project php.ini overrides if present)
COPY php.ini /etc/php/8.1/fpm/conf.d/99-overrides.ini
COPY docker/php-fpm.conf /etc/php/8.1/fpm/php-fpm.conf

# App source
WORKDIR /var/www/html
COPY . /var/www/html

# Nginx site config and Supervisor programs
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/grav.conf

# Runtime prep: php run dir, permissions for writable paths
RUN mkdir -p /run/php /var/www/certbot /etc/letsencrypt/live/litrep.ru \
 && mkdir -p /var/www/html/tmp /var/www/html/backup \
 && chown -R www-data:www-data /var/www/html \
 && find /var/www/html -type d -print0 | xargs -0 chmod 755 \
 && find /var/www/html -type f -print0 | xargs -0 chmod 644 \
 && chmod -R 775 /var/www/html/cache /var/www/html/logs /var/www/html/images /var/www/html/tmp /var/www/html/backup || true \
 && chmod +x /var/www/html/docker/init-letsencrypt.sh || true

# Create self-signed SSL certificates for development
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/litrep.ru/privkey.pem \
    -out /etc/letsencrypt/live/litrep.ru/fullchain.pem \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=litrep/CN=litrep.ru"

EXPOSE 80 443
STOPSIGNAL SIGTERM

# Run Nginx and PHP-FPM via Supervisor
CMD ["/usr/bin/supervisord", "-n"]


