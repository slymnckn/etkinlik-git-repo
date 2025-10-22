## Quick orientation for AI coding agents

This repository is a full-stack Laravel + static frontend (and an Electron build) project. Below are focused, actionable notes to help you be productive quickly — reference the files shown when making changes.

- Architecture (big picture)
  - backend/ is a Laravel 12 application (PHP 8.2). Key entry: `backend/artisan` and `backend/bootstrap/app.php`.
  - frontend/ contains a static site built with Vite (see `frontend/package.json`) and prebuilt assets in `frontend/assets/`.
  - electron-app/ holds an Electron wrapper and a large Unity/Web build in `electron-app/public/Build/` — treat those files as binary assets (avoid editing).

- API surface & conventions
  - All API routes live in `backend/routes/api.php`. Unity-specific public endpoints are under the `unity` prefix. Example: `Route::prefix('unity')->group(...)`.
  - Controllers for API live in `App\Http\Controllers\Api` and follow `Route::apiResource` for CRUD. When you add a resource, update `routes/api.php` and create controller + request validation under that namespace.
  - Authentication uses Laravel Sanctum. Protected routes are guarded with `middleware('auth:sanctum')` in `routes/api.php`.
  - CORS is implemented inline at the top of `routes/api.php` (headers + OPTIONS short-circuit). Be careful when adding a global CORS middleware — `api.php` already sets headers for many endpoints.

- Important files to inspect when changing behavior
  - `backend/composer.json` — project PHP requirements and composer scripts (`post-create-project-cmd`, `dev` which runs a concurrent dev stack).
  - `backend/package.json` — Vite scripts (`dev`, `build`) used by the Laravel frontend assets pipeline.
  - `backend/app/Providers/RouteServiceProvider.php` — shows API prefix and rate limiting configuration.
  - `backend/routes/api.php` — canonical source of API endpoints (public, unity, jenkins and protected groups).
  - `database/migrations/` and `database/factories/` — model + DB migration conventions used across the project.

- Common developer workflows (explicit commands)
  - Local backend setup (PowerShell):
    - composer install; cd backend; composer install; composer run dev
    - Or step-by-step: cd backend; composer install; cp .env.example .env; php artisan key:generate; php -r "file_exists('database/database.sqlite') || touch('database/database.sqlite');"; php artisan migrate; npm install; npm run dev
  - Run tests (backend):
    - cd backend; ./vendor/bin/phpunit OR vendor\bin\phpunit (PowerShell)
  - Build production frontend assets (backend Vite usage):
    - cd backend; npm run build
  - Full dev stack (single command uses composer script):
    - cd backend; composer run dev  # runs php artisan serve, queue listener, pail and vite concurrently

- Project-specific patterns & gotchas
  - Exports and background work: the project uses Laravel queues (see `composer.json` dev scripts and `php artisan queue:listen`). Exports have dedicated `ExportController` and routes such as `exports/{export}/download` — when changing export logic check for queued jobs and retry/cancel endpoints in `routes/api.php`.
  - Jenkins integration: there are endpoints under `jenkins/*` used by external CI to create iframes and callbacks (`JenkinsController`). These are named routes (e.g. `jenkins.create-iframe`) and expect authentication for some actions.
  - Unity clients: many endpoints under `unity/` are intentionally public (no auth) to allow Unity builds to fetch questions and publishers. Do not accidentally add auth middleware to these unless intended.
  - Image uploads: there are base64 upload endpoints (`/questions/upload-base64-image`) and direct upload endpoints (check `QuestionController` and `QuestionGroupController`). Follow existing validation patterns when adding similar endpoints.

- Editing guidelines for AI agents
  - Prefer changing controller code under `App\Http\Controllers\Api` and avoid editing compiled assets in `frontend/assets/` or `electron-app/public/Build/`.
  - When adding a new API route:
    1. Add route to `backend/routes/api.php` (use `apiResource` if CRUD).
    2. Create Controller in `App\Http\Controllers\Api` and corresponding Request validation if needed.
    3. Add migration, factory and seeder in `database/` if a new model is added.
    4. Run `php artisan migrate` and run relevant tests.
  - When changing authentication, check `composer.json` for `laravel/sanctum` and `routes/api.php` for where the `auth:sanctum` middleware is applied.

- Where to avoid edits
  - Do not edit large generated Unity/Electron build files in `electron-app/public/Build/` and `frontend/assets/` unless you are intentionally rebuilding them from source.

- cPanel Git deployment workflow (production server)
  - Repository on server: `/home/etknlkapp/etkinlik-git-repo/` (username: `etknlkapp`, server: `etkinlik.app`, SSH port: `33330`, real IP: `195.201.168.138`)
  - `.cpanel.yml` defines deployment tasks: copies `backend/` → `/home/etknlkapp/laravel_ariyayin/`, `frontend/` → `/home/etknlkapp/public_html/`, `scripts/` → `/home/etknlkapp/scripts/`
  - Deploy trigger: cPanel Git Version Control → "Manage" → "Pull or Deploy" → "Deploy HEAD Commit" (requires clean working tree + valid `.cpanel.yml`)
  - Local development: If SSH port is blocked by ISP/firewall, use ZIP download from cPanel File Manager, extract to local, work in VS Code, then upload changes back to server git repo via File Manager or SFTP
  - Git config on server: user.email = `admin@etkinlik.app`, user.name = `Etkinlik Admin`
  - SSH key: `etkinlik-local-key` (authorized in cPanel SSH Access), passphrase-protected (key stored in `~/.ssh/etkinlik-local-key` locally)
  - Clone URL (SSH): `ssh://etknlkapp@195.201.168.138:33330/home/etknlkapp/etkinlik-git-repo` (use direct IP to bypass Cloudflare proxy which blocks SSH)
  - Important: Do NOT deploy to production until changes are tested locally. Deploy overwrites live site files in `public_html/` and `laravel_ariyayin/`.

If any part of this summary is unclear or you'd like more examples (controller snippets, common response shapes, or where queued jobs live), tell me which area and I will expand the instructions. Also confirm whether you want these rules added to backend/README.md or kept only under `.github/copilot-instructions.md`.
