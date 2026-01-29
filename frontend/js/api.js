/**
 * API Client for Alitar Financial Explorer
 */

/**
 * Detect base path from current URL
 * - localhost:3000/sp500-crash-radar → basePath = ""
 * - alitar.one/insights/sp500-crash-radar → basePath = "/insights"
 */
function getBasePath() {
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    // If we have more than 1 segment, base path is everything except the last (insight slug)
    if (parts.length > 1) {
        return '/' + parts.slice(0, -1).join('/');
    }
    return '';
}

const API_BASE_URL = window.location.origin + getBasePath();

/**
 * Fetch series data
 */
async function fetchSeries(slug, options = {}) {
    const { from, to } = options;
    let url = `${API_BASE_URL}/api/series/${slug}`;
    const params = new URLSearchParams();
    
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    if (params.toString()) {
        url += '?' + params.toString();
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

/**
 * Fetch list of available crises
 */
async function fetchCrises() {
    const url = `${API_BASE_URL}/api/analysis/crises`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

/**
 * Fetch bubble roadmap analysis
 */
async function fetchBubbleRoadmap(options = {}) {
    const { metric = 'price', crisis = '2008', window = 60, shift = 36 } = options;
    
    const params = new URLSearchParams({
        metric,
        crisis,
        window: window.toString(),
        shift: shift.toString()
    });
    
    const url = `${API_BASE_URL}/api/analysis/bubble-roadmap?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `API error: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Fetch health status
 */
async function fetchHealth() {
    const url = `${API_BASE_URL}/health`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
    }
    
    return await response.json();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fetchSeries, fetchCrises, fetchBubbleRoadmap, fetchHealth };
}
