# Security Review: Grav CMS (litrep) — Public Repository Readiness

This document is a security-focused code review to prepare the project for publication as a public GitHub repository. **Do not publish this file if it still contains redacted snippets that could aid attackers; use it locally to fix issues, then optionally remove or generalize it.**

---

## A) Findings Table

| # | File path | Location (lines / identifier) | Severity | Risk | Remediation |
|---|-----------|--------------------------------|----------|------|-------------|
| 1 | `user/config/plugins/email.yaml` | Lines 2–4, 21–25: `from`, `to`, `smtp.user`, `smtp.password` | **Critical** | Real SMTP credentials (Mail.ru) in plain text. Anyone with repo access can send email as you or abuse the account; password is reusable elsewhere. | Remove file from tracking; replace with `user/config/plugins/email.yaml.example` (see section C). Load real values from environment (e.g. `GRAV_EMAIL_FROM`, `GRAV_EMAIL_SMTP_PASSWORD`) or from a gitignored local override. **Rotate the exposed SMTP password immediately.** |
| 2 | `user/plugins/email.yaml` | Lines 2–4, 22–24: same SMTP user/password, different `to` | **Critical** | Duplicate of above; same password and sender. | Delete this file if it is a duplicate of config (Grav typically uses `user/config/plugins/email.yaml`). Ensure only example config is committed. |
| 3 | `user/config/security.yaml` | Line 1: `salt: <redacted>` | **Critical** | Salt used for hashing/tokens. If exposed, session/cookie forgery and token prediction become easier. | Stop tracking this file; use `security.yaml.example` with placeholder salt. Generate a new random salt per environment and keep it in a local, gitignored file or env. |
| 4 | `user/accounts/*.yaml` (kemuri, localadmin, stand) | Full files: `email`, `fullname`, `hashed_password` | **High** | User accounts with bcrypt hashes and real emails. Hashes can be brute-forced; emails are PII. | `.gitignore` already lists `user/accounts/`; ensure these files are **never** committed. If already in history, remove with `git filter-repo` or BFG and force-push; then regenerate user accounts and passwords. |
| 5 | `user/config/site.yaml` | Line 5: author `email` | **Medium** | Author email is PII; can be harvested for spam/phishing. | Use a generic placeholder in committed config (e.g. `author@example.com`) or load from env; keep real value in local override only. |
| 6 | `docs/DEPLOY-UBUNTU24.md` | Certbot command with `--email` | **Medium** | PII in documentation; copy-paste would expose your email. | Replace with placeholder: `--email your-email@example.com` and add a note: “Подставьте свой email”. |
| 7 | `user/config/plugins/form.yaml` | Lines 44–46: `site_key: ''`, `secret_key: ''` | **Low** | reCAPTCHA keys (empty placeholders). If ever filled and committed, secret_key is sensitive. | Keep placeholders; document in README that reCAPTCHA keys go in local config or env. |
| 8 | `user/pages/08.kontakty/01.forma-svyazi/form.md` | Line 58: `to: ['expoland@mail.ru', 'stand@expoland-group.ru']` | **Low** | Form recipient emails (business). | Prefer config or env for recipient list; or accept as public business contact if you are comfortable. |
| 9 | `user/pages/08.kontakty/default.ru.md` | Phones, emails, addresses, Telegram links | **Low** | Business contact info and real addresses/phones. | If this is intentional public contact info, no change. Otherwise, move to config or env and use placeholders in repo. |
| 10 | `user/themes/quark/templates/contacts.html.twig` | Lines 83, 90: `yandex_api_key` from config | **Low** | API key loaded from config (not hardcoded). | Ensure `yandex_api_key` is only set in non-committed config or env; document in README. |
| 11 | `user/data/licenses.yaml` | Empty file in `user/data/` | **Low** | `user/data/` should be gitignored; avoid committing runtime data. | Confirm `user/data/` is in `.gitignore`; do not commit licenses or other data here. |
| 12 | Plugin READMEs (e.g. `user/plugins/login/README.md`, `user/plugins/email/README.md`) | Example emails/passwords in docs | **Low** | Example credentials in upstream plugin docs. | No change for upstream; if you maintain a fork, keep only generic examples (e.g. `user@example.com`). |

---

## B) Proposed .gitignore (Grav CMS–tailored)

Use this in the **Grav app root** (e.g. `litrep/.gitignore`). It keeps cache, logs, accounts, data, and secrets out of the repo.

```gitignore
# ============================================
# Grav runtime (regenerated / sensitive)
# ============================================
cache/
logs/
tmp/
backup/
assets/

# User data: accounts, form submissions, uploads, licenses, logs
user/accounts/
user/data/

# Composer
vendor/
composer.phar

# ============================================
# Sensitive config (use *.example instead)
# ============================================
# Uncomment if you keep local overrides here:
# user/config/security.yaml
# user/config/plugins/email.yaml
# user/config/site.yaml

# Environment & local overrides
.env
.env.local
.env.*.local
php.ini.local
.htaccess.local

# ============================================
# Archives & binaries
# ============================================
*.zip
*.tar
*.tar.gz
*.gz
*.rar
*.7z

# ============================================
# OS & editor
# ============================================
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini
.vscode/
.idea/
*.swp
*.swo
*~
.project
.classpath
.settings/
*.sublime-*

# ============================================
# Logs & temp
# ============================================
*.log
*.log.*
*.tmp
*.temp
*.cache
*.bak
*.backup

# ============================================
# Node (if used)
# ============================================
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# ============================================
# Build / local
# ============================================
*.phar
dist/
build/
.dockerignore
Dockerfile.local
```

**Optional (if you want to never commit live secrets even by mistake):**  
Add explicit entries so that only example files are tracked, e.g.:

```gitignore
# Allow only example configs to be committed
user/config/security.yaml
user/config/plugins/email.yaml
!user/config/security.yaml.example
!user/config/plugins/email.yaml.example
```

Then keep real `security.yaml` and `email.yaml` only locally (or in env-driven config).

---

## C) Recommended File Changes (patch-style)

### 1. Stop tracking and replace `user/config/plugins/email.yaml`

- **Remove from index but keep locally (so you can copy to .example):**
  ```bash
  git rm --cached user/config/plugins/email.yaml
  git rm --cached user/plugins/email.yaml   # if it exists and is duplicate
  ```
- **Add** `user/config/plugins/email.yaml.example` with placeholders (see “Example configs” below).
- **Document:** In README, state that `email.yaml` must be created from the example and that `from`, `to`, `smtp.user`, and `smtp.password` can come from env (e.g. `GRAV_EMAIL_SMTP_PASSWORD`).

### 2. Stop tracking and replace `user/config/security.yaml`

- **Remove from index:**
  ```bash
  git rm --cached user/config/security.yaml
  ```
- **Add** `user/config/security.yaml.example` with `salt: CHANGE_ME_GENERATE_RANDOM_SALT`.
- **Document:** Generate a new salt (e.g. `openssl rand -base64 16`) and put it only in local `security.yaml` or in env.

### 3. Sanitize `user/config/site.yaml`

- Replace author email with a placeholder:
  ```yaml
  author:
    name: litrep
    email: author@example.com
  ```
- Or load from env in your deployment and keep a minimal committed `site.yaml` with placeholder.

### 4. Sanitize `docs/DEPLOY-UBUNTU24.md`

- Replace line 127 / certbot block:
  - Change the real author/certbot email to a placeholder, e.g. `your-email@example.com`.
  - Add a short note: “Подставьте свой email для получения уведомлений Let's Encrypt.”

### 5. Ensure `user/accounts/` is never committed

- Confirm `user/accounts/` is in `.gitignore` (already is).
- If any `user/accounts/*.yaml` were ever committed, **do not** just delete the files and commit—they remain in history. Use:
  - `git filter-repo --path user/accounts/ --invert-paths` (or BFG), then force-push, **or**
  - Create a fresh repo with only safe history and re-add the project.
- After cleaning history, recreate admin users and passwords.

### 6. Form and contact pages

- **form.md:** If you want to hide recipient emails, move `to` to config (e.g. `config.plugins.form.recipients`) or env and reference that in the form; otherwise leave as-is if these are public business addresses.
- **default.ru.md:** If contact details are intentional public info, no change; else move to config/placeholders.

### Next steps (before first push to a public repo)

1. **Untrack sensitive config** (keeps local files, stops committing them):
   ```bash
   git rm --cached user/config/plugins/email.yaml user/config/security.yaml
   # If you have user/plugins/email.yaml as a duplicate:
   git rm --cached user/plugins/email.yaml
   ```
2. **Rotate the SMTP password** that was in the repo; use the new password only in local `email.yaml` or env.
3. **If user/accounts/*.yaml were ever committed:** Use `git filter-repo` or BFG to remove them from history, then force-push and recreate users.
4. **Optional:** Add a CI job (e.g. Gitleaks or TruffleHog) to scan for secrets on push.

---

## D) Final “Ready to publish?” checklist

- [ ] **Secrets removed from working tree:** No `user/config/plugins/email.yaml` or `user/plugins/email.yaml` with real passwords; no `user/config/security.yaml` with real salt in the repo.
- [ ] **Example configs committed:** `user/config/plugins/email.yaml.example`, `user/config/security.yaml.example` (and optionally `site.yaml.example`) with placeholders only.
- [ ] **.gitignore:** Includes `user/accounts/`, `user/data/`, `cache/`, `logs/`, `backup/`, `.env*`; optionally explicit ignore of live `security.yaml` and `email.yaml`.
- [ ] **PII reduced:** Author and certbot emails in docs/config use placeholders; real values only in local or env.
- [ ] **Git history:** If secrets or accounts were ever committed, history rewritten (e.g. `git filter-repo`) and secrets rotated.
- [ ] **SECURITY.md:** Present with instructions for reporting vulnerabilities (see below).
- [ ] **README “Setup (safe)”:** Describes required env vars and how to create local config from examples.
- [ ] **Pre-commit or CI:** Optional but recommended: secret scanning (e.g. Gitleaks, TruffleHog) in CI or pre-commit to prevent re-introduction of secrets.
- [ ] **SMTP password rotated:** Because it appeared in plain text in the repo, rotate the Mail.ru SMTP password and use the new one only in a secure, non-committed config or env.

---

## Grav-specific: What to commit

| Path | Safe to commit? | Notes |
|------|------------------|--------|
| **system/** | Yes | Core Grav; no secrets if you don’t add them. |
| **user/themes/** | Yes | Theme code and assets; no credentials in templates (only references to config, e.g. `yandex_api_key`). |
| **user/plugins/** | Yes | Plugin code; config with secrets lives in `user/config/plugins/`, not here. Remove any `user/plugins/email.yaml` if it duplicates config. |
| **user/pages/** | Yes, with care | Content and frontmatter; replace or move real emails/phones/addresses if you don’t want them public. |
| **user/config/** | Partial | Commit only example configs (e.g. `*.yaml.example`). Do **not** commit live `security.yaml`, `plugins/email.yaml`, or any file containing secrets. |
| **user/accounts/** | **No** | Must be gitignored; contains hashed passwords and PII. |
| **user/data/** | **No** | Forms, logs, cache, backups, uploads—runtime/sensitive. |
| **cache/**, **logs/**, **tmp/**, **backup/** | **No** | Runtime; always gitignore. |

---

*End of security review. Use this document to fix findings, then rotate any exposed credentials and re-check the checklist before making the repository public.*
