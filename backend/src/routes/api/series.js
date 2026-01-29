const express = require('express');
const router = express.Router();
const db = require('../../db/connection');

/**
 * GET /api/series/:slug
 * Get series data points with optional date range filter
 */
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { from, to } = req.query;
        
        // Get series info
        const series = await db.queryOne(
            'SELECT id, slug, name, description, unit FROM series WHERE slug = ?',
            [slug]
        );
        
        if (!series) {
            return res.status(404).json({ error: 'Series not found' });
        }
        
        // Build query for points
        let query = `
            SELECT period, value 
            FROM series_points 
            WHERE series_id = ?
        `;
        const params = [series.id];
        
        if (from) {
            query += ' AND period >= ?';
            params.push(`${from}-01`);
        }
        
        if (to) {
            query += ' AND period <= ?';
            params.push(`${to}-01`);
        }
        
        query += ' ORDER BY period ASC';
        
        const points = await db.query(query, params);
        
        // Get metadata
        const meta = await db.queryOne(
            `SELECT 
                MIN(period) as first_period,
                MAX(period) as last_period,
                COUNT(*) as total_points
             FROM series_points 
             WHERE series_id = ?`,
            [series.id]
        );
        
        res.json({
            series: {
                slug: series.slug,
                name: series.name,
                description: series.description,
                unit: series.unit
            },
            points: points.map(p => ({
                period: p.period,
                value: parseFloat(p.value)
            })),
            meta: {
                first_period: meta.first_period,
                last_period: meta.last_period,
                total_points: meta.total_points
            }
        });
        
    } catch (error) {
        console.error('Error fetching series:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
