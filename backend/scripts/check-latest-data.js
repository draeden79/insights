#!/usr/bin/env node

require('dotenv').config();
const db = require('../src/db/connection');

async function checkLatestData() {
    try {
        console.log('Checking latest data points...\n');
        
        // Get latest 10 points
        const latestPoints = await db.query(
            `SELECT DATE_FORMAT(period, '%Y-%m-%d') as period, value, meta_json
             FROM series_points 
             WHERE series_id = (SELECT id FROM series WHERE slug = 'spx_price_monthly')
             ORDER BY period DESC 
             LIMIT 10`
        );
        
        console.log('Latest 10 data points:');
        latestPoints.forEach(p => {
            let source = 'unknown';
            if (p.meta_json) {
                if (typeof p.meta_json === 'string') {
                    try {
                        source = JSON.parse(p.meta_json).source || 'unknown';
                    } catch (e) {
                        source = 'parse_error';
                    }
                } else {
                    source = p.meta_json.source || 'unknown';
                }
            }
            console.log(`${p.period}: ${p.value} (source: ${source})`);
        });
        
        // Get total count
        const countResult = await db.queryOne(
            'SELECT COUNT(*) as total FROM series_points WHERE series_id = (SELECT id FROM series WHERE slug = ?)',
            ['spx_price_monthly']
        );
        
        console.log(`\nTotal points: ${countResult.total}`);
        
        // Get date range
        const rangeResult = await db.queryOne(
            `SELECT 
                DATE_FORMAT(MIN(period), '%Y-%m-%d') as first_period,
                DATE_FORMAT(MAX(period), '%Y-%m-%d') as last_period
             FROM series_points 
             WHERE series_id = (SELECT id FROM series WHERE slug = ?)`,
            ['spx_price_monthly']
        );
        
        console.log(`Date range: ${rangeResult.first_period} to ${rangeResult.last_period}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.close();
    }
}

checkLatestData();
