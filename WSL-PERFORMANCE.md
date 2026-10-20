# Speeding up Docker + Laravel on Windows (WSL2)

Docker Desktop runs on the **WSL2 backend**, so Windows controls how much RAM/CPU
the Docker VM gets. By default WSL2 can hog or starve resources and its swap can
thrash — both make Laravel feel sluggish. This guide covers two fixes:

1. **`.wslconfig`** — give WSL2/Docker sensible, stable resources (quick win).
2. **Project filesystem location** — the *biggest* win for Laravel specifically.

Plus a note on the app-level caching already configured.

---

## 1. `.wslconfig` (resource limits)

A `.wslconfig` file has been created for you at:

```
%USERPROFILE%\.wslconfig
```

Contents (tuned for your 32 GB / 12-core machine):

```ini
[wsl2]
memory=16GB          # RAM for the WSL2 VM (half of 32 GB)
processors=8         # CPU cores (8 of 12)
swap=4GB             # safety-net swap; normal load stays in RAM
localhostForwarding=true

[experimental]
autoMemoryReclaim=gradual   # return unused RAM to Windows
sparseVhd=true              # keep the WSL virtual disk from bloating
```

### Apply it (required — one time)

`.wslconfig` changes only take effect after WSL fully restarts:

```powershell
# 1. Save any work; this stops ALL WSL distros and Docker containers.
wsl --shutdown

# 2. Restart Docker Desktop from the Start menu (or its tray icon → Restart).
```

> Your containers use `restart: unless-stopped`, so once Docker Desktop is back
> up they start again automatically. Or run `docker compose up -d` in the project.
>
> **If a port (e.g. http://localhost:8090) doesn't respond right after a
> `wsl --shutdown`**, Docker Desktop's port proxy occasionally needs to be
> re-registered. Recreate the container:
> ```powershell
> docker compose up -d --force-recreate nginx
> ```

### Verify it worked

```powershell
# RAM/CPU the WSL VM now sees:
wsl -e bash -c "nproc && free -h"

# Or from inside the app container:
docker compose exec app sh -c "nproc && free -h"
```

You should see ~8 CPUs and ~16 GB total memory.

### Tuning for your needs

| Setting | Raise it if… | Lower it if… |
|---|---|---|
| `memory` | builds/containers feel RAM-starved | Windows itself gets sluggish |
| `processors` | `composer`/`npm`/tests are slow | you need cores for Windows apps |
| `swap` | containers get OOM-killed | you have plenty of RAM (can set `swap=0`) |

Edit `%USERPROFILE%\.wslconfig`, then re-run `wsl --shutdown` + restart Docker.

---

## 2. The biggest win: project filesystem location ⭐

This matters more than resource limits. Your project lives on the **Windows
filesystem**:

```
C:\Users\<user>\Documents\taskreminderLogic
```

When Docker bind-mounts a Windows path into a Linux container, every file read
crosses the Windows↔Linux boundary (the `9p`/`drvfs` translation layer). Laravel
reads **thousands** of small files per request, so this is the #1 cause of
slowness — often **5–20× slower** than native Linux I/O.

**Fix: move the project into the WSL2 (Linux) filesystem**, where Docker I/O is
near-native speed.

### Prerequisite: enable Docker Desktop's WSL integration (one time)

To run `docker compose` *inside* WSL, Docker Desktop must expose its engine to the
distro (currently it does not):

1. Docker Desktop -> **Settings** -> **Resources** -> **WSL integration**
2. Turn **Ubuntu** on
3. **Apply & Restart**

Verify it worked:

```powershell
wsl -e bash -lc "docker version"
```

You should see a **Server** version (not "cannot connect to the Docker daemon").

### taskreminderLogic: already moved into WSL

This project has already been copied to the Linux filesystem at:

```
~/projects/taskreminderLogic
Windows path: \\wsl$\Ubuntu\root\projects\taskreminderLogic
```

(`~` is `/root` because your WSL default user is `root`. If you switch to a normal
user later, the path becomes `\\wsl$\Ubuntu\home\<user>\projects\...`.)

To start running it from WSL (after enabling integration above), open a WSL shell
(`wsl`) and:

```bash
# free the ports by stopping the old Windows-based stack
cd "/mnt/c/Users/<you>/Documents/taskreminderLogic" && docker compose down

# start the fast WSL copy
cd ~/projects/taskreminderLogic
docker compose up -d --build
```

Visit http://localhost:8090 as usual. Once it works from WSL, delete the old
Windows copy (in File Explorer, or `rm -rf "/mnt/c/Users/<you>/Documents/taskreminderLogic"`).

### Move the other projects (same recipe)

From a WSL shell, for each project:

```bash
mkdir -p ~/projects
# copy source only - deps are rebuilt inside the containers
rsync -a --exclude node_modules --exclude vendor "/mnt/c/Users/<you>/PATH/TO/PROJECT" ~/projects/
cd ~/projects/PROJECT
docker compose down 2>/dev/null    # stop the old stack if it was running
docker compose up -d --build       # start it from WSL
```

Your remaining Docker projects and their current Windows locations:

| Project | Source path (use inside WSL) |
|---|---|
| orange-meet-docker | `/mnt/c/Users/<you>/Desktop/orange-meet-docker` |
| sign-now | `/mnt/c/Users/<you>/Downloads/Sign-Now-main/sign-now` |
| store | `/mnt/c/Users/<you>/Desktop/Store` |
| taskAssign | `/mnt/c/Users/<you>/Documents/taskAssign` |
| watch show | `/mnt/c/Users/<you>/Desktop/watch show` |
| watchshow-mobile | `/mnt/c/Users/<you>/Desktop/watchshow-native-php/watchshow-mobile` |

Replace `<you>` with your Windows user folder. Keep paths with spaces quoted.
Delete each Windows original only after the WSL copy is confirmed working.

### Open, browse, modify & delete WSL files

- **Terminal:** run `wsl` (or open "Ubuntu" in Windows Terminal). You begin in your
  home (`~` = `/root`). Use `cd ~/projects`, `ls`, `nano file`, `rm file`,
  `rm -rf folder`, `cp`, `mv` — all the normal commands.
- **File Explorer:** type this in the address bar (or click **Linux** in the left
  sidebar): `\\wsl$\Ubuntu\root\projects` — then browse, edit, drag, and delete
  files exactly like a Windows folder.
- **VS Code:** from a WSL shell, `cd` into a project and run `code .` (uses the
  Remote-WSL extension) for native-speed editing.

> Edit through WSL (`~/projects` or `\\wsl$\...`), **not** the old `C:\` copy, or you
> lose the speed benefit. App URLs (http://localhost:8090, etc.) stay the same.

If you'd rather keep a project on `C:\`, the `.wslconfig` tuning + the app-level
caching below still help — just not as dramatically.

---

## 3. App-level optimizations (already configured)

These are already in the project and reduce per-request work regardless of where
the files live:

- **OPcache** tuned in `docker/php/opcache.ini` (compiled PHP kept in memory).
- **`config:cache`, `event:cache`, `view:cache`** built on container start
  (see `docker/php/entrypoint.sh`).
- **`bootstrap/cache` on a Docker volume** (off the slow bind mount).
- **Dashboard counts cached** per user (60s) with automatic invalidation.

After changing `.env` or config files, refresh these caches:

```bash
docker compose exec app php artisan optimize:clear
docker compose restart app   # rebuilds the caches on startup
```

---

## Quick checklist

- [ ] `%USERPROFILE%\.wslconfig` exists (done ✅)
- [ ] Ran `wsl --shutdown` and restarted Docker Desktop
- [ ] Verified ~16 GB / 8 CPUs in WSL
- [ ] (Best) Moved the project into the WSL2 filesystem
- [ ] App still loads at http://localhost:8090
```
