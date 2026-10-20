# PHP-FPM image for the Laravel application
FROM php:8.4-fpm

# System dependencies required by Laravel + common PHP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        curl \
        zip \
        unzip \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
        libonig-dev \
        libxml2-dev \
        libzip-dev \
        default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# PHP extensions (opcache included for performance)
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring exif pcntl bcmath gd zip opcache

# Composer (from the official Composer image)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Custom PHP settings (larger upload limits for attachments) + OPcache tuning
COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini

# Entrypoint: waits for the DB, installs deps, migrates, then starts php-fpm
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

WORKDIR /var/www

EXPOSE 9000
ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]
