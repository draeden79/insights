# Alitar Financial Explorer

A lightweight financial data analysis platform for publishing on **alitar.one**, featuring financial dashboards and updated analyses accessible publicly.

## Features

- **Data Consolidation Layer**: Extracts time series from public sources, standardizes them, stores in MySQL with metadata, and updates via scheduled routines (preferably incremental)
- **Presentation Layer**: HTML/CSS/JS frontend (no framework), Node.js backend (Express), minimalist and elegant UI with multiple sections
- **Bubble Roadmap Analysis**: Compares current S&P 500 trajectory (level and P/E) with historical pre-crisis periods (1929, 2001, 2008) using temporal alignment and scaling factors

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: HTML + CSS + Vanilla JavaScript (no React/Vue)
- **Charts**: Chart.js (via CDN)
- **Data Source**: Robert Shiller's Irrational Exuberance dataset

## Project Structure

```
alitar-financial-explorer/
├── backend/
│   ├── src/
│   │   ├── db/              # Database connection and migrations
│   │   ├── models/          # Data models
│   │   ├── services/        # Business logic
│   │   │   ├── ingestion/   # Data ingestion services
│   │   │   └── analysis/    # Analysis services
│   │   ├── routes/          # API routes
│   │   └── app.js           # Express app entry point
│   ├── scripts/             # CLI scripts for data management
│   └── cron/                # Scheduled update scripts
├── frontend/
│   ├── index.html           # Main HTML file
│   ├── styles/              # CSS files
│   └── js/                  # JavaScript files
├── database/
│   └── migrations/          # SQL migration files
└── package.json
```

## Documentation

* **[URL Structure (Insights)](docs/URL-STRUCTURE.md)** — Naming and URL spec for public insights (`/insights/{insight_slug}`).

## Local Setup

### Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose (for MySQL)
- npm or yarn

### Quick Start (Recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run setup script** (automatically sets up MySQL, migrations, seed, and snapshots):
   
   **On Windows (PowerShell):**
   ```powershell
   .\scripts\setup-dev.ps1
   ```
   
   **On Linux/Mac:**
   ```bash
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   ```
   
   **Or using Node.js (cross-platform):**
   ```bash
   node scripts/setup-dev.js
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

### Manual Setup (Alternative)

If you prefer to set up MySQL manually:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start MySQL with Docker:**
   ```bash
   npm run docker:up
   ```
   
   Or manually:
   ```bash
   docker-compose up -d mysql
   ```

3. **Configure environment:**
   The `.env` file is already configured for Docker MySQL. If using a local MySQL installation, edit `.env`:
   ```env
   DB_HOST=localhost
   DB_USER=alitar_user
   DB_PASSWORD=alitar_password
   DB_NAME=alitar_financial
   DB_PORT=3306
   ```

4. **Run migrations:**
   ```bash
   docker exec -i alitar-financial-mysql mysql -u root -prootpassword alitar_financial < database/migrations/001_initial_schema.sql
   ```

5. **Seed initial series:**
   ```bash
   npm run seed
   ```

6. **Run initial snapshots:**
   ```bash
   npm run snapshot -- --slug spx_price_monthly
   npm run snapshot -- --slug spx_pe_monthly
   ```

7. **Start the server:**
   ```bash
   npm start
   ```

### Docker Commands

- Start MySQL: `npm run docker:up` or `docker-compose up -d mysql`
- Stop MySQL: `npm run docker:down` or `docker-compose down`
- View MySQL logs: `npm run docker:logs` or `docker-compose logs -f mysql`

## Data Management Scripts

### Snapshot (Full Backfill)
Download all data for a series:
```bash
npm run snapshot -- --slug spx_price_monthly
```

### Incremental Update
Update only new data points:
```bash
npm run incremental -- --slug spx_price_monthly
```

### Reset Series
Delete all points and re-download:
```bash
npm run reset -- --slug spx_price_monthly
```

### Update All Series
Update all active series incrementally (for cron):
```bash
npm run update-all
```

## API Endpoints

### `GET /api/series/:slug`
Get series data points with optional date range.

**Query Parameters:**
- `from` (optional): Start date in YYYY-MM format
- `to` (optional): End date in YYYY-MM format

**Example:**
```bash
curl "http://localhost:3000/api/series/spx_price_monthly?from=2020-01&to=2024-12"
```

### `GET /api/analysis/bubble-roadmap`
Compute bubble roadmap analysis.

**Query Parameters:**
- `metric` (required): `price` or `pe`
- `window` (optional): Number of months (default: 60)
- `shift` (optional): Max shift months for alignment (default: 12)

**Example:**
```bash
curl "http://localhost:3000/api/analysis/bubble-roadmap?metric=price&window=60&shift=12"
```

### `GET /health`
Health check endpoint.

**Example:**
```bash
curl "http://localhost:3000/health"
```

## Deploy on Namecheap

### Prerequisites

- Namecheap hosting with cPanel access
- MySQL database access
- Node.js support (via cPanel Node.js App or VPS)

### Step-by-Step Deployment

#### 1. Create MySQL Database

1. Log into cPanel
2. Navigate to **MySQL Databases**
3. Create a new database: `alitar_financial`
4. Create a new MySQL user
5. Add user to database with **ALL PRIVILEGES**
6. Note down database name, username, and password

#### 2. Upload Project Files

Upload all project files to your hosting directory (e.g., `public_html/alitar-financial` or a subdirectory).

**Via cPanel File Manager:**
- Upload as ZIP and extract, or
- Use SFTP/SSH to upload files

#### 3. Configure Environment

1. Create `.env` file in project root:
   ```env
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_cpanel_username_alitar_financial
   DB_PORT=3306
   PORT=3000
   NODE_ENV=production
   SHILLER_DATA_URL=http://www.econ.yale.edu/~shiller/data/ie_data.xls
   ```

   **Note:** Database name format in cPanel is usually `username_dbname`

#### 4. Run Database Migrations

**Option A: Via cPanel MySQL (phpMyAdmin)**
1. Go to **phpMyAdmin** in cPanel
2. Select your database
3. Click **SQL** tab
4. Copy contents of `database/migrations/001_initial_schema.sql`
5. Paste and execute

**Option B: Via SSH**
```bash
cd /path/to/your/app
mysql -u your_db_user -p your_db_name < database/migrations/001_initial_schema.sql
```

#### 5. Install Dependencies

**Option A: Via cPanel Node.js App**
1. Go to **Node.js App** in cPanel
2. Click **Create Application**
3. Set:
   - **Node.js version**: Latest LTS
   - **Application mode**: Production
   - **Application root**: `/path/to/your/app`
   - **Application URL**: Choose subdomain or subdirectory
   - **Application startup file**: `backend/src/app.js`
4. Click **Create**
5. In **App Console**, run:
   ```bash
   npm install
   ```

**Option B: Via SSH**
```bash
cd /path/to/your/app
npm install --production
```

#### 6. Seed Initial Series

**Via SSH or cPanel Terminal:**
```bash
cd /path/to/your/app
node backend/src/db/seeds/seed-series.js
```

#### 7. Run Initial Snapshots

```bash
node backend/scripts/snapshot-series.js --slug spx_price_monthly
node backend/scripts/snapshot-series.js --slug spx_pe_monthly
```

#### 8. Start Application

**Via cPanel Node.js App:**
- Click **Restart** button in your Node.js app

**Via SSH (if using PM2 or similar):**
```bash
pm2 start backend/src/app.js --name alitar-financial
pm2 save
pm2 startup
```

#### 9. Configure Cron Job

1. Go to **Cron Jobs** in cPanel
2. Add new cron job:
   - **Minute**: `0`
   - **Hour**: `2`
   - **Day**: `*`
   - **Month**: `*`
   - **Weekday**: `*`
   - **Command**: 
     ```bash
     cd /path/to/your/app && node backend/cron/update-all.js >> /path/to/logs/update.log 2>&1
     ```

   This runs daily at 2:00 AM.

#### 10. Verify Deployment

1. Visit your application URL
2. Check `/health` endpoint
3. Verify chart loads on homepage
4. Test toggle between PRICE and P/E metrics

### Troubleshooting

**Database Connection Issues:**
- Verify database name format (usually `username_dbname`)
- Check user permissions
- Ensure MySQL is running

**Node.js App Not Starting:**
- Check logs in cPanel Node.js App
- Verify `.env` file exists and has correct values
- Check file permissions

**Data Not Loading:**
- Verify snapshots ran successfully
- Check `ingestion_runs` table for errors
- Ensure Shiller data URL is accessible

**Cron Job Not Running:**
- Check cron job syntax
- Verify file paths are absolute
- Check cron logs in cPanel

## Development

### Project Structure Details

- **Database**: MySQL with three main tables (`series`, `series_points`, `ingestion_runs`)
- **Data Ingestion**: Modular system supporting multiple sources (currently Shiller)
- **Analysis**: Bubble roadmap algorithm with temporal alignment and scaling
- **API**: RESTful endpoints for data access
- **Frontend**: Vanilla JS with Chart.js for visualizations

### Adding New Data Sources

1. Create new ingestion service in `backend/src/services/ingestion/`
2. Extend `BaseIngestionService`
3. Implement `fetchData()` method
4. Add series via seed script

### Adding New Analyses

1. Create analysis service in `backend/src/services/analysis/`
2. Add API endpoint in `backend/src/routes/api/analysis.js`
3. Add frontend UI in `frontend/`

## License

ISC

## Support

For issues or questions, please refer to the project documentation or contact the maintainer.
