# Alitar Insights - Production Deployment Guide

## Pre-requisites

### Namecheap Configuration

1. **Node.js Version**: Must be 14+ (current: 10.24.1 is too old)
   - Go to cPanel → Software → Setup Node.js App
   - Change Node.js version to 18.x or 20.x LTS

2. **MySQL Database**
   - Create database in cPanel → MySQL Databases
   - Database name: `alitbedb_insights` (or your preferred name)
   - Create user with full privileges

---

## Step 1: Database Setup

### 1.1 Create Database (cPanel)

1. Go to cPanel → MySQL Databases
2. Create new database: `alitbedb_insights`
3. Create new user: `alitbedb_insights_user`
4. Add user to database with ALL PRIVILEGES

### 1.2 Run Migration

Via cPanel Terminal or SSH:

```bash
cd /home/alitbedb/apps/insights
source /home/alitbedb/nodevenv/apps/insights/18/bin/activate
mysql -u alitbedb_insights_user -p alitbedb_insights < database/migrations/001_initial_schema.sql
```

### 1.3 Configure .env

Create `.env` file in `/home/alitbedb/apps/insights/`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=alitbedb_insights_user
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_NAME=alitbedb_insights
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=production

# Shiller Data Source
SHILLER_DATA_URL=http://www.econ.yale.edu/~shiller/data/ie_data.xls
```

### 1.4 Seed and Snapshot

```bash
cd /home/alitbedb/apps/insights
source /home/alitbedb/nodevenv/apps/insights/18/bin/activate
npm run seed
npm run snapshot -- --slug spx_price_monthly
npm run snapshot -- --slug spx_pe_monthly
```

---

## Step 2: GitHub Actions for Auto-Deploy

### 2.1 Create FTP Credentials (Namecheap)

1. Go to cPanel → FTP Accounts
2. Create new FTP account:
   - Username: `deploy@alitar.one` (or similar)
   - Directory: `/home/alitbedb/apps/insights`
   - Quota: Unlimited
3. Note the FTP server: usually `ftp.alitar.one` or IP address

### 2.2 Add GitHub Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
- `FTP_SERVER`: Your FTP server (e.g., `ftp.alitar.one`)
- `FTP_USERNAME`: FTP username (e.g., `deploy@alitar.one`)
- `FTP_PASSWORD`: FTP password

### 2.3 GitHub Actions Workflow

Create `.github/workflows/deploy.yml` (already included in this repo)

---

## Step 3: Cron Job for Data Updates

### 3.1 Configure Cron (cPanel)

1. Go to cPanel → Cron Jobs
2. Add new cron job:

**Daily update at 3:00 AM (server time):**

- Minute: `0`
- Hour: `3`
- Day: `*`
- Month: `*`
- Weekday: `*`
- Command:
```bash
cd /home/alitbedb/apps/insights && /home/alitbedb/nodevenv/apps/insights/18/bin/node backend/cron/update-all.js >> /home/alitbedb/logs/insights-update.log 2>&1
```

### 3.2 Create Logs Directory

```bash
mkdir -p /home/alitbedb/logs
```

---

## Step 4: Verify Deployment

1. Visit: `https://alitar.one/insights`
2. Should redirect to: `https://alitar.one/insights/sp500-crash-radar`
3. Check health: `https://alitar.one/insights/health`
4. Verify chart loads with data
5. Test language switching (EN/PT)
6. Test crisis selection and URL updates

---

## Troubleshooting

### App Not Starting
- Check Node.js version (must be 14+)
- Check `.env` file exists and has correct values
- Check logs in cPanel Node.js App

### Database Connection Failed
- Verify database credentials in `.env`
- Check user has correct privileges
- Ensure database exists

### No Data on Chart
- Run snapshots manually
- Check `ingestion_runs` table for errors
- Verify Shiller URL is accessible

### Cron Not Running
- Check cron syntax
- Verify full paths in command
- Check `/home/alitbedb/logs/insights-update.log` for errors

---

## Maintenance

### Manual Data Update
```bash
cd /home/alitbedb/apps/insights
source /home/alitbedb/nodevenv/apps/insights/18/bin/activate
npm run update-all
```

### View Logs
```bash
tail -100 /home/alitbedb/logs/insights-update.log
```

### Restart Application
- Via cPanel → Setup Node.js App → Click "Restart"
- Or via SSH: `touch /home/alitbedb/apps/insights/tmp/restart.txt`
