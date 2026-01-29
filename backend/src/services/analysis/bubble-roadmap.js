const db = require('../../db/connection');

/**
 * Bubble Roadmap Analysis Service
 * 
 * LOGIC:
 * - The X-axis is based on the HISTORICAL crisis series (ending at bottom = rightmost point)
 * - The current series is aligned/fitted to where it best matches the historical trajectory
 * - The result shows how many months the current market is BEFORE the bottom
 */

// Historical events with crash and bottom dates
const HISTORICAL_EVENTS = {
    '1929': {
        name: '1929',
        description: 'Great Depression',
        crashDate: '1929-10-01',
        bottomDate: '1932-06-01',
        color: '#e74c3c'
    },
    '1962': {
        name: '1962',
        description: 'Flash Crash',
        crashDate: '1962-05-01',
        bottomDate: '1962-06-01',
        color: '#9b59b6'
    },
    '1973': {
        name: '1973',
        description: 'Oil Crisis / Stagflation',
        crashDate: '1973-01-01',
        bottomDate: '1974-10-01',
        color: '#e67e22'
    },
    '1980': {
        name: '1980',
        description: 'Double-Dip Recession',
        crashDate: '1980-11-01',
        bottomDate: '1982-08-01',
        color: '#16a085'
    },
    '1987': {
        name: '1987',
        description: 'Black Monday',
        crashDate: '1987-10-01',
        bottomDate: '1987-12-01',
        color: '#34495e'
    },
    '2001': {
        name: '2001',
        description: 'Dot-com Bubble',
        crashDate: '2000-03-01',
        bottomDate: '2002-10-01',
        color: '#3498db'
    },
    '2008': {
        name: '2008',
        description: 'Financial Crisis',
        crashDate: '2008-09-01',
        bottomDate: '2009-03-01',
        color: '#f39c12'
    }
};

function getAvailableCrises() {
    return Object.entries(HISTORICAL_EVENTS).map(([key, event]) => ({
        id: key,
        name: event.name,
        description: event.description,
        crashDate: event.crashDate,
        bottomDate: event.bottomDate
    }));
}

function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function correlation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const mx = mean(x);
    const my = mean(y);
    
    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;
    
    for (let i = 0; i < x.length; i++) {
        const dx = x[i] - mx;
        const dy = y[i] - my;
        numerator += dx * dy;
        sumSqX += dx * dx;
        sumSqY += dy * dy;
    }
    
    const denominator = Math.sqrt(sumSqX * sumSqY);
    if (denominator === 0) return 0;
    
    return numerator / denominator;
}

function calculateScaleFactor(current, historical) {
    if (current.length !== historical.length || current.length === 0) {
        return 1;
    }
    
    const logCurrent = current.map(v => Math.log(Math.max(v, 0.0001)));
    const logHistorical = historical.map(v => Math.log(Math.max(v, 0.0001)));
    
    const meanLogCurrent = mean(logCurrent);
    const meanLogHistorical = mean(logHistorical);
    
    return Math.exp(meanLogCurrent - meanLogHistorical);
}

function monthsBetween(date1Str, date2Str) {
    const d1 = new Date(date1Str);
    const d2 = new Date(date2Str);
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function addMonths(dateStr, months) {
    const d = new Date(dateStr);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d.toISOString().slice(0, 10);
}

function extractHistoricalWindowToBottom(points, bottomDate, windowMonths) {
    const bottom = new Date(bottomDate);
    const endDate = new Date(Date.UTC(bottom.getFullYear(), bottom.getMonth() + 1, 1));
    const startDate = new Date(endDate);
    startDate.setUTCMonth(startDate.getUTCMonth() - windowMonths);
    
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);
    
    return points.filter(p => {
        const periodStr = typeof p.period === 'string' ? p.period : p.period.toISOString().slice(0, 10);
        return periodStr >= startStr && periodStr < endStr;
    }).sort((a, b) => {
        const pa = typeof a.period === 'string' ? a.period : a.period.toISOString().slice(0, 10);
        const pb = typeof b.period === 'string' ? b.period : b.period.toISOString().slice(0, 10);
        return pa.localeCompare(pb);
    });
}

function extractCurrentWindow(points, windowMonths) {
    if (points.length === 0) return [];
    
    const sorted = [...points].sort((a, b) => {
        const pa = typeof a.period === 'string' ? a.period : a.period.toISOString().slice(0, 10);
        const pb = typeof b.period === 'string' ? b.period : b.period.toISOString().slice(0, 10);
        return pa.localeCompare(pb);
    });
    
    return sorted.slice(-windowMonths);
}

/**
 * Find best alignment of current series within historical series
 * 
 * We use a SLIDING WINDOW approach:
 * - Take a comparison window (e.g., last 30 months of current data)
 * - Slide it along the historical series to find the best fit
 * - The result tells us how many months before the bottom we are
 * 
 * Uses CORRELATION as the primary metric to find shape similarity.
 */
function findBestAlignment(currentSeries, historicalSeries, comparisonWindow = 30) {
    const currentValues = currentSeries.map(p => p.value);
    const historicalValues = historicalSeries.map(p => p.value);
    const currentLen = currentValues.length;
    const histLen = historicalValues.length;
    
    // Use a comparison window (subset of current data) for better alignment flexibility
    const windowSize = Math.min(comparisonWindow, currentLen, histLen - 10);
    
    // Take the last 'windowSize' months of current data for comparison
    const currentWindow = currentValues.slice(-windowSize);
    
    let bestEndPos = histLen; // Position where comparison window ENDS in historical
    let bestScale = 1;
    let bestCorr = -Infinity;
    
    // Slide the comparison window along the historical series
    // endPos = windowSize means window ends at position windowSize-1 (early in historical)
    // endPos = histLen means window ends at the bottom
    
    for (let endPos = windowSize; endPos <= histLen; endPos++) {
        const startPos = endPos - windowSize;
        
        // Extract the historical slice for this position
        const histSlice = historicalValues.slice(startPos, endPos);
        
        if (histSlice.length !== currentWindow.length) continue;
        
        // Calculate scale factor
        const scale = calculateScaleFactor(currentWindow, histSlice);
        
        // Apply scale to historical for comparison
        const scaledHist = histSlice.map(v => v * scale);
        
        // Calculate correlation
        const corr = correlation(currentWindow, scaledHist);
        
        if (corr > bestCorr) {
            bestCorr = corr;
            bestEndPos = endPos;
            bestScale = scale;
        }
    }
    
    // monthsToBottom = how many months from where comparison window ends to the bottom
    const monthsToBottom = histLen - bestEndPos;
    
    return {
        monthsToBottom: Math.max(0, monthsToBottom),
        scaleFactor: bestScale,
        correlation: bestCorr,
        alignmentEndPosition: bestEndPos,
        comparisonWindowSize: windowSize
    };
}

function formatDateLabel(dateStr) {
    const [year, month] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
}

/**
 * Compute bubble roadmap analysis for a specific crisis
 */
async function computeBubbleRoadmap(metric, crisisId, windowMonths = 120, maxShiftMonths = 36) {
    try {
        const crisis = HISTORICAL_EVENTS[crisisId];
        if (!crisis) {
            throw new Error(`Unknown crisis: ${crisisId}. Available: ${Object.keys(HISTORICAL_EVENTS).join(', ')}`);
        }
        
        const seriesSlug = metric === 'price' ? 'spx_price_monthly' : 'spx_pe_monthly';
        
        const rawPoints = await db.query(
            `SELECT period, value 
             FROM series_points 
             WHERE series_id = (SELECT id FROM series WHERE slug = ?)
             ORDER BY period ASC`,
            [seriesSlug]
        );
        
        if (rawPoints.length === 0) {
            throw new Error(`No data found for series: ${seriesSlug}`);
        }
        
        const points = rawPoints.map(p => ({
            period: p.period instanceof Date 
                ? p.period.toISOString().slice(0, 10) 
                : String(p.period).slice(0, 10),
            value: parseFloat(p.value)
        }));
        
        console.log(`Total points: ${points.length}, range: ${points[0].period} to ${points[points.length - 1].period}`);
        
        // Extract current window (most recent data)
        const currentWindow = extractCurrentWindow(points, windowMonths);
        if (currentWindow.length === 0) {
            throw new Error('Current window is empty');
        }
        
        const lastPeriod = currentWindow[currentWindow.length - 1].period;
        console.log(`Current window: ${currentWindow.length} points, last period: ${lastPeriod}`);
        
        // Extract historical window ending at the bottom
        const historicalWindow = extractHistoricalWindowToBottom(points, crisis.bottomDate, windowMonths);
        console.log(`Historical window for ${crisisId}: ${historicalWindow.length} points, ending at ${crisis.bottomDate}`);
        
        if (historicalWindow.length < 20) {
            throw new Error(`Not enough historical data for crisis ${crisisId}`);
        }
        
        // Find best alignment using a 30-month comparison window
        const comparisonWindowSize = Math.min(30, Math.floor(windowMonths / 2));
        const alignment = findBestAlignment(currentWindow, historicalWindow, comparisonWindowSize);
        console.log(`Best alignment: ${alignment.monthsToBottom} months to bottom, scale=${alignment.scaleFactor.toFixed(2)}, corr=${alignment.correlation.toFixed(3)}, window=${alignment.comparisonWindowSize}`);
        
        // Build chart data
        // X-axis is based on historical series (0 to histLen-1, with histLen-1 being the bottom)
        const histLen = historicalWindow.length;
        const currentLen = currentWindow.length;
        
        // Historical series for chart (scaled)
        const historicalChartData = historicalWindow.map((p, i) => ({
            position: i,
            value: p.value * alignment.scaleFactor,
            period: p.period
        }));
        
        // Current series position in the historical timeline
        // Current ends at position (histLen - 1 - monthsToBottom)
        const currentEndPos = histLen - 1 - alignment.monthsToBottom;
        const currentStartPos = currentEndPos - currentLen + 1;
        
        // Current series for chart
        const currentChartData = currentWindow.map((p, i) => ({
            position: currentStartPos + i,
            value: p.value,
            period: p.period
        }));
        
        // Generate labels based on historical dates
        const historicalLabels = historicalWindow.map(p => formatDateLabel(p.period));
        
        // Generate labels for current series axis (including projection to the end)
        const currentLabels = new Array(histLen).fill('');
        // Fill in actual current dates
        currentChartData.forEach((p, i) => {
            if (p.position >= 0 && p.position < histLen) {
                currentLabels[p.position] = formatDateLabel(p.period);
            }
        });
        // Project forward from current end to the bottom
        const lastCurrentDate = currentWindow[currentWindow.length - 1].period;
        for (let i = currentEndPos + 1; i < histLen; i++) {
            const monthsFromEnd = i - currentEndPos;
            const projectedDate = addMonths(lastCurrentDate, monthsFromEnd);
            currentLabels[i] = formatDateLabel(projectedDate);
        }
        
        // Calculate crash position within the historical window
        // Find the index of the crash date in the historical window
        let crashPosition = -1;
        const crashDateStr = crisis.crashDate.slice(0, 10);
        for (let i = 0; i < historicalWindow.length; i++) {
            const periodStr = historicalWindow[i].period.slice(0, 10);
            if (periodStr >= crashDateStr) {
                crashPosition = i;
                break;
            }
        }
        // If crash date is before the window, set to 0
        if (crashPosition === -1) {
            crashPosition = 0;
        }
        // Ensure crash is before bottom (should always be, but safety check)
        crashPosition = Math.min(crashPosition, histLen - 2);
        
        // Calculate months to crash
        const currentEndPosition = Math.min(histLen - 1, currentEndPos);
        const monthsToCrash = Math.max(0, crashPosition - currentEndPosition);
        
        // Build arrays for chart (with nulls where data doesn't exist)
        const currentSeriesArray = new Array(histLen).fill(null);
        const historicalSeriesArray = historicalChartData.map(p => p.value);
        
        currentChartData.forEach(p => {
            if (p.position >= 0 && p.position < histLen) {
                currentSeriesArray[p.position] = p.value;
            }
        });
        
        return {
            crisis: {
                id: crisisId,
                name: crisis.name,
                description: crisis.description,
                crashDate: crisis.crashDate,
                bottomDate: crisis.bottomDate,
                color: crisis.color
            },
            current: {
                series: currentWindow,
                lastPeriod: lastPeriod
            },
            alignment: {
                monthsToBottom: alignment.monthsToBottom,
                monthsToCrash: monthsToCrash,
                scaleFactor: alignment.scaleFactor,
                correlation: alignment.correlation
            },
            chart: {
                labels: historicalLabels,
                historicalLabels: historicalLabels,
                currentLabels: currentLabels,
                currentSeries: currentSeriesArray,
                historicalSeries: historicalSeriesArray,
                currentStartPosition: Math.max(0, currentStartPos),
                currentEndPosition: currentEndPosition,
                crashPosition: crashPosition,
                bottomPosition: histLen - 1,
                totalPositions: histLen
            },
            meta: {
                windowMonths: windowMonths,
                maxShiftMonths: maxShiftMonths,
                metric: metric,
                computedAt: new Date().toISOString()
            }
        };
        
    } catch (error) {
        console.error('Error computing bubble roadmap:', error);
        throw error;
    }
}

// Cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getBubbleRoadmap(metric, crisisId, windowMonths = 120, maxShiftMonths = 36) {
    const cacheKey = `${metric}_${crisisId}_${windowMonths}_${maxShiftMonths}`;
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }
    
    const result = await computeBubbleRoadmap(metric, crisisId, windowMonths, maxShiftMonths);
    cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
    });
    
    return result;
}

function clearCache() {
    cache.clear();
    console.log('Bubble roadmap cache cleared');
}

function clearCacheForMetric(metric) {
    const keysToDelete = [];
    for (const key of cache.keys()) {
        if (key.startsWith(`${metric}_`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => cache.delete(key));
    console.log(`Cleared ${keysToDelete.length} cache entries for metric: ${metric}`);
}

module.exports = {
    computeBubbleRoadmap,
    getBubbleRoadmap,
    clearCache,
    clearCacheForMetric,
    getAvailableCrises,
    HISTORICAL_EVENTS
};
