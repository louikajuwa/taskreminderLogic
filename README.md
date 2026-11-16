# Task Manager

A lightweight, personal task & reminder system with a Jira-like feel (Laravel + Inertia.js + React + Tailwind, backed by MySQL) that runs entirely in Docker — private per-account workspaces with tasks, priorities, statuses, due dates, reminders, file attachments, search/filter, a dashboard, and a drag-and-drop Kanban board.

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose v2 (the `docker compose` command).
- Host ports **8090**, **8091**, and **3390** free.

That's it — PHP, Composer, and Node all run **inside** the containers. No local PHP/Node/MySQL installation is required.

## Run

```bash
# 1. Create your environment file
cp .env.example .env

# 2. Build the images and start all containers (detached)
docker compose up -d --build
```

First boot takes a few minutes while images build and dependencies install. Watch progress with `docker compose logs -f app vite`.

On startup the `app` container's entrypoint (`docker/php/entrypoint.sh`) automatically:

1. Copies `.env.example` to `.env` if `.env` is missing.
2. Runs `composer install` if `vendor/` is empty.
3. Runs `php artisan optimize:clear`, then generates `APP_KEY` if missing.
4. Waits for MySQL to accept connections.
5. Relaxes permissions on `storage/` and `bootstrap/cache`.
6. Runs `php artisan migrate --force` and `php artisan storage:link`.
7. Rebuilds `config:cache`, `event:cache`, and `view:cache`, then starts `php-fpm`.

The `vite` container runs `npm install`, builds the optimized frontend assets into `public/build`, then idles. Laravel serves those static files, so pages load fast with no on-demand compilation. After editing frontend files, rebuild with `docker compose exec vite npm run build`.

Once everything is up, open **http://localhost:8090** and register an account.

## Services

Defined in `docker-compose.yml`. All services share the `taskmanager` bridge network.

| Service      | Image / Build                       | Purpose                                            | Port (host:container) | URL                     |
|--------------|-------------------------------------|----------------------------------------------------|-----------------------|-------------------------|
| `app`        | Build from `./Dockerfile` (`php:8.4-fpm`, tagged `taskmanager-app`) | PHP-FPM: runs Laravel, migrations, entrypoint setup | — (internal `9000`)   | —                       |
| `nginx`      | `nginx:alpine`                      | Web server / reverse proxy in front of `app`       | `8090:80`             | http://localhost:8090   |
| `mysql`      | `mysql:8.0`                         | Database (with healthcheck; `app` waits for it)    | `3390:3306`           | `127.0.0.1:3390` (host) |
| `phpmyadmin` | `phpmyadmin:5`                      | Database admin UI (`UPLOAD_LIMIT=50M`)             | `8091:80`             | http://localhost:8091   |
| `vite`       | `node:20-alpine`                    | Builds frontend assets into `public/build`, then idles | — (no host port)  | —                       |

> Ports **8090 / 8091 / 3390** were chosen to avoid clashing with other local Docker stacks. Change them in `docker-compose.yml` if needed (and update `APP_URL` to match).

## Environment

Copy `.env.example` to `.env` before the first run. The defaults work out of the box with Docker; if `.env` is missing, the entrypoint copies it from `.env.example` for you.

The `DB_*` values are the single source of truth: the same variables are read by `docker-compose.yml` to provision the MySQL container and by the `app` container to connect. The `app` service overrides `DB_HOST=mysql` and `DB_PORT=3306` (the in-network service name and container port) via compose `environment`.

Key `.env` keys and their defaults:

```dotenv
APP_NAME="Task Manager"
APP_ENV=local
APP_KEY=                          # generated automatically on first boot
APP_DEBUG=true                      # local development only
APP_URL=http://localhost:8090

DB_CONNECTION=mysql
DB_HOST=mysql                     # docker-compose service name
DB_PORT=3306                      # container-internal port
DB_DATABASE=task_manager
DB_USERNAME=taskuser
DB_PASSWORD=secret
DB_ROOT_PASSWORD=rootsecret

SESSION_DRIVER=database
QUEUE_CONNECTION=database         # queue jobs stored in the DB
CACHE_STORE=database

FILESYSTEM_DISK=local             # attachments live on the private disk
ATTACHMENT_MAX_KB=10240           # max size per attachment (10 MB)
```

Compose reads these `${...}` variables from `.env` with built-in fallbacks: `DB_DATABASE` (`task_manager`), `DB_USERNAME` (`taskuser`), `DB_PASSWORD` (`secret`), `DB_ROOT_PASSWORD` (`rootsecret`).

`ATTACHMENT_MAX_KB` is kept in sync with `upload_max_filesize` / `post_max_size` in `docker/php/php.ini` and `client_max_body_size` in `docker/nginx/default.conf`.

## Volumes & persistence

Named volumes (survive `docker compose down`; removed only by `docker compose down -v`):

| Volume            | Mounted at                    | Purpose                                                        |
|-------------------|-------------------------------|----------------------------------------------------------------|
| `mysql-data`      | `/var/lib/mysql`              | MySQL database files.                                          |
| `vendor`          | `/var/www/vendor`             | Composer dependencies (kept off the slow host bind mount).    |
| `node_modules`    | `/var/www/node_modules`       | npm dependencies (shared by `app` and `vite`).                |
| `bootstrap_cache` | `/var/www/bootstrap/cache`    | Framework cache — kept inside the container so it isn't read across the slow bind mount and doesn't leak to host tooling. |

Bind mount: the project root (`.`) is mounted to `/var/www` in the `app`, `nginx`, and `vite` containers, so code edits are live and uploaded attachments (`storage/app/private/attachments/{user_id}/…`) persist on the host. `nginx` also bind-mounts `./docker/nginx/default.conf` read-only.

## Common commands

```bash
# Start / rebuild
docker compose up -d                 # start (detached)
docker compose up -d --build         # rebuild images, then start

# Stop
docker compose stop                  # stop containers, keep everything
docker compose down                  # stop + remove containers, KEEP named volumes
docker compose down -v               # stop + remove containers AND delete volumes (wipes DB + deps)

# Inspect
docker compose ps                    # list services
docker compose logs -f app           # follow app logs
docker compose logs -f app vite      # follow app + vite (useful on first boot)

# Exec into the app container
docker compose exec app php artisan <command>
docker compose exec app composer <command>

# Rebuild frontend assets after editing resources/js
docker compose exec vite npm run build

# Migrations (also run automatically by the entrypoint on start)
docker compose exec app php artisan migrate              # apply pending
docker compose exec app php artisan migrate:fresh        # drop all + re-migrate
docker compose exec app php artisan migrate:fresh --seed # re-migrate + demo data

# After changing config or .env (config/routes are cached for speed)
docker compose exec app php artisan optimize:clear       # or: docker compose restart app
```

The `QUEUE_CONNECTION=database` default means queued jobs are stored in the DB; if you add queued work, run a worker with `docker compose exec app php artisan queue:work`.

## Verify

1. `docker compose ps` — all services (`app`, `nginx`, `mysql`, `phpmyadmin`, `vite`) should be running; `mysql` should be `healthy`.
2. Open **http://localhost:8090** — the app loads and you can register an account.
3. Open **http://localhost:8091** — phpMyAdmin loads (log in with `DB_USERNAME` / `DB_PASSWORD`, i.e. `taskuser` / `secret`).

Optionally seed demo data to verify per-account data isolation:

```bash
docker compose exec app php artisan migrate:fresh --seed
```

This creates two demo accounts:

| Email               | Password   |
|---------------------|------------|
| demo@example.com    | `password` |
| second@example.com  | `password` |

---

## Features

- **Authentication** — register, login, logout (Laravel Breeze).
- **Private workspaces** — every user only ever sees and manages their own data.
- **Tasks** — create, edit, delete, and mark complete via modal forms.
- **Priorities** — Low / Medium / High.
- **Statuses** — Pending / In Progress / Completed.
- **Due dates & reminders** — overdue highlighting and an in-app reminder toast.
- **File attachments** — multiple files per task, stored privately and streamed only to their owner.
- **Search, filter & sort** — by keyword, status, priority, and several sort options.
- **Kanban board** — drag tasks between Pending / In Progress / Completed columns.
- **Dashboard** — totals for all / completed / pending / overdue tasks.
- **SweetAlert2** — success/error toasts and delete confirmations.

## Tech Stack

| Layer       | Technology                                              |
|-------------|---------------------------------------------------------|
| Backend     | Laravel (PHP 8.4)                                       |
| Frontend    | React 18 + Inertia.js                                   |
| Styling     | Tailwind CSS 3                                          |
| Build tool  | Vite                                                    |
| Database    | MySQL 8 + phpMyAdmin                                    |
| Popups      | SweetAlert2                                             |
| Drag & drop | @hello-pangea/dnd                                       |
| Environment | Docker Compose (app/php-fpm, nginx, mysql, phpmyadmin, vite) |

## Architecture & data isolation

Controllers: `DashboardController`, `TaskController`, `AttachmentController`. Models: `User`, `Task`, `Attachment`. Frontend pages: `resources/js/Pages/Dashboard.jsx`, `Pages/Tasks/{Index,Board}.jsx`.

1. Every task query is scoped through `auth()->user()->tasks()` — never an unscoped model query.
2. `TaskPolicy` and `AttachmentPolicy` authorize every view/update/delete, so requesting another user's task or attachment by id returns **403**.
3. Attachments live on Laravel's private `local` disk and are streamed only after the policy check passes, via `GET /attachments/{id}/download`. Files are never served from a public URL. Allowed types (images, PDFs, Office docs, text/CSV, zip) and size limits are in `config/attachments.php`.

## Performance & caching notes

- **Pre-built frontend assets** — the app serves bundled, minified JS/CSS from `public/build` (not a live Vite dev server), so the first page load is fast. Rebuild after edits with `docker compose exec vite npm run build`.
- **OPcache** is enabled and tuned (`docker/php/opcache.ini`).
- On startup the entrypoint runs `config:cache`, `event:cache`, and `view:cache`, rebuilt on every start — so `docker compose restart app` always picks up the latest code/`.env`.
- The framework cache lives in the dedicated `bootstrap_cache` volume (not the bind mount).
- Dashboard counts are cached per user for 60s and invalidated on task create/update/delete (`Task::booted()` → `Cache::forget`). The task list is paginated (10/page); dashboard lists cap at 5; the Kanban board loads all cards by design.

## Troubleshooting

- **Frontend changes not showing** — assets are pre-built. After editing `resources/js`, run `docker compose exec vite npm run build` and refresh.
- **Want instant HMR** — in `docker-compose.yml` add `ports: ["5273:5173"]` to the `vite` service and change its command to `npm run dev -- --host 0.0.0.0`, then `docker compose up -d --force-recreate vite`. Delete `public/hot` (or revert) to return to fast pre-built assets.
- **Port already in use** — change the host port mappings in `docker-compose.yml` (and `APP_URL` / `vite.config.js` `clientPort` accordingly).
- **Permission errors on `storage/`** — the entrypoint relaxes permissions automatically; if needed run `docker compose exec app chmod -R ug+rw storage bootstrap/cache`.
- **DB connection refused on first boot** — MySQL takes a few seconds to initialize; the app entrypoint waits for it. Re-check with `docker compose logs -f app`.

## License

MIT — see [LICENSE](LICENSE).
