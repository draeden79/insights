#!/usr/bin/env node

require('dotenv').config();
const db = require('../src/db/connection');
const ShillerIngestionService = require('../src/services/ingestion/shiller');
const BaseIngestionService = require('../src/services/ingestion/base');
const ingestionFactory = require('../src/services/ingestion/factory');

/**
 * Incremental update for a series
 * Only fetches and upserts new data points
 * 
 * Usage: node backend/scripts/incremental-update.js --slug spx_price_monthly
 */
class IncrementalRunner extends BaseIngestionService {
    constructor(slug) {
        super(slug);
    }

    /**
     * Upsert points with source metadata
     */
    async upsertPointsWithMeta(points) {
        if (!points || points.length === 0) {
            return 0;
        }
        
        const seriesId = await this.getSeriesId();
        const pool = db.getPool();
        
        let upserted = 0;
        
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            for (const point of points) {
                const metaJson = JSON.stringify({
                    source: point.source || 'unknown',
                    fetched_at: new Date().toISOString()
                });
                
                const [result] = await connection.execute(
                    `INSERT INTO series_points (series_id, period, value, as_of, meta_json)
                     VALUES (?, ?, ?, NOW(), ?)
                     ON DUPLICATE KEY UPDATE
                         value = VALUES(value),
                         as_of = VALUES(as_of),
                         meta_json = VALUES(meta_json)`,
                    [seriesId, point.period, point.value, metaJson]
                );
                
                if (result.affectedRows > 0) {
                    upserted++;
                }
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
        return upserted;
    }

    async run() {
        let runId = null;
        try {
            console.log(`Starting incremental update for series: ${this.seriesSlug}`);
            
            // Get series info
            const series = await db.queryOne(
                'SELECT * FROM series WHERE slug = ?',
                [this.seriesSlug]
            );
            
            if (!series) {
                throw new Error(`Series not found: ${this.seriesSlug}`);
            }
            
            if (series.status !== 'active') {
                console.log(`Series ${this.seriesSlug} is not active, skipping...`);
                return;
            }
            
            // Get last period in database
            const lastPeriod = await this.getLastPeriod();
            console.log(`Last period in DB: ${lastPeriod || 'none'}`);
            
            // Record run start
            const seriesId = await this.getSeriesId();
            const [runResult] = await db.getPool().execute(
                `INSERT INTO ingestion_runs (series_id, run_type, status)
                 VALUES (?, 'incremental', 'running')`,
                [seriesId]
            );
            runId = runResult.insertId;
            
            // Update attempt time
            await db.query(
                'UPDATE series SET last_attempt_at = NOW() WHERE id = ?',
                [seriesId]
            );
            
            // Parse source config
            const config = typeof series.source_config_json === 'string' 
                ? JSON.parse(series.source_config_json) 
                : series.source_config_json;
            
            let allPoints;
            
            // Fetch all data based on source type
            if (series.source_type === 'multi') {
                // Multi-source: use factory to fetch and merge
                const sources = config.sources || [];
                const mergeStrategy = config.merge_strategy || 'fill_gaps';
                const seriesType = sources[0]?.config?.type || 'price';
                
                console.log(`Using multi-source with ${sources.length} sources, strategy: ${mergeStrategy}`);
                allPoints = await ingestionFactory.fetchAndMerge(sources, seriesType, mergeStrategy);
                
            } else if (series.source_type === 'shiller') {
                // Single source: Shiller
                const shiller = new ShillerIngestionService(config);
                const seriesType = config.type || 'price';
                const rawPoints = await shiller.fetchData(seriesType);
                // Add source metadata
                allPoints = rawPoints.map(p => ({ ...p, source: 'shiller' }));
                
            } else {
                throw new Error(`Unsupported source type: ${series.source_type}`);
            }
            
            // Filter to only new points
            let points;
            if (lastPeriod) {
                const lastPeriodStr = lastPeriod instanceof Date 
                    ? lastPeriod.toISOString().slice(0, 10) 
                    : lastPeriod;
                points = allPoints.filter(p => p.period > lastPeriodStr);
                console.log(`Filtered to ${points.length} new points after ${lastPeriodStr}`);
            } else {
                // No data yet, use all points
                points = allPoints;
                console.log(`No existing data, using all ${points.length} points`);
            }
            
            if (!points || points.length === 0) {
                console.log('No new data points to upsert');
                await db.query(
                    `UPDATE ingestion_runs 
                     SET status = 'success', rows_upserted = 0, finished_at = NOW()
                     WHERE id = ?`,
                    [runId]
                );
                return;
            }
            
            console.log(`Upserting ${points.length} new points...`);
            
            // Upsert new points with metadata
            const rowsUpserted = await this.upsertPointsWithMeta(points);
            
            console.log(`Upserted ${rowsUpserted} points`);
            
            // Update series metadata
            await this.updateSeriesMetadata(rowsUpserted);
            
            // Record successful run
            await db.query(
                `UPDATE ingestion_runs 
                 SET status = 'success', rows_upserted = ?, finished_at = NOW()
                 WHERE id = ?`,
                [rowsUpserted, runId]
            );
            
            console.log(`Incremental update completed successfully for ${this.seriesSlug}`);
            
        } catch (error) {
            console.error(`Incremental update failed for ${this.seriesSlug}:`, error);
            
            // Record failed run
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

// Export for use by update-all.js
module.exports = IncrementalRunner;

// CLI: only run when executed directly (not when required)
if (require.main === module) {
    const path = require('path');
    const args = process.argv.slice(2);
    const slugIndex = args.indexOf('--slug');
    const slug = slugIndex >= 0 && args[slugIndex + 1] ? args[slugIndex + 1] : null;

    if (!slug) {
        // No --slug: run update-all so cron works even if it calls this script by mistake
        console.log('No --slug provided. Running update for all active series (update-all)...');
        require(path.join(__dirname, '../cron/update-all.js'));
        return;
    }

    const runner = new IncrementalRunner(slug);
    runner.run()
        .then(() => {
            console.log('Done');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Incremental update failed:', error);
            process.exit(1);
        })
        .finally(() => {
            db.close();
        });
}
