#!/usr/bin/env node

require('dotenv').config();
const { computeBubbleRoadmap } = require('../src/services/analysis/bubble-roadmap');

async function testService() {
    try {
        console.log('Testing bubble roadmap service directly...\n');
        
        const result = await computeBubbleRoadmap('price', 60, 12);
        
        console.log('\n=== RESULT ===');
        console.log(`Current series points: ${result.current.series.length}`);
        console.log(`Last period: ${result.current.last_period}`);
        console.log(`\nFirst 5 periods:`, result.current.series.slice(0, 5).map(p => p.period));
        console.log(`\nLast 5 periods:`, result.current.series.slice(-5).map(p => p.period));
        console.log(`\nLast 5 values:`, result.current.series.slice(-5).map(p => p.value));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testService();
