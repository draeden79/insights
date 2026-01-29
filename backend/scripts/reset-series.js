#!/usr/bin/env node

require('dotenv').config();
const db = require('../src/db/connection');
const BaseIngestionService = require('../src/services/ingestion/base');
const ShillerIngestionService = require('../src/services/ingestion/shiller');

/**
 * Snapshot runner (reused from snapshot-series.js)
 */
class SnapshotRunner extends BaseIngestionService {
    constructor(slug) {
        super(slug);
        this.shiller = null;
    }

    async run() {
        let runId = null;
        try {
            const series = await db.queryOne(
                'SELECT * FROM series WHERE slug = ?',
                [this.seriesSlug]
            );
            
            if (!series) {
                throw new Error(`Series not found: ${this.seriesSlug}`);
            }
            
            const seriesId = await this.getSeriesId();
            const [runResult] = await db.getPool().execute(
                `INSERT INTO ingestion_runs (series_id, run_type, status)
                 VALUES (?, 'snapshot', 'running')`,
                [seriesId]
            );
            runId = runResult.insertId;
            
            await db.query(
                'UPDATE series SET last_attempt_at = NOW() WHERE id = ?',
                [seriesId]
            );
            
            let points;
            if (series.source_type === 'shiller') {
                const config = typeof series.source_config_json === 'string' 
                    ? JSON.parse(series.source_config_json) 
                    : series.source_config_json;
                this.shiller = new ShillerIngestionService(config);
                const seriesType = config.type || 'price';
                points = await this.shiller.fetchData(seriesType);
            } else {
                throw new Error(`Unsupported source type: ${series.source_type}`);
            }
            
            if (!points || points.length === 0) {
                throw new Error('No data points fetched');
            }
            
            const rowsUpserted = await this.upsertPoints(points);
            await this.updateSeriesMetadata(rowsUpserted);
            
            await db.query(
                `UPDATE ingestion_runs 
                 SET status = 'success', rows_upserted = ?, finished_at = NOW()
                 WHERE id = ?`,
                [rowsUpserted, runId]
            );
            
        } catch (error) {
            if (runId) {
                await db.query(
                    `UPDATE ingestion_runs 
                     SET status = 'fail', error_message = ?, finished_at = NOW()
                     WHERE id = ?`,
                    [error.message, runId]
                );
            }
            throw error;
        }
    }
}

/**
 * Reset a series: delete all points and re-run snapshot
 * 
 * Usage: node backend/scripts/reset-series.js --slug spx_price_monthly
 */
class ResetRunner {
    constructor(slug) {
        this.slug = slug;
    }

    async run() {
        try {
            console.log(`Resetting series: ${this.slug}`);
            
            // Get series info
            const series = await db.queryOne(
                'SELECT id FROM series WHERE slug = ?',
                [this.slug]
            );
            
            if (!series) {
                throw new Error(`Series not found: ${this.slug}`);
            }
            
            // Delete all points
            const deleted = await db.query(
                'DELETE FROM series_points WHERE series_id = ?',
                [series.id]
            );
            
            console.log(`Deleted ${deleted.affectedRows || 0} points`);
            
            // Record reset run
            await db.query(
                `INSERT INTO ingestion_runs (series_id, run_type, status, rows_upserted, finished_at)
                 VALUES (?, 'reset', 'success', ?, NOW())`,
                [series.id, deleted.affectedRows || 0]
            );
            
            // Run snapshot (reuse logic from snapshot-series.js)
            console.log('Running snapshot...');
            const snapshotRunner = new SnapshotRunner(this.slug);
            await snapshotRunner.run();
            
            console.log(`Reset completed successfully for ${this.slug}`);
            
        } catch (error) {
            console.error(`Reset failed for ${this.slug}:`, error);
            throw error;
        }
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const slugIndex = args.indexOf('--slug');
const slug = slugIndex >= 0 && args[slugIndex + 1] ? args[slugIndex + 1] : null;

if (!slug) {
    console.error('Usage: node reset-series.js --slug <series-slug>');
    process.exit(1);
}

// Run reset
const runner = new ResetRunner(slug);
runner.run()
    .then(() => {
        console.log('Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Reset failed:', error);
        process.exit(1);
    })
    .finally(() => {
        db.close();
    });
