#!/usr/bin/env node
/**
 * One-time or manual: migrate spx_price_monthly secondary source Stooq -> FRED in DB.
 * Idempotent. App startup also runs this via setup.js.
 */
require('dotenv').config();
const { patchSpxFredSourceIfNeeded } = require('../src/db/setup');

patchSpxFredSourceIfNeeded()
    .then((changed) => {
        console.log(changed ? 'Updated spx_price_monthly to FRED.' : 'No change needed.');
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
