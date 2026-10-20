#!/bin/sh
set -e

cd /var/www

# Ensure an .env file exists
if [ ! -f .env ]; then
    echo "[entrypoint] .env not found, copying from .env.example"
    cp .env.example .env
fi

# Install PHP dependencies if the vendor directory is empty
if [ ! -f vendor/autoload.php ]; then
    echo "[entrypoint] Installing Composer dependencies..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

# Start setup from a clean cache so migrations/key generation read live .env
php artisan optimize:clear || true

# Generate the application key if it is missing
if ! grep -q "^APP_KEY=base64:" .env; then
    echo "[entrypoint] Generating application key..."
    php artisan key:generate --force
fi

# Wait for MySQL to accept connections
DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"
echo "[entrypoint] Waiting for MySQL at ${DB_HOST}:${DB_PORT}..."
until php -r "exit(@fsockopen(getenv('DB_HOST') ?: 'mysql', (int)(getenv('DB_PORT') ?: 3306)) ? 0 : 1);"; do
    echo "[entrypoint] MySQL is unavailable - sleeping"
    sleep 2
done
echo "[entrypoint] MySQL is up."

# Make sure Laravel can write to storage and cache
chmod -R ug+rw storage bootstrap/cache 2>/dev/null || true

# Run migrations and link storage (idempotent)
php artisan migrate --force || true
php artisan storage:link 2>/dev/null || true

# Build caches for performance. Rebuilt on every container start, so a
# `docker compose restart app` always picks up the latest code and .env.
php artisan config:cache || true
php artisan event:cache || true
php artisan view:cache || true

echo "[entrypoint] Starting: $*"
exec "$@"
