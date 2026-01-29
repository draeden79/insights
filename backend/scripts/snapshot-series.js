#!/usr/bin/env node

require('dotenv').config();
const db = require('../src/db/connection');
const ShillerIngestionService = require('../src/services/ingestion/shiller');
const BaseIngestionService = require('../src/services/ingestion/base');
const ingestionFactory = require('../src/services/ingestion/factory');

/**
 * Snapshot (full backfill) for a series
 * Usage: node backend/scripts/snapshot-series.js --slug spx_price_monthly
 */
class SnapshotRunner extends BaseIngestionService {
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
            console.log(`Starting snapshot for series: ${this.seriesSlug}`);
            
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
            
            // Record run start
            const seriesId = await this.getSeriesId();
            const [runResult] = await db.getPool().execute(
                `INSERT INTO ingestion_runs (series_id, run_type, status)
                 VALUES (?, 'snapshot', 'running')`,
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
            
            let points;
            
            // Fetch data based on source type
            if (series.source_type === 'multi') {
                // Multi-source: use factory to fetch and merge
                const sources = config.sources || [];
                const mergeStrategy = config.merge_strategy || 'fill_gaps';
                
                // Determine series type from first source config
                const seriesType = sources[0]?.config?.type || 'price';
                
                console.log(`Using multi-source with ${sources.length} sources, strategy: ${mergeStrategy}`);
                points = await ingestionFactory.fetchAndMerge(sources, seriesType, mergeStrategy);
                
            } else if (series.source_type === 'shiller') {
                // Single source: Shiller
                const shiller = new ShillerIngestionService(config);
                const seriesType = config.type || 'price';
                const rawPoints = await shiller.fetchData(seriesType);
                // Add source metadata
                points = rawPoints.map(p => ({ ...p, source: 'shiller' }));
                
            } else {
                throw new Error(`Unsupported source type: ${series.source_type}`);
            }
            
            if (!points || points.length === 0) {
                throw new Error('No data points fetched');
            }
            
            console.log(`Fetched ${points.length} points, upserting...`);
            
            // Upsert all points with source metadata
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
            
            console.log(`Snapshot completed successfully for ${this.seriesSlug}`);
            
        } catch (error) {
            console.error(`Snapshot failed for ${this.seriesSlug}:`, error);
            
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

// Parse command line arguments
const args = process.argv.slice(2);
const slugIndex = args.indexOf('--slug');
const slug = slugIndex >= 0 && args[slugIndex + 1] ? args[slugIndex + 1] : null;

if (!slug) {
    console.error('Usage: node snapshot-series.js --slug <series-slug>');
    process.exit(1);
}

// Run snapshot
const runner = new SnapshotRunner(slug);
runner.run()
    .then(() => {
        console.log('Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Snapshot failed:', error);
        process.exit(1);
    })
    .finally(() => {
        db.close();
    });
