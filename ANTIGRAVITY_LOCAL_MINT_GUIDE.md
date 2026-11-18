# Antigravity Local Linux Mint Setup & GitHub Verification Guide

This guide contains exact instructions for the local **Antigravity** agent to set up **Maktab Placement** (Node.js + Express + React + MySQL) on **Linux Mint**, run it locally, and verify every new GitHub update with a structured PASS/FAIL report.

---

## Part 1: Initial Setup on Linux Mint (Run Once After Cloning)

Give this checklist to Antigravity after cloning the repository on your Linux Mint PC:

1. **Verify System Prerequisites**
   - Confirm **Node.js v20+ or v22+** (`node -v`, `npm -v`) and **Git** (`git --version`) are installed. If Node.js is missing or `< 20`, install Node.js 20 LTS or 22 LTS.
   - Check if **MySQL** or **MariaDB** is installed (`which mysql mariadb`). If missing, install MySQL Server (`sudo apt update && sudo apt install -y mysql-server`) or MariaDB (`sudo apt install -y mariadb-server`) and ensure the service is running (`sudo systemctl enable --now mysql` or `mariadb`).

2. **Create Local MySQL Database & User**
   - Create a `utf8mb4` database named `maktab_placement` and a dedicated user `maktab_user` (avoid relying on `root` `auth_socket` login from Node.js):
     ```sql
     CREATE DATABASE IF NOT EXISTS maktab_placement
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci;
     CREATE USER IF NOT EXISTS 'maktab_user'@'127.0.0.1' IDENTIFIED BY 'MaktabLocal#2026';
     CREATE USER IF NOT EXISTS 'maktab_user'@'localhost' IDENTIFIED BY 'MaktabLocal#2026';
     GRANT ALL PRIVILEGES ON maktab_placement.* TO 'maktab_user'@'127.0.0.1';
     GRANT ALL PRIVILEGES ON maktab_placement.* TO 'maktab_user'@'localhost';
     FLUSH PRIVILEGES;
     ```
   - Verify TCP connection works: `mysql -h 127.0.0.1 -P 3306 -u maktab_user -pMaktabLocal#2026 maktab_placement -e "SELECT 1;"`

3. **Create `.env` (Never Commit `.env` to Git)**
   - Generate `.env` from `.env.example` with a random `SESSION_SECRET` (`openssl rand -hex 32`):
     ```env
     PORT=3000
     NODE_ENV="production"
     APP_URL="http://localhost:3000"
     SESSION_SECRET="<generated-64-char-hex>"
     MYSQL_HOST="127.0.0.1"
     MYSQL_PORT="3306"
     MYSQL_USER="maktab_user"
     MYSQL_PASSWORD="MaktabLocal#2026"
     MYSQL_DATABASE="maktab_placement"
     UPLOAD_DIR="./private_uploads"
     ```
   - Ensure `.env` and `private_uploads/` remain gitignored (`.gitignore` already ignores `.env` and `private_uploads`).

4. **Install Dependencies, Push Schema & Build**
   ```bash
   npm install
   npm run db:push
   npm run lint
   npx tsx --test src/lib/cv-dictionary.test.ts src/lib/validation.test.ts src/lib/runtime-config.test.ts
   npm run build
   ```
   - Note: On the first API call, the server also verifies tables and seeds initial demo accounts (`Admin`, `Employee`, `Agent`), sample Saudi companies, and sample workers automatically.

5. **Start Local Server & Run Verification Suite**
   - For local hosting: `npm start` (serves compiled frontend + API on `http://localhost:3000`; use `npm run dev` if actively developing).
   - Verify:
     - `GET http://localhost:3000/api/health` returns `200 {"ok":true,...}`
     - Login succeeds for seeded accounts:
       - Admin: `admin@dhakarecruit.com` / `Admin@1234`
       - Employee: `employee@dhakarecruit.com` / `Staff@1234`
       - Agent: `agent.riyadh@aljazira.sa` / `Agent@1234`
     - `GET /api/admin/overview` works with Admin token
     - `GET /api/workers` works with Employee token
     - `GET /api/candidates` works with Agent token (returns only `PUBLISHED` workers), and `/api/files/docs/...` returns `403` for Agent role
     - Frontend loads cleanly at `http://localhost:3000` with zero browser console errors and EN/AR PDF & PNG CV downloads work.

---

## Part 2: Routine Check After Every `git pull` From GitHub

Whenever new code is pushed to GitHub, instruct Antigravity to run:

1. Check local git status and pull latest commits (`git pull --ff-only`).
2. If `package.json` or lockfile changed, run `npm install`.
3. If `src/db/schema.ts` changed, run `npm run db:push` (report if any destructive column change requires manual confirmation before proceeding).
4. Run full checks:
   - `npm run lint` (`tsc --noEmit`)
   - `npx tsx --test src/lib/cv-dictionary.test.ts src/lib/validation.test.ts src/lib/runtime-config.test.ts`
   - `npm run build`
5. Restart the local app (`npm start` or `pm2 restart maktab-placement` if managed by PM2), then smoke-test:
   - `GET /api/health`
   - `POST /api/auth/login` + role endpoints (`/api/admin/overview`, `/api/workers`, `/api/candidates`)
   - Browser check on `http://localhost:3000` (console errors, network failures, and any newly added feature).
6. Output a concise **Verification Report**:
   - **Overall Status:** `SUCCESS` or `FAILED`
   - **Commits Pulled:** commit hashes & summary
   - **Check Table:** TypeScript Lint, Unit Tests, Production Build, MySQL Sync, Server Health, Auth & RBAC Smoke Tests, UI/Browser Check
   - **Findings / Errors:** Exact command, error message, file/line if anything failed, or confirmation that everything is running cleanly on `http://localhost:3000`.
