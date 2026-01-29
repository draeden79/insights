# Setup script for local development (PowerShell)
# This script sets up the MySQL database and runs initial migrations

$ErrorActionPreference = "Stop"

Write-Host "🚀 Setting up Alitar Financial Explorer for development..." -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Start MySQL container
Write-Host "📦 Starting MySQL container..." -ForegroundColor Yellow
docker-compose up -d mysql

# Wait for MySQL to be ready
Write-Host "⏳ Waiting for MySQL to be ready..." -ForegroundColor Yellow
$timeout = 60
$counter = 0
$ready = $false

while ($counter -lt $timeout) {
    try {
        docker exec alitar-financial-mysql mysqladmin ping -h localhost -u root -prootpassword --silent 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
    } catch {
        # Continue waiting
    }
    Start-Sleep -Seconds 2
    $counter += 2
}

if (-not $ready) {
    Write-Host "❌ MySQL failed to start within $timeout seconds" -ForegroundColor Red
    exit 1
}

Write-Host "✅ MySQL is ready!" -ForegroundColor Green

# Run migrations
Write-Host "📊 Running database migrations..." -ForegroundColor Yellow
Get-Content database/migrations/001_initial_schema.sql | docker exec -i alitar-financial-mysql mysql -u root -prootpassword alitar_financial

Write-Host "🌱 Seeding initial series..." -ForegroundColor Yellow
npm run seed

Write-Host "📥 Running initial snapshots (this may take a few minutes)..." -ForegroundColor Yellow
npm run snapshot -- --slug spx_price_monthly
npm run snapshot -- --slug spx_pe_monthly

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now start the application with: npm start" -ForegroundColor Cyan
Write-Host "The application will be available at: http://localhost:3000" -ForegroundColor Cyan
