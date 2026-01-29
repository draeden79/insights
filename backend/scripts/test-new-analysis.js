#!/usr/bin/env node

require('dotenv').config();
const { computeBubbleRoadmap, getAvailableCrises } = require('../src/services/analysis/bubble-roadmap');

async function test() {
    try {
        console.log('=== Testing New Bubble Roadmap Analysis ===\n');
        
        // List available crises
        console.log('Available crises:');
        const crises = getAvailableCrises();
        crises.forEach(c => console.log(`  - ${c.id}: ${c.description} (crash: ${c.crashDate}, bottom: ${c.bottomDate})`));
        
        // Test with 2008 crisis
        console.log('\n--- Testing with 2008 Financial Crisis ---\n');
        const result2008 = await computeBubbleRoadmap('price', '2008', 60, 36);
        
        console.log('Crisis:', result2008.crisis.name, '-', result2008.crisis.description);
        console.log('Current data last period:', result2008.current.lastPeriod);
        console.log('Months to bottom:', result2008.alignment.monthsToBottom);
        console.log('Scale factor:', result2008.alignment.scaleFactor.toFixed(2));
        console.log('Correlation:', (result2008.alignment.correlation * 100).toFixed(1) + '%');
        console.log('Chart labels count:', result2008.chart.labels.length);
        console.log('Current end position:', result2008.chart.currentEndPosition);
        console.log('Crash position:', result2008.chart.crashPosition);
        console.log('Bottom position:', result2008.chart.bottomPosition);
        console.log('First 3 labels:', result2008.chart.labels.slice(0, 3));
        console.log('Last 3 labels:', result2008.chart.labels.slice(-3));
        
        // Test with 1929 crisis
        console.log('\n--- Testing with 1929 Great Depression ---\n');
        const result1929 = await computeBubbleRoadmap('price', '1929', 60, 36);
        
        console.log('Crisis:', result1929.crisis.name, '-', result1929.crisis.description);
        console.log('Months to bottom:', result1929.alignment.monthsToBottom);
        console.log('Scale factor:', result1929.alignment.scaleFactor.toFixed(2));
        console.log('Correlation:', (result1929.alignment.correlation * 100).toFixed(1) + '%');
        
        console.log('\n=== Tests completed ===');
        process.exit(0);
        
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

test();
