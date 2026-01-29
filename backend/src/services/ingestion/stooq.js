const https = require('https');

/**
 * Stooq Data Ingestion Service
 * Downloads and parses S&P 500 price data from Stooq CSV
 */
class StooqIngestionService {
    constructor(config) {
        this.config = config || {};
        // Monthly S&P 500 data
        this.dataUrl = this.config.url || 'https://stooq.com/q/d/l/?s=%5Espx&i=m';
    }

    /**
     * Download CSV from URL
     */
    async downloadCSV(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302) {
                    const redirectUrl = response.headers.location;
                    this.downloadCSV(redirectUrl).then(resolve).catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    resolve(Buffer.concat(chunks).toString('utf-8'));
                });
            });

            request.on('error', (error) => {
                reject(error);
            });

            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Parse Stooq CSV format
     * Format: Date,Open,High,Low,Close,Volume
     * Date format: YYYY-MM-DD
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        
        if (lines.length < 2) {
            throw new Error('CSV file is empty or has no data rows');
        }

        // First line is header
        const header = lines[0].toLowerCase();
        if (!header.includes('date') || !header.includes('close')) {
            throw new Error(`Unexpected CSV header: ${lines[0]}`);
        }

        const points = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length < 5) continue;

            const dateStr = parts[0]; // YYYY-MM-DD
            const closeStr = parts[4]; // Close price

            // Validate date format
            const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!dateMatch) continue;

            const year = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]);

            // Normalize to first of month
            const period = `${year}-${String(month).padStart(2, '0')}-01`;

            const value = parseFloat(closeStr);
            if (isNaN(value)) continue;

            points.push({ period, value });
        }

        return points;
    }

    /**
     * Fetch data from Stooq
     * @param {string} seriesType - 'price' (Stooq only provides price data)
     */
    async fetchData(seriesType = 'price') {
        if (seriesType !== 'price') {
            throw new Error(`Stooq only supports 'price' series type, got: ${seriesType}`);
        }

        try {
            console.log(`Downloading Stooq data from ${this.dataUrl}...`);
            const csvText = await this.downloadCSV(this.dataUrl);
            
            console.log('Parsing CSV...');
            const points = this.parseCSV(csvText);

            // Sort by period
            points.sort((a, b) => a.period.localeCompare(b.period));

            console.log(`Extracted ${points.length} points from Stooq`);
            if (points.length > 0) {
                console.log(`Date range: ${points[0].period} to ${points[points.length - 1].period}`);
            }

            return points;

        } catch (error) {
            console.error('Error fetching Stooq data:', error);
            throw error;
        }
    }
}

module.exports = StooqIngestionService;
