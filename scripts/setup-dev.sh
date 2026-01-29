#!/bin/bash

# Setup script for local development
# This script sets up the MySQL database and runs initial migrations

set -e

echo "🚀 Setting up Alitar Financial Explorer for development..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start MySQL container
echo "📦 Starting MySQL container..."
docker-compose up -d mysql

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
timeout=60
counter=0
until docker exec alitar-financial-mysql mysqladmin ping -h localhost -u root -prootpassword --silent > /dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ MySQL failed to start within $timeout seconds"
        exit 1
    fi
done

echo "✅ MySQL is ready!"

# Run migrations
echo "📊 Running database migrations..."
docker exec -i alitar-financial-mysql mysql -u root -prootpassword alitar_financial < database/migrations/001_initial_schema.sql

echo "🌱 Seeding initial series..."
npm run seed

echo "📥 Running initial snapshots (this may take a few minutes)..."
npm run snapshot -- --slug spx_price_monthly
npm run snapshot -- --slug spx_pe_monthly

echo "✅ Setup complete!"
echo ""
echo "You can now start the application with: npm start"
echo "The application will be available at: http://localhost:3000"
