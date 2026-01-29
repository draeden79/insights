const db = require('../connection');

/**
 * Seed initial series definitions
 */
async function seedSeries() {
    try {
        console.log('Seeding series...');
        
        const series = [
            {
                slug: 'spx_price_monthly',
                name: 'S&P 500 Price (Monthly)',
                description: 'Monthly closing price of S&P 500 index from Shiller + Stooq datasets',
                frequency: 'M',
                unit: 'index_points',
                source_type: 'multi',
                source_config_json: JSON.stringify({
                    sources: [
                        { 
                            type: 'shiller', 
                            priority: 1, 
                            config: { 
                                url: process.env.SHILLER_DATA_URL || 'http://www.econ.yale.edu/~shiller/data/ie_data.xls',
                                type: 'price' 
                            } 
                        },
                        { 
                            type: 'stooq', 
                            priority: 2, 
                            config: { 
                                symbol: '^spx', 
                                interval: 'm' 
                            } 
                        }
                    ],
                    merge_strategy: 'fill_gaps'
                }),
                transform_config_json: JSON.stringify({
                    normalize_date: true,
                    round_decimals: 2
                })
            },
            {
                slug: 'spx_pe_monthly',
                name: 'S&P 500 P/E Ratio (Monthly)',
                description: 'Monthly P/E ratio of S&P 500 index from Shiller dataset',
                frequency: 'M',
                unit: 'ratio',
                source_type: 'shiller',
                source_config_json: JSON.stringify({
                    url: process.env.SHILLER_DATA_URL || 'http://www.econ.yale.edu/~shiller/data/ie_data.xls',
                    type: 'pe',
                    date_column: 'Date',
                    price_column: 'Price',
                    earnings_column: 'Earnings'
                }),
                transform_config_json: JSON.stringify({
                    normalize_date: true,
                    round_decimals: 2
                })
            }
        ];
        
        for (const s of series) {
            // Check if series already exists
            const existing = await db.queryOne(
                'SELECT id FROM series WHERE slug = ?',
                [s.slug]
            );
            
            if (existing) {
                console.log(`Series ${s.slug} already exists, skipping...`);
                continue;
            }
            
            await db.query(
                `INSERT INTO series 
                 (slug, name, description, frequency, unit, source_type, source_config_json, transform_config_json, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
                [
                    s.slug,
                    s.name,
                    s.description,
                    s.frequency,
                    s.unit,
                    s.source_type,
                    s.source_config_json,
                    s.transform_config_json
                ]
            );
            
            console.log(`Created series: ${s.slug}`);
        }
        
        console.log('Seed completed successfully!');
        
    } catch (error) {
        console.error('Error seeding series:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedSeries()
        .then(() => {
            console.log('Done');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seed failed:', error);
            process.exit(1);
        });
}

module.exports = seedSeries;
