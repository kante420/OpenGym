# OpenGym 🏋️‍♂️

> Open-source, multi-tenant gym management platform built for modern sports centers, martial arts dojos, and personal training studios.

OpenGym lets gym owners launch and manage their entire facility under their own slug or domain (`yourdomain.com/<gym-slug>`). Features member management, attendance, billing with VAT and downloadable/emailed PDF receipts, class scheduling by zones, interactive workout builder with real-time coach presenter mode, student progress tracking, custom gym color branding, and automated secure backups.

Designed with strict multi-tenancy and data isolation enforced directly at the Postgres database level with Row-Level Security (RLS).

---

## 🌟 Key Highlights & Architecture

- **Multi-Tenant with Strict Data Isolation:** Every gym has its own isolated data workspace partitioned by `gym_id` and enforced by Postgres Row-Level Security (RLS) policies.
- **Role-Based Portals:**
  - **Gym Administrator (`/<slug>/admin`):** Comprehensive center control: member profiles, memberships & recurring billing, PDF receipt dispatch, class schedules, physical zones, custom branding (logo & color themes), and custom SMTP settings.
  - **Coach (`/<slug>/coach`):** Workout designer, live session attendance logger, student performance tracker, exercise catalog manager, and fullscreen workout presenter for TV screens.
  - **Member (`/<slug>/me`):** Personal portal to view upcoming weekly sessions, class timetable, historical exercise weight marks, body weight / body fat progress graphs, and past receipts.
- **Modern Tech Stack:**
  - **Next.js 16** (App Router & Server Actions)
  - **React 19**
  - **Tailwind CSS 4**
  - **TypeScript**
  - **Supabase** (Auth & PostgreSQL with custom PL/pgSQL functions + RLS)
  - **Cloudflare Turnstile** (Smart anti-bot protection on onboarding)
  - **Nodemailer / Resend** (Dual email layer with AES-256-GCM encrypted credentials)

---

## 🚀 Features

### 🏢 Multi-Tenant Gym Onboarding
- Self-service onboarding (`/crear-gimnasio`): Anti-bot verification (Cloudflare Turnstile + honeypot + timing analysis + rate limits by IP and email hash).
- Secure token-based email activation link (`/verificar?token=...`).
- Automatic generation of the gym's administrator account and default system catalog.

### 🎨 Custom Branding & Visual Identity
- **Logo Upload:** PNG, JPG, or WebP validation, resized client/server side, seamlessly embedded in menus, login pages, and generated PDF receipts.
- **Custom Color Themes:** Real-time dynamic theme engine customizable from the Admin Settings. Admins can select presets such as:
  - *Gold & Bronze* (Classic Amber)
  - *Electric Blue & Ocean*
  - *Emerald Green*
  - *Crimson Fire & Red*
  - *Neon Violet & Purple*
  - *Arctic Cyan & Turquoise*
  *(Applies custom gradients to accent buttons, focus states, chips, progress bars, and TV presenter mode).*

### 📋 Routine Designer & Live Workout Presenter
- **Interactive Block Builder:** Organize sessions into warm-up, strength, technique, conditioning, or cooldown blocks with target sets and reps.
- **Exercise Catalog Auto-Sync:** Type any new exercise name during routine creation, and it will be automatically registered into the gym's reusable catalog upon saving.
- **History & Routine Reusability:** Dedicated routine history with live search and filters. Easily duplicate and reassign any past routine to another class or date, with an immediate "Assign & Edit" option.
- **Reopen Completed Workouts:** Allows coaches to remove the completed status check on a routine (e.g., if a member trained early at 12:00, the coach can reopen it for the main 17:30 group without losing any saved marks).
- **Big-Screen Presenter Mode (`/<slug>/present/<id>`):** Fullscreen display mode with high contrast for TV/projector screens in the gym box. Includes student weight logging and personal record tracking.

### 💳 Billing, Invoicing & Financial Export
- Natural month billing cycle.
- Built-in VAT configuration (configurable percentage and gross/net pricing).
- Payment methods: Cash, Bizum, Bank Transfer.
- Automatic consecutive receipt number generation.
- Client PDF receipt download and automated email dispatch with PDF attachment.
- CSV Financial Export with anti-formula injection sanitization for accounting software and Excel.

### 🛡️ Hardened Security
- **Defense in Depth:** Authenticated user permissions verified both at the Next.js Server Action / Page level and at the database level with PostgreSQL RLS and column-level update grants.
- **Credential Encryption:** Gym-specific SMTP passwords are encrypted using **AES-256-GCM** using `SECRETS_KEY` before saving to database.
- **Brute-Force & Enumeration Protection:** Rate-limiting table tracking IP hashes and identifiers prevents password spraying and user enumeration on login.
- **Security Headers & CSP:** Hardened `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`.

---

## 📦 Getting Started

### Prerequisites
- **Node.js:** v20.9 or higher (Node 22 recommended)
- **Supabase Account:** Free tier supported
- **Email Provider:** Gmail (with App Password), standard SMTP, or Resend API

---

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/kante420/OpenGym.git
cd open-gym
npm install
```

---

### Step 2: Supabase Database Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Run the migration scripts in `supabase/migrations/` in numerical order:
   - `0000_base_schema.sql`
   - `0001_hardening_and_features.sql`
   - `0002_billing_first_of_month.sql`
   - `0003_platform.sql`
   - `0004_branding_mail_owner_tools.sql`
   - `0005_login_attempts.sql`
   - `0006_gym_color_theme.sql`
4. **Configure Authentication:**
   - Go to **Authentication** ➔ **Sign In / Providers** ➔ **Email**:
     - Keep **Email** enabled.
     - **Disable "Allow new users to sign up"** (all accounts are securely provisioned by the application backend).
     - **Disable "Confirm email"** (email confirmation is managed directly by OpenGym's onboarding flow).
5. **Create your Platform Superadmin User:**
   - In Supabase ➔ **Authentication** ➔ **Users** ➔ **Add user**:
     - Provide your personal email and a strong password.
     - Check **Auto Confirm User**.

---

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your configuration:

```env
# ── Supabase ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ── Platform URL ────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ── Platform Owner Email(s) ─────────────────────────────────────────────
# Comma-separated list of emails authorized for system management
SUPERADMIN_EMAILS=your-admin-email@example.com

# ── Encryption Key (for storing gym SMTP secrets) ───────────────────────
# 64-character hex key (generate with: openssl rand -hex 32)
SECRETS_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# ── Cloudflare Turnstile (Anti-Bot) ─────────────────────────────────────
# In local development, you can set ALLOW_SIGNUP_WITHOUT_CAPTCHA=true
NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY=
CF_TURNSTILE_SECRET_KEY=
ALLOW_SIGNUP_WITHOUT_CAPTCHA=true

# ── Platform Outbound Email (Gmail SMTP or Resend) ──────────────────────
# Required for account confirmation emails and password recovery fallback
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-gmail-app-password
SMTP_FROM="OpenGym <your-email@gmail.com>"

# Alternatively, using Resend:
# RESEND_API_KEY=re_123456789
# RESEND_FROM="OpenGym <onboarding@resend.dev>"
```

---

### Step 4: Run Locally

```bash
# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

- Visit `http://localhost:3000/crear-gimnasio` to create your first gym.

---

## 🧪 Testing and Quality Assurance

```bash
# Type checking
npm run typecheck

# Code style & Linting
npm run lint

# Production build verification
npm run build
```

SQL behavior and security isolation test fixtures are located in `supabase/tests/`. Refer to [supabase/tests/README.md](file:///c:/Users/hugoc/Music/open-gym/supabase/tests/README.md) for details on running unit tests against PostgreSQL.

---

## ⚙️ Automated GitHub Actions

The repository includes pre-configured GitHub Workflows (`.github/workflows/`):

1. **Continuous Integration (`ci.yml`):**
   - Automatically runs `npm ci`, `npm run lint`, `npm run typecheck`, and test production compilation on every push and PR.
2. **Encrypted Database Backup (`backup.yml`):**
   - Runs daily at 03:30 UTC. Dumps both `public` and `auth` schemas via Docker `pg_dump`, encrypts the dump with AES-256-CBC via OpenSSL using your secret passphrase, and stores it as a private workflow artifact (14-day retention).
   - *Requires Repository Secrets:* `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE`.
3. **Keep-Alive Ping (`keepalive.yml`):**
   - Calls `/api/health` daily to prevent free-tier Supabase projects from pausing due to inactivity.
   - *Requires Repository Variable:* `SITE_URL`.

---

## 🔒 Security Best Practices

- **Never expose `SUPABASE_SERVICE_ROLE_KEY` or `SECRETS_KEY`** to client-side bundles or public repositories.
- When configuring Gmail SMTP, always create a designated **Google App Password** (`myaccount.google.com/apppasswords`) with 2-Step Verification enabled; do not use your primary Google account password.
- Run database backups periodically and securely store your `BACKUP_PASSPHRASE`.

---

## 📄 License

This project is licensed under the terms of the MIT License. See [LICENSE](LICENSE) for details.
