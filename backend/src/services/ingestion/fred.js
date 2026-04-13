const https = require('https');
const { URL } = require('url');

/**
 * FRED (Federal Reserve Economic Data) ingestion for index levels.
 * Uses monthly end-of-period aggregation of SP500 (daily series) to match monthly S&P price series.
 */
class FredIngestionService {
    constructor(config) {
        this.config = config || {};
        this.seriesId = this.config.series_id || 'SP500';
        this.apiKey = this.config.api_key || process.env.FRED_API_KEY || '';
    }

    /**
     * @param {string} seriesType - 'price' only
     * @returns {Promise<Array<{ period: string, value: number }>>}
     */
    async fetchData(seriesType = 'price') {
        if (seriesType !== 'price') {
            throw new Error(`FRED SP500 ingestion only supports 'price', got: ${seriesType}`);
        }
        if (!this.apiKey || String(this.apiKey).trim() === '') {
            throw new Error(
                'FRED_API_KEY is not set. Register a free key at https://fred.stlouisfed.org/docs/api/api_key.html'
            );
        }

        const u = new URL('https://api.stlouisfed.org/fred/series/observations');
        u.searchParams.set('series_id', this.seriesId);
        u.searchParams.set('api_key', this.apiKey);
        u.searchParams.set('file_type', 'json');
        u.searchParams.set('sort_order', 'asc');
        u.searchParams.set('frequency', 'm');
        u.searchParams.set('aggregation_method', 'eop');

        console.log(`Fetching FRED series ${this.seriesId} (monthly, eop)...`);

        const body = await this.downloadJson(u.toString());
        const parsed = JSON.parse(body);

        if (parsed.error_code != null || parsed.error_message) {
            throw new Error(
                `FRED API error: ${parsed.error_message || parsed.error_code}`
            );
        }

        const observations = parsed.observations;
        if (!Array.isArray(observations)) {
            throw new Error('FRED API response missing observations array');
        }

        const points = [];
        for (const row of observations) {
            if (!row || row.value === undefined || row.value === null) continue;
            const raw = String(row.value).trim();
            if (raw === '' || raw === '.') continue;

            const value = parseFloat(raw);
            if (Number.isNaN(value)) continue;

            const period = this.toPeriodFirstOfMonth(row.date);
            if (!period) continue;

            points.push({ period, value });
        }

        points.sort((a, b) => a.period.localeCompare(b.period));

        console.log(`Extracted ${points.length} points from FRED (${this.seriesId})`);
        if (points.length > 0) {
            console.log(`Date range: ${points[0].period} to ${points[points.length - 1].period}`);
        }

        return points;
    }

    /**
     * Map FRED YYYY-MM-DD to calendar month key YYYY-MM-01 (same convention as Shiller/Stooq ingest).
     */
    toPeriodFirstOfMonth(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const y = m[1];
        const mo = m[2];
        return `${y}-${mo}-01`;
    }

    downloadJson(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    const loc = response.headers.location;
                    if (loc) {
                        this.downloadJson(new URL(loc, url).toString()).then(resolve).catch(reject);
                        return;
                    }
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

            request.on('error', reject);
            request.setTimeout(60000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }
}

module.exports = FredIngestionService;
