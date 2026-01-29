const db = require('../../db/connection');

/**
 * Base Ingestion Service
 * Provides common functionality for all data ingestion services
 */
class BaseIngestionService {
    constructor(seriesSlug) {
        this.seriesSlug = seriesSlug;
        this.seriesId = null;
    }

    /**
     * Get series ID from slug
     */
    async getSeriesId() {
        if (this.seriesId) {
            return this.seriesId;
        }
        
        const series = await db.queryOne(
            'SELECT id FROM series WHERE slug = ?',
            [this.seriesSlug]
        );
        
        if (!series) {
            throw new Error(`Series not found: ${this.seriesSlug}`);
        }
        
        this.seriesId = series.id;
        return this.seriesId;
    }

    /**
     * Get last period in database for this series
     */
    async getLastPeriod() {
        const seriesId = await this.getSeriesId();
        const result = await db.queryOne(
            'SELECT MAX(period) as last_period FROM series_points WHERE series_id = ?',
            [seriesId]
        );
        
        return result?.last_period || null;
    }

    /**
     * Upsert points into database (idempotent)
     */
    async upsertPoints(points) {
        if (!points || points.length === 0) {
            return 0;
        }
        
        const seriesId = await this.getSeriesId();
        const pool = db.getPool();
        
        let upserted = 0;
        
        // Use transaction for better performance
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            for (const point of points) {
                const [result] = await connection.execute(
                    `INSERT INTO series_points (series_id, period, value, as_of)
                     VALUES (?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE
                         value = VALUES(value),
                         as_of = VALUES(as_of)`,
                    [seriesId, point.period, point.value]
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

    /**
     * Update series metadata after successful ingestion
     */
    async updateSeriesMetadata(rowsUpserted) {
        const seriesId = await this.getSeriesId();
        await db.query(
            `UPDATE series 
             SET last_success_at = NOW(),
                 last_attempt_at = NOW(),
                 updated_at = NOW()
             WHERE id = ?`,
            [seriesId]
        );
    }

    /**
     * Record ingestion run
     */
    async recordRun(runType, status, rowsUpserted, errorMessage = null, details = null) {
        const seriesId = await this.getSeriesId();
        
        const detailsJson = details ? JSON.stringify(details) : null;
        
        await db.query(
            `INSERT INTO ingestion_runs 
             (series_id, run_type, status, rows_upserted, error_message, details_json, finished_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [seriesId, runType, status, rowsUpserted, errorMessage, detailsJson]
        );
    }

    /**
     * Delete all points for this series (for reset)
     */
    async deleteAllPoints() {
        const seriesId = await this.getSeriesId();
        const result = await db.query(
            'DELETE FROM series_points WHERE series_id = ?',
            [seriesId]
        );
        return result.affectedRows || 0;
    }

    /**
     * Fetch data from source (to be implemented by subclasses)
     */
    async fetchData() {
        throw new Error('fetchData() must be implemented by subclass');
    }

    /**
     * Normalize data (to be implemented by subclasses)
     */
    normalizeData(rawData) {
        return rawData; // Default: no normalization
    }
}

module.exports = BaseIngestionService;
