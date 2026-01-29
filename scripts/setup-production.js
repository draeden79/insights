#!/usr/bin/env node

/**
 * Setup script for production deployment
 * Run this after deploying to Namecheap
 * 
 * Usage: node scripts/setup-production.js
 */

const fs = require('fs');
const path = require('path');

async function main() {
    console.log('🚀 Alitar Insights - Production Setup\n');

    // Check if .env exists
    const envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file not found!');
        console.error('Please create .env file with the following content:\n');
        console.error(`# Database Configuration
DB_HOST=localhost
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_NAME
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=production

# Shiller Data Source
SHILLER_DATA_URL=http://www.econ.yale.edu/~shiller/data/ie_data.xls
`);
        process.exit(1);
    }

    // Load environment
    require('dotenv').config({ path: envPath });

    // Test database connection
    console.log('📊 Testing database connection...');
    const db = require('../backend/src/db/connection');
    const dbStatus = await db.testConnection();
    
    if (!dbStatus.connected) {
        console.error('❌ Database connection failed:', dbStatus.error);
        console.error('\nPlease check your .env file and ensure:');
        console.error('1. Database exists');
        console.error('2. User has correct permissions');
        console.error('3. Password is correct');
        process.exit(1);
    }
    console.log('✅ Database connected!\n');

    // Check if tables exist
    console.log('📋 Checking database tables...');
    try {
        const tables = await db.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        
        const requiredTables = ['series', 'series_points', 'ingestion_runs'];
        const missingTables = requiredTables.filter(t => !tableNames.includes(t));
        
        if (missingTables.length > 0) {
            console.log('⚠️  Missing tables:', missingTables.join(', '));
            console.log('Please run the migration first:');
            console.log('  mysql -u USER -p DATABASE < database/migrations/001_initial_schema.sql\n');
        } else {
            console.log('✅ All required tables exist!\n');
        }
    } catch (error) {
        console.error('❌ Error checking tables:', error.message);
    }

    // Check series
    console.log('📈 Checking series data...');
    try {
        const series = await db.query('SELECT slug, name, status FROM series');
        
        if (series.length === 0) {
            console.log('⚠️  No series found. Running seed...');
            const seedSeries = require('../backend/src/db/seeds/seed-series');
            await seedSeries();
            console.log('✅ Seed completed!\n');
        } else {
            console.log(`✅ Found ${series.length} series:`);
            series.forEach(s => console.log(`   - ${s.slug} (${s.status})`));
            console.log('');
        }
    } catch (error) {
        console.error('❌ Error checking series:', error.message);
    }

    // Check data points
    console.log('📊 Checking data points...');
    try {
        const counts = await db.query(`
            SELECT s.slug, COUNT(sp.period) as count, 
                   MIN(sp.period) as first_period, 
                   MAX(sp.period) as last_period
            FROM series s
            LEFT JOIN series_points sp ON s.id = sp.series_id
            GROUP BY s.id
        `);
        
        let needsSnapshot = false;
        counts.forEach(c => {
            if (c.count === 0) {
                console.log(`   - ${c.slug}: No data (needs snapshot)`);
                needsSnapshot = true;
            } else {
                console.log(`   - ${c.slug}: ${c.count} points (${c.first_period} to ${c.last_period})`);
            }
        });
        
        if (needsSnapshot) {
            console.log('\n⚠️  Some series need snapshots. Run:');
            console.log('  npm run snapshot -- --slug spx_price_monthly');
            console.log('  npm run snapshot -- --slug spx_pe_monthly');
        }
        console.log('');
    } catch (error) {
        console.error('❌ Error checking data:', error.message);
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Setup check complete!\n');
    console.log('Next steps:');
    console.log('1. If tables missing: Run migration SQL');
    console.log('2. If no data: Run npm run snapshot for each series');
    console.log('3. Configure cron job for daily updates');
    console.log('4. Restart the Node.js app in cPanel');
    console.log('\nApplication URL: https://alitar.one/insights');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await db.close();
}

main().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
});
