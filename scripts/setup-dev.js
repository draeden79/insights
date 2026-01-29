#!/usr/bin/env node

/**
 * Setup script for local development
 * Sets up MySQL database and runs initial migrations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function exec(command, options = {}) {
    try {
        execSync(command, { stdio: 'inherit', ...options });
    } catch (error) {
        console.error(`Error executing: ${command}`);
        process.exit(1);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkDocker() {
    try {
        execSync('docker info', { stdio: 'ignore' });
        return true;
    } catch (error) {
        console.error('\n❌ Docker não está rodando!');
        console.error('Por favor:');
        console.error('1. Abra o Docker Desktop');
        console.error('2. Aguarde até aparecer "Docker is running"');
        console.error('3. Execute este script novamente\n');
        return false;
    }
}

async function waitForMySQL(timeout = 60) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout * 1000) {
        try {
            execSync(
                'docker exec alitar-financial-mysql mysqladmin ping -h localhost -u root -prootpassword --silent',
                { stdio: 'ignore' }
            );
            return true;
        } catch {
            await sleep(2000);
        }
    }
    return false;
}

async function main() {
    console.log('🚀 Setting up Alitar Financial Explorer for development...\n');

    // Check Docker
    if (!(await checkDocker())) {
        console.error('❌ Docker is not running. Please start Docker and try again.');
        process.exit(1);
    }

    // Start MySQL
    console.log('📦 Starting MySQL container...');
    exec('docker-compose up -d mysql');

    // Wait for MySQL
    console.log('⏳ Waiting for MySQL to be ready...');
    const ready = await waitForMySQL(60);
    if (!ready) {
        console.error('❌ MySQL failed to start within 60 seconds');
        process.exit(1);
    }
    console.log('✅ MySQL is ready!\n');

    // Run migrations
    console.log('📊 Running database migrations...');
    const migrationPath = path.join(__dirname, '../database/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    execSync(
        `docker exec -i alitar-financial-mysql mysql -u root -prootpassword alitar_financial`,
        { input: migrationSQL, stdio: 'pipe' }
    );
    console.log('✅ Migrations completed!\n');

    // Seed series
    console.log('🌱 Seeding initial series...');
    exec('npm run seed');
    console.log('✅ Seed completed!\n');

    // Run snapshots
    console.log('📥 Running initial snapshots (this may take a few minutes)...');
    console.log('  - Fetching spx_price_monthly...');
    exec('npm run snapshot -- --slug spx_price_monthly');
    console.log('  - Fetching spx_pe_monthly...');
    exec('npm run snapshot -- --slug spx_pe_monthly');
    console.log('✅ Snapshots completed!\n');

    console.log('✅ Setup complete!\n');
    console.log('You can now start the application with: npm start');
    console.log('The application will be available at: http://localhost:3000\n');
}

main().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
});
