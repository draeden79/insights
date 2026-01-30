/**
 * Auto-setup module for production deployment
 * Runs migrations, seed, and initial snapshot automatically on startup
 */

const fs = require('fs');
const path = require('path');
const db = require('./connection');

/**
 * Run database migrations if tables don't exist
 */
async function runMigrations() {
    // Use console.error for all logs (stderr is captured in Namecheap)
    const log = console.error.bind(console);
    
    log('[Setup] Checking database migrations...');
    
    try {
        const pool = db.getPool();
        
        // Check if tables already exist
        const [tables] = await pool.query("SHOW TABLES LIKE 'series'");
        log('[Setup] SHOW TABLES result:', JSON.stringify(tables));
        
        if (tables.length > 0) {
            log('[Setup] Database tables already exist.');
            return false;
        }
        
        log('[Setup] Tables do not exist. Running migrations...');
        
        // Read migration file
        const migrationPath = path.join(__dirname, '../../../database/migrations/001_initial_schema.sql');
        log('[Setup] Migration path:', migrationPath);
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }
        
        const sql = fs.readFileSync(migrationPath, 'utf8');
        log('[Setup] Migration file loaded, length:', sql.length);
        
        // Split into individual statements and execute
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        log('[Setup] Found', statements.length, 'SQL statements to execute');
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            log(`[Setup] Executing statement ${i + 1}/${statements.length}...`);
            try {
                await pool.query(statement);
                log(`[Setup] Statement ${i + 1} executed successfully`);
            } catch (stmtError) {
                log(`[Setup] Statement ${i + 1} failed:`, stmtError.message);
                log('[Setup] Statement was:', statement.substring(0, 100) + '...');
                throw stmtError;
            }
        }
        
        log('[Setup] Migrations completed successfully!');
        return true;
    } catch (error) {
        console.error('[Setup] Migration error:', error.message);
        throw error;
    }
}

/**
 * Run seed if series don't exist
 */
async function runSeedIfNeeded() {
    console.log('[Setup] Checking if seed is needed...');
    
    const series = await db.query('SELECT COUNT(*) as count FROM series');
    
    if (series[0].count > 0) {
        console.log('[Setup] Series already exist, skipping seed.');
        return false;
    }
    
    console.log('[Setup] Running seed...');
    
    const seedSeries = require('./seeds/seed-series');
    await seedSeries();
    
    console.log('[Setup] Seed completed successfully!');
    return true;
}

/**
 * Run initial snapshot if no data points exist
 */
async function runSnapshotIfNeeded() {
    console.log('[Setup] Checking if initial snapshot is needed...');
    
    const points = await db.query('SELECT COUNT(*) as count FROM series_points');
    
    if (points[0].count > 0) {
        console.log('[Setup] Data points already exist, skipping snapshot.');
        return false;
    }
    
    console.log('[Setup] Running initial snapshot (this may take a few minutes)...');
    
    // Import snapshot runner
    const { runSnapshot } = require('../../scripts/snapshot-series');
    
    // Get all active series
    const series = await db.query("SELECT slug FROM series WHERE status = 'active'");
    
    for (const s of series) {
        console.log(`[Setup] Running snapshot for ${s.slug}...`);
        try {
            await runSnapshot(s.slug);
        } catch (error) {
            console.error(`[Setup] Warning: Snapshot failed for ${s.slug}:`, error.message);
            // Continue with other series, don't fail completely
        }
    }
    
    console.log('[Setup] Initial snapshot completed!');
    return true;
}

/**
 * Run full setup: migrations + seed + snapshot
 */
async function runFullSetup() {
    const log = console.error.bind(console);
    log('[Setup] Starting auto-setup...');
    
    try {
        const migrationsRan = await runMigrations();
        log('[Setup] Migrations step completed, result:', migrationsRan);
        
        const seedRan = await runSeedIfNeeded();
        log('[Setup] Seed step completed, result:', seedRan);
        
        const snapshotRan = await runSnapshotIfNeeded();
        log('[Setup] Snapshot step completed, result:', snapshotRan);
        
        if (migrationsRan || seedRan || snapshotRan) {
            log('[Setup] Auto-setup completed successfully!');
        } else {
            log('[Setup] Database already configured, no setup needed.');
        }
    } catch (error) {
        console.error('[Setup] Auto-setup failed:', error.message);
        throw error;
    }
}

module.exports = {
    runMigrations,
    runSeedIfNeeded,
    runSnapshotIfNeeded,
    runFullSetup
};
