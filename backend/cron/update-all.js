#!/usr/bin/env node

const path = require('path');
require('dotenv').config();
const db = require(path.join(__dirname, '../src/db/connection'));
const IncrementalRunner = require(path.join(__dirname, '../scripts/incremental-update'));

/**
 * Update all active series incrementally
 * Designed to be run via cron job
 * 
 * Usage: node backend/cron/update-all.js
 */
async function updateAll() {
    try {
        console.log('Starting update-all job...');
        console.log(`Time: ${new Date().toISOString()}`);
        
        // Get all active series
        const series = await db.query(
            "SELECT slug FROM series WHERE status = 'active'"
        );
        
        if (series.length === 0) {
            console.log('No active series found');
            return;
        }
        
        console.log(`Found ${series.length} active series`);
        
        const results = {
            success: [],
            failed: []
        };
        
        for (const s of series) {
            try {
                console.log(`\nUpdating ${s.slug}...`);
                const runner = new IncrementalRunner(s.slug);
                await runner.run();
                results.success.push(s.slug);
                console.log(`✓ ${s.slug} updated successfully`);
            } catch (error) {
                console.error(`✗ ${s.slug} failed:`, error.message);
                results.failed.push({ slug: s.slug, error: error.message });
            }
        }
        
        console.log('\n=== Update Summary ===');
        console.log(`Success: ${results.success.length}`);
        console.log(`Failed: ${results.failed.length}`);
        
        if (results.failed.length > 0) {
            console.log('\nFailed series:');
            results.failed.forEach(f => {
                console.log(`  - ${f.slug}: ${f.error}`);
            });
        }
        
        console.log('\nUpdate-all job completed');
        
    } catch (error) {
        console.error('Update-all job failed:', error);
        throw error;
    }
}

// Run update-all
updateAll()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Update-all failed:', error);
        process.exit(1);
    })
    .finally(() => {
        db.close();
    });
