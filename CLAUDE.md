# CLAUDE.md

## Project Overview

Grav CMS flat-file website for a Russian professional services business (litrep). No database — all content is Markdown + YAML. Multi-language (Russian primary, English secondary). PHP backend, Twig templating.

## Tech Stack

- PHP 7.3.6+ / 8.0+, Twig ~1.44, Symfony components
- Grav CMS framework (`/system/`)
- Plugins: admin, form, login, email, error, mobile-detect, markdown-notices
- Theme: Quark (`/user/themes/quark/`)
- Composer for PHP deps; no Node/npm build step

## Architecture

- **Flat-file**: no database; all content in `/user/pages/`, configs in `/user/config/`
- **Request pipeline**: `.htaccess` → `index.php` → Grav container → Processors → Twig render
- **Plugins** extend via Symfony EventDispatcher (`$grav->fireEvent(...)`)
- **Admin UI** at `/admin` (admin plugin); schemas defined via blueprints YAML

## Project Structure

```
/system/          Grav core — never edit directly
/user/
  config/         Site/system/plugin YAML configs
  pages/          Content (Markdown + YAML front matter)
  themes/quark/   Active theme (templates, assets, JS/CSS)
  plugins/        Installed plugins (mostly gitignored internals)
  data/           Form submissions, flex objects, notifications
  images/         Processed image cache (auto-generated)
  accounts/       Admin accounts — gitignored, never commit
/vendor/          Composer deps — gitignored, regenerate after clone
/cache/           Runtime cache — safe to delete entirely
/logs/            grav.log grows large; monitor disk
/tmp/             Temp files
```

## Content Model

- Pages live in `/user/pages/` with numeric prefix ordering: `01.home/`, `02.o-kompanii/`
- Each page = directory + Markdown file: `default.ru.md` (Russian), `default.en.md` (English)
- YAML front matter defines title, template, menu visibility, custom fields
- URL derived from folder name minus numeric prefix: `03.uslugi/` → `/uslugi`
- Modular pages aggregate child content blocks (services, portfolio items)
- Forms configured via YAML in page front matter; submissions saved to `/user/data/`

## Development Commands

```bash
./run-local.sh              # Start dev server on 127.0.0.1:8080 (clears cache first)
php bin/grav clearcache     # Clear all caches manually
php bin/grav install        # Install Grav dependencies after clone
bin/gpm install <plugin>    # Install a plugin or theme
bin/gpm update              # Update plugins/themes
composer test               # Run Codeception unit tests
composer phpstan            # Static analysis
```

## Core Constraints

- **Never edit `/system/`** — Grav core; updates will overwrite changes
- **`/cache/`, `/tmp/`, `/images/` are auto-generated** — safe to delete, never commit logic there
- **`/vendor/` is gitignored** — run `php bin/grav install` or `composer install` after clone
- **Secrets are gitignored**: `user/config/security.yaml`, `user/config/plugins/email.yaml` — use env vars in production (`GRAV_EMAIL_SMTP_*`)
- **`user/accounts/` is gitignored** — admin users stored here; never commit
- `.htaccess` blocks direct web access to `.yaml`, `.md`, `.twig`, `.log`, `.cache` — do not move these file types into web-accessible locations

## Language Rules

- All user-facing content files suffixed `.ru.md` (Russian primary)
- Config keys and PHP code in English
- YAML config values follow Grav conventions (snake_case keys)
- Twig templates use Grav's built-in filters/functions (`url()`, `page.find()`, `assets.addJs()`)

## Sensitive Areas

| Area | Risk |
|------|------|
| `user/config/security.yaml` | Contains crypto salt — must be unique per environment |
| `user/config/plugins/email.yaml` | SMTP credentials — use env vars, not plaintext |
| `.htaccess` | Security rules — test after any Apache config change |
| `user/data/forms/` | User-uploaded files — validate file types before serving |
| `logs/grav.log` | Can grow to 4 MB+; committed in this repo — avoid committing large logs |

## Safe Change Workflow

1. **Content edit**: modify `/user/pages/**/default.ru.md`, clear cache (`php bin/grav clearcache`)
2. **Config change**: edit YAML in `/user/config/`, clear cache
3. **Theme edit**: edit files in `/user/themes/quark/`, clear Twig cache
4. **Plugin config**: edit `/user/config/plugins/<plugin>.yaml`
5. **Never** modify files in `/system/` or `/vendor/`
6. After any structural page change, verify routing by running dev server

## What to Inspect First

- `user/config/system.yaml` — caching, image processing, session, Twig settings
- `user/config/site.yaml` — site title, author, language config
- `user/pages/` — existing page structure and front matter conventions
- `user/themes/quark/templates/` — Twig templates for page types
- `user/plugins/*/` — active plugin configs and blueprints

## Out of Scope

- No database migrations — flat-file only
- No CI/CD configuration present
- No frontend build pipeline (no webpack/npm)
- No automated deployment scripts beyond `run-local.sh`

## Before Finishing

- Clear cache after any content/config/template change: `php bin/grav clearcache`
- Verify `.htaccess` is intact if Apache config was touched
- Do not commit `user/accounts/`, `user/config/security.yaml`, or `user/config/plugins/email.yaml`
- Check `logs/grav.log` is not bloated before committing
