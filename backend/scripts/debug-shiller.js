#!/usr/bin/env node
require('dotenv').config();
const XLSX = require('xlsx');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const dataUrl = 'http://www.econ.yale.edu/~shiller/data/ie_data.xls';

async function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        client.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

async function main() {
    console.log('Downloading Shiller data...');
    const buffer = await downloadFile(dataUrl);
    
    console.log('Parsing Excel...');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('Sheets:', workbook.SheetNames);
    
    const worksheet = workbook.Sheets['Data'];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    console.log('\nFirst 15 rows:');
    for (let i = 0; i < 15; i++) {
        console.log(`Row ${i}:`, rawData[i]?.slice(0, 5));
    }
    
    // Find data start
    let dataStartRow = -1;
    for (let i = 0; i < 20; i++) {
        const firstCell = rawData[i]?.[0];
        if (typeof firstCell === 'number' && firstCell > 1800 && firstCell < 2100) {
            dataStartRow = i;
            break;
        }
    }
    
    console.log('\nData starts at row:', dataStartRow);
    
    if (dataStartRow >= 0) {
        console.log('\nSample data rows (first cell = date):');
        for (let i = dataStartRow; i < dataStartRow + 10; i++) {
            const row = rawData[i];
            console.log(`  ${row?.[0]} => Price: ${row?.[1]}`);
        }
        
        console.log('\nLast 10 data rows:');
        for (let i = Math.max(dataStartRow, rawData.length - 15); i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row[0]) {
                console.log(`  Row ${i}: Date=${row[0]}, Price=${row[1]}`);
            }
        }
        
        // Count total data rows
        let count = 0;
        for (let i = dataStartRow; i < rawData.length; i++) {
            if (rawData[i]?.[0] && typeof rawData[i][0] === 'number' && rawData[i][0] > 1800) {
                count++;
            }
        }
        console.log('\nTotal data rows:', count);
    }
}

main().catch(console.error);
