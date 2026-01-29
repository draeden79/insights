const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
    try {
        // Test database connection
        const dbStatus = await db.testConnection();
        
        // Get series count
        const seriesCount = await db.queryOne(
            "SELECT COUNT(*) as count FROM series WHERE status = 'active'"
        );
        
        // Get last update time
        const lastUpdate = await db.queryOne(
            `SELECT MAX(last_success_at) as last_update 
             FROM series 
             WHERE status = 'active'`
        );
        
        res.json({
            status: 'ok',
            database: dbStatus.connected ? 'connected' : 'disconnected',
            series_count: seriesCount?.count || 0,
            last_update: lastUpdate?.last_update || null,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            database: 'error',
            error: error.message
        });
    }
});

module.exports = router;
