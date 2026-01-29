const ShillerIngestionService = require('./shiller');
const StooqIngestionService = require('./stooq');

/**
 * Ingestion Service Factory
 * Creates ingestion service instances based on source type
 */

// Registry of available ingestion services
const registry = {
    shiller: ShillerIngestionService,
    stooq: StooqIngestionService
};

/**
 * Create an ingestion service instance
 * @param {string} sourceType - Type of source ('shiller', 'stooq')
 * @param {Object} config - Configuration for the service
 * @returns {Object} Ingestion service instance
 */
function create(sourceType, config = {}) {
    const ServiceClass = registry[sourceType];
    
    if (!ServiceClass) {
        throw new Error(`Unknown source type: ${sourceType}. Available: ${Object.keys(registry).join(', ')}`);
    }
    
    return new ServiceClass(config);
}

/**
 * Get list of available source types
 * @returns {string[]} Array of source type names
 */
function getAvailableTypes() {
    return Object.keys(registry);
}

/**
 * Check if a source type is available
 * @param {string} sourceType - Type to check
 * @returns {boolean}
 */
function isAvailable(sourceType) {
    return sourceType in registry;
}

/**
 * Fetch data from multiple sources and merge them
 * Sources are processed in priority order (lower priority number = higher priority)
 * @param {Array} sources - Array of { type, priority, config }
 * @param {string} seriesType - Type of series data ('price', 'pe')
 * @param {string} mergeStrategy - 'fill_gaps' (default) or 'overwrite'
 * @returns {Array} Merged data points with source metadata
 */
async function fetchAndMerge(sources, seriesType, mergeStrategy = 'fill_gaps') {
    // Sort by priority (lower = higher priority)
    const sortedSources = [...sources].sort((a, b) => a.priority - b.priority);
    
    // Map of period -> { value, source }
    const dataMap = new Map();
    
    for (const source of sortedSources) {
        try {
            console.log(`Fetching from ${source.type} (priority ${source.priority})...`);
            
            const service = create(source.type, source.config);
            const points = await service.fetchData(seriesType);
            
            console.log(`  Got ${points.length} points from ${source.type}`);
            
            for (const point of points) {
                const existing = dataMap.get(point.period);
                
                if (mergeStrategy === 'fill_gaps') {
                    // Only add if not already present (higher priority wins)
                    if (!existing) {
                        dataMap.set(point.period, {
                            period: point.period,
                            value: point.value,
                            source: source.type
                        });
                    }
                } else if (mergeStrategy === 'overwrite') {
                    // Lower priority number overwrites
                    dataMap.set(point.period, {
                        period: point.period,
                        value: point.value,
                        source: source.type
                    });
                }
            }
        } catch (error) {
            console.error(`Error fetching from ${source.type}:`, error.message);
            // Continue with other sources
        }
    }
    
    // Convert to array and sort by period
    const merged = Array.from(dataMap.values());
    merged.sort((a, b) => a.period.localeCompare(b.period));
    
    // Log statistics
    const sourceCounts = {};
    for (const point of merged) {
        sourceCounts[point.source] = (sourceCounts[point.source] || 0) + 1;
    }
    console.log('Merge statistics:', sourceCounts);
    
    if (merged.length > 0) {
        console.log(`Total: ${merged.length} points, range: ${merged[0].period} to ${merged[merged.length - 1].period}`);
    }
    
    return merged;
}

module.exports = {
    create,
    getAvailableTypes,
    isAvailable,
    fetchAndMerge,
    registry
};
