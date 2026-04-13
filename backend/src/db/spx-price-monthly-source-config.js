/**
 * Shared source config for spx_price_monthly (Shiller + FRED fill_gaps).
 * Used by seed and by setup migration from legacy Stooq.
 */
function buildSpxPriceMonthlySourceConfig() {
    return {
        sources: [
            {
                type: 'shiller',
                priority: 1,
                config: {
                    url:
                        process.env.SHILLER_DATA_URL ||
                        'http://www.econ.yale.edu/~shiller/data/ie_data.xls',
                    type: 'price'
                }
            },
            {
                type: 'fred',
                priority: 2,
                config: {
                    type: 'price',
                    series_id: 'SP500'
                }
            }
        ],
        merge_strategy: 'fill_gaps'
    };
}

function spxPriceMonthlySourceConfigJson() {
    return JSON.stringify(buildSpxPriceMonthlySourceConfig());
}

module.exports = {
    buildSpxPriceMonthlySourceConfig,
    spxPriceMonthlySourceConfigJson
};
