# Alitar Insights - Production Deployment Guide

## Overview

This application uses **automated deployment** via GitHub Actions. When you push to `main`, the app is automatically deployed to Namecheap via FTP. On first startup, the app automatically:

1. Creates database tables (migrations)
2. Seeds initial series definitions
3. Downloads historical data (snapshot)

---

## Namecheap Configuration

| Setting | Value |
|---------|-------|
| Node.js version | 22.x (or 18.x+) |
| Application root | `apps/insights` |
| Application URL | `alitar.one/insights` |
| Startup file | `backend/src/app.js` |

---

## Setup Steps

### 1. Create MySQL Database (cPanel)

1. Go to cPanel > MySQL Databases
2. Create new database (e.g., `alitbedb_insights`)
3. Create new user (e.g., `alitbedb_user`)
4. Add user to database with **ALL PRIVILEGES**

### 2. Configure GitHub Secrets

Go to: **https://github.com/draeden79/insights/settings/secrets/actions**

Add these repository secrets:

| Secret | Description | Example |
|--------|-------------|---------|
| `FTP_SERVER` | Namecheap FTP server | `ftp.alitar.one` |
| `FTP_USERNAME` | FTP username | `deploy@alitar.one` |
| `FTP_PASSWORD` | FTP password | `***` |
| `DB_HOST` | Database host | `localhost` |
| `DB_USER` | Database user | `alitbedb_user` |
| `DB_PASSWORD` | Database password | `***` |
| `DB_NAME` | Database name | `alitbedb_insights` |

### 3. Create FTP Account (cPanel)

1. Go to cPanel > FTP Accounts
2. Create new FTP account
3. Set directory to: `/home/alitbedb/apps/insights`
4. Use these credentials for `FTP_USERNAME` and `FTP_PASSWORD`

### 4. First Deploy

1. Push any change to `main` branch
2. GitHub Actions will deploy automatically
3. In cPanel terminal, run once:
   ```bash
   source /home/alitbedb/nodevenv/apps/insights/22/bin/activate
   cd /home/alitbedb/apps/insights
   npm install
   ```
4. Restart the app in cPanel > Setup Node.js App

The app will automatically create tables, seed data, and download historical prices on first startup.

### 5. Configure Cron Job (cPanel)

Go to cPanel > Cron Jobs and add:

**Daily update at 3:00 AM:**

```
0 3 * * * source /home/alitbedb/nodevenv/apps/insights/22/bin/activate && cd /home/alitbedb/apps/insights && node backend/cron/update-all.js >> /home/alitbedb/logs/insights-cron.log 2>&1
```

Create logs directory:
```bash
mkdir -p /home/alitbedb/logs
```

---

## Verification

After deployment, verify:

- [ ] `https://alitar.one/insights` redirects to `/insights/sp500-crash-radar`
- [ ] `https://alitar.one/insights/health` returns status OK
- [ ] Chart loads with historical data
- [ ] Language switching works (EN/PT)
- [ ] Crisis selection updates URL

---

## Troubleshooting

### App Not Starting

1. Check Node.js version (must be 14+)
2. Verify `.env` was created (check via FTP)
3. Check app logs in cPanel

### Database Connection Failed

1. Verify GitHub secrets are correct
2. Check database user has privileges
3. Test connection via cPanel terminal

### No Data on Chart

1. Check app logs for setup errors
2. Verify `series_points` table has data
3. Run manual snapshot if needed:
   ```bash
   npm run snapshot -- --slug spx_price_monthly
   ```

### Cron Not Running

1. **Use the correct command** — cron must run `backend/cron/update-all.js` (not `incremental-update.js`):
   ```
   0 3 * * * source /home/alitbedb/nodevenv/apps/insights/22/bin/activate && cd /home/alitbedb/apps/insights && node backend/cron/update-all.js 2>&1 | tee -a /home/alitbedb/logs/insights-cron.log
   ```
2. Check cron syntax in cPanel
3. Verify paths (nodevenv, apps/insights, logs) exist
4. Check log file: `tail -50 /home/alitbedb/logs/insights-cron.log`
5. Test from SSH (same command as cron) to see errors in the terminal

---

## Manual Operations

### Update Data Manually
```bash
source /home/alitbedb/nodevenv/apps/insights/22/bin/activate
cd /home/alitbedb/apps/insights
npm run update-all
```

### Restart Application
- Via cPanel > Setup Node.js App > Restart
- Or: `touch /home/alitbedb/apps/insights/tmp/restart.txt`

### View Logs
```bash
# App logs (in cPanel Node.js app interface)
# Cron logs
tail -100 /home/alitbedb/logs/insights-cron.log
```

---

## Architecture

```
GitHub (push to main)
        |
        v
GitHub Actions (deploy.yml)
        |
        ├── Create .env from secrets
        └── FTP upload to /apps/insights/
                |
                v
        Namecheap Server
                |
                ├── npm install (manual, once)
                └── App startup (automatic)
                        |
                        ├── runMigrations() - creates tables
                        ├── runSeedIfNeeded() - creates series
                        └── runSnapshotIfNeeded() - downloads data
```
