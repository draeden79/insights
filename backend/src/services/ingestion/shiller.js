const XLSX = require('xlsx');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Shiller Data Ingestion Service
 * Downloads and parses Robert Shiller's Irrational Exuberance dataset
 */
class ShillerIngestionService {
    constructor(config) {
        this.config = config || {};
        this.dataUrl = this.config.url || process.env.SHILLER_DATA_URL || 
                      'http://www.econ.yale.edu/~shiller/data/ie_data.xls';
    }

    /**
     * Download file from URL
     */
    async downloadFile(url) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;
            
            const request = client.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }
                
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            
            request.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Normalize Shiller date format to YYYY-MM-01
     * Shiller uses YYYY.MM format (e.g., 1871.01 for Jan 1871, 1871.1 for Oct 1871)
     */
    normalizeDate(dateValue) {
        if (dateValue === null || dateValue === undefined) return null;
        
        if (typeof dateValue === 'number' && dateValue > 1800 && dateValue < 2100) {
            const year = Math.floor(dateValue);
            // Extract month from decimal: 0.01 = Jan, 0.1 = Oct, 0.12 = Dec
            const decimal = dateValue - year;
            const month = Math.round(decimal * 100);
            
            if (month >= 1 && month <= 12) {
                return `${year}-${String(month).padStart(2, '0')}-01`;
            }
        }
        
        return null;
    }

    /**
     * Fetch data from Shiller dataset
     */
    async fetchData(seriesType) {
        try {
            console.log(`Downloading Shiller data from ${this.dataUrl}...`);
            const buffer = await this.downloadFile(this.dataUrl);
            
            console.log('Parsing Excel file...');
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            
            // Use the "Data" sheet
            const worksheet = workbook.Sheets['Data'];
            if (!worksheet) {
                throw new Error('Data sheet not found in Excel file');
            }
            
            // Read as raw array
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
            console.log(`Raw data has ${rawData.length} rows`);
            
            // Find data start row (first row with numeric date in column 0)
            let dataStartRow = -1;
            for (let i = 0; i < Math.min(20, rawData.length); i++) {
                const val = rawData[i]?.[0];
                if (typeof val === 'number' && val > 1800 && val < 2100) {
                    dataStartRow = i;
                    console.log(`Data starts at row ${i}, first date: ${val}`);
                    break;
                }
            }
            
            if (dataStartRow === -1) {
                throw new Error('Could not find data start row');
            }
            
            // Column indices in Shiller dataset:
            // 0 = Date (YYYY.MM format)
            // 1 = S&P Composite Price (P)
            // 2 = Dividend (D)
            // 3 = Earnings (E)
            // 10 = CAPE (P/E10)
            const COL_DATE = 0;
            const COL_PRICE = 1;
            const COL_EARNINGS = 3;
            const COL_CAPE = 10;
            
            const points = [];
            
            for (let i = dataStartRow; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row) continue;
                
                const dateVal = row[COL_DATE];
                const period = this.normalizeDate(dateVal);
                
                if (!period) continue;
                
                let value;
                
                if (seriesType === 'price') {
                    value = row[COL_PRICE];
                } else if (seriesType === 'pe') {
                    // Try CAPE column first
                    value = row[COL_CAPE];
                    
                    // If no CAPE, calculate from Price/Earnings
                    if (value === null || value === undefined || value === '' || value === 'NA') {
                        const price = row[COL_PRICE];
                        const earnings = row[COL_EARNINGS];
                        if (price && earnings && earnings > 0) {
                            value = price / earnings;
                        }
                    }
                }
                
                // Skip invalid values
                if (value === null || value === undefined || value === '' || value === 'NA') {
                    continue;
                }
                
                const numValue = parseFloat(value);
                if (isNaN(numValue)) continue;
                
                points.push({ period, value: numValue });
            }
            
            // Sort by period
            points.sort((a, b) => a.period.localeCompare(b.period));
            
            console.log(`Extracted ${points.length} points for ${seriesType}`);
            if (points.length > 0) {
                console.log(`Date range: ${points[0].period} to ${points[points.length - 1].period}`);
            }
            
            return points;
            
        } catch (error) {
            console.error('Error fetching Shiller data:', error);
            throw error;
        }
    }
}

module.exports = ShillerIngestionService;
