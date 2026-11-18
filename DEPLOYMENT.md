# Portable MySQL Deployment Guide (Hostinger Unlimited, VPS, Docker, Railway, Cloud)

This application is a standard **Node.js + Express + React (Vite) + MySQL / MariaDB** application with **zero vendor lock-in**. You can deploy it directly on **Hostinger Unlimited (Node.js + MySQL)** and transfer it anytime to any **VPS (Ubuntu + PM2 + Nginx)**, **Docker**, **Railway**, **Render**, or **Cloud MySQL**.

## 1. Requirements on Any Host
- **Node.js**: v20 LTS or v22 LTS
- **Database**: **MySQL 8.0+** or **MariaDB 10.6+** (configured via `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` or `DATABASE_URL=mysql://...`)
- **Persistent Disk Directory**: Local filesystem folder for `UPLOAD_DIR` (defaults to `./private_uploads`)

## 2. Build & Run Commands (Universal)
```bash
# 1. Install dependencies
npm install

# 2. Build frontend (dist/) + standalone Node server (dist/server.mjs)
npm run build

# 3. (Optional) Push schema via Drizzle OR import mysql/schema.sql in phpMyAdmin
# Note: The server also creates missing MySQL tables & seed data automatically on first API request.
npm run db:push

# 4. Start production server (pure Node, no devDependencies required)
npm start
```
Health check endpoint: `GET /api/health` -> `{ "ok": true, ... }`

## 3. Deploying on Hostinger Unlimited (Node.js + MySQL)
1. In **Hostinger hPanel -> Databases -> Management**, create a MySQL database and copy your **MySQL Database Name, Username, Password, and Host (`127.0.0.1` or `localhost`)**.
2. In **Hostinger Node.js** manager:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Add environment variables from `.env.example`:
   - `NODE_ENV=production`
   - `SESSION_SECRET=<random-64-char-string>`
   - `MYSQL_HOST=127.0.0.1`
   - `MYSQL_PORT=3306`
   - `MYSQL_USER=<your-hostinger-mysql-user>`
   - `MYSQL_PASSWORD=<your-hostinger-mysql-password>`
   - `MYSQL_DATABASE=<your-hostinger-mysql-database>`
   - `UPLOAD_DIR=/home/<user>/maktab_uploads` (recommended outside the deployment folder so updates keep uploaded photos and compliance files)
4. On first startup, the app creates the MySQL tables automatically (or you can import `mysql/schema.sql` in phpMyAdmin) and seeds the initial demo accounts.

## 4. Transferring to Another Host Later
Because there is no Hostinger-specific code, moving to any other hosting takes three steps:
1. Export your MySQL database (`mysqldump` or phpMyAdmin export) and import it on the new host.
2. Copy your `UPLOAD_DIR` (`private_uploads/`) directory to the new server.
3. Update `.env` (`MYSQL_*` or `DATABASE_URL`, `UPLOAD_DIR`, `APP_URL`) and run `npm run build && npm start`.
