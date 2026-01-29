const express = require('express');
const router = express.Router();
const { 
    getBubbleRoadmap, 
    clearCache, 
    clearCacheForMetric,
    getAvailableCrises 
} = require('../../services/analysis/bubble-roadmap');

/**
 * GET /api/analysis/crises
 * Get list of available historical crises for comparison
 */
router.get('/crises', (req, res) => {
    try {
        const crises = getAvailableCrises();
        res.json({ crises });
    } catch (error) {
        console.error('Error getting crises:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

/**
 * GET /api/analysis/bubble-roadmap
 * Compute bubble roadmap analysis comparing current market with a historical crisis
 * 
 * Query params:
 * - metric: 'price' or 'pe' (required)
 * - crisis: crisis id ('1929', '1962', '1973', '1980', '1987', '2001', '2008') (required)
 * - window: number of months (default: 120)
 * - shift: max shift months for alignment (default: 36)
 * - clear_cache: 'true' to clear cache before computing
 */
router.get('/bubble-roadmap', async (req, res) => {
    try {
        const { metric, crisis, window, shift, clear_cache } = req.query;
        
        // Clear cache if requested
        if (clear_cache === 'true') {
            if (metric && ['price', 'pe'].includes(metric)) {
                clearCacheForMetric(metric);
            } else {
                clearCache();
            }
        }
        
        // Validate metric
        if (!metric || !['price', 'pe'].includes(metric)) {
            return res.status(400).json({ 
                error: 'Invalid or missing metric parameter. Must be "price" or "pe"' 
            });
        }
        
        // Validate crisis
        if (!crisis) {
            return res.status(400).json({ 
                error: 'Missing crisis parameter. Must be one of: 1929, 1962, 1973, 1980, 1987, 2001, 2008' 
            });
        }
        
        // Parse optional parameters
        const windowMonths = window ? parseInt(window, 10) : 120;
        const maxShiftMonths = shift ? parseInt(shift, 10) : 36;
        
        if (isNaN(windowMonths) || windowMonths < 12 || windowMonths > 180) {
            return res.status(400).json({ 
                error: 'Invalid window parameter. Must be between 12 and 180' 
            });
        }
        
        if (isNaN(maxShiftMonths) || maxShiftMonths < 0 || maxShiftMonths > 48) {
            return res.status(400).json({ 
                error: 'Invalid shift parameter. Must be between 0 and 48' 
            });
        }
        
        // Get cached or compute result
        const result = await getBubbleRoadmap(metric, crisis, windowMonths, maxShiftMonths);
        
        res.json(result);
        
    } catch (error) {
        console.error('Error computing bubble roadmap:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

/**
 * POST /api/analysis/bubble-roadmap/cache/clear
 * Clear bubble roadmap cache
 */
router.post('/bubble-roadmap/cache/clear', async (req, res) => {
    try {
        const { metric } = req.query;
        
        if (metric) {
            if (!['price', 'pe'].includes(metric)) {
                return res.status(400).json({ 
                    error: 'Invalid metric parameter. Must be "price" or "pe"' 
                });
            }
            clearCacheForMetric(metric);
            res.json({ message: `Cache cleared for metric: ${metric}` });
        } else {
            clearCache();
            res.json({ message: 'All cache cleared' });
        }
        
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

module.exports = router;
