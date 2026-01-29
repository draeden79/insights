#!/usr/bin/env node

const http = require('http');

const url = 'http://localhost:3000/api/analysis/bubble-roadmap?metric=price&crisis=2008&window=60&shift=36';

http.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            
            console.log('API Response:');
            console.log(`Crisis: ${result.crisis.name} - ${result.crisis.description}`);
            console.log(`Current data last period: ${result.current.lastPeriod}`);
            console.log(`Months to bottom: ${result.alignment.monthsToBottom}`);
            console.log(`Scale factor: ${result.alignment.scaleFactor.toFixed(2)}`);
            console.log(`Correlation: ${(result.alignment.correlation * 100).toFixed(1)}%`);
            console.log(`Chart labels: ${result.chart.labels.length}`);
            console.log(`Current end position: ${result.chart.currentEndPosition}`);
            console.log(`Crash position: ${result.chart.crashPosition}`);
            console.log(`Bottom position: ${result.chart.bottomPosition}`);
            console.log(`\nFirst 3 labels:`, result.chart.labels.slice(0, 3));
            console.log(`Last 3 labels:`, result.chart.labels.slice(-3));
            
        } catch (error) {
            console.error('Error parsing response:', error);
            console.log('Raw response:', data);
        }
    });
}).on('error', (error) => {
    console.error('Error making request:', error.message);
    console.error('Make sure the server is running on http://localhost:3000');
});
