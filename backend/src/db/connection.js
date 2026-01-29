const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

/**
 * Get or create MySQL connection pool
 */
function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'alitar_financial',
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });
    }
    return pool;
}

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT 1 as test');
        return { connected: true, test: rows[0].test };
    } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        const errorCode = error.code || 'UNKNOWN';
        const errorErrno = error.errno || null;
        
        // Common MySQL error codes
        let userMessage = errorMessage;
        if (errorCode === 'ECONNREFUSED') {
            userMessage = 'MySQL server is not running or not accessible';
        } else if (errorCode === 'ER_ACCESS_DENIED_ERROR' || errorErrno === 1045) {
            userMessage = 'Access denied. Check username and password in .env file';
        } else if (errorCode === 'ER_BAD_DB_ERROR' || errorErrno === 1049) {
            userMessage = `Database '${process.env.DB_NAME}' does not exist. Please create it first.`;
        }
        
        return { 
            connected: false, 
            error: userMessage,
            code: errorCode,
            errno: errorErrno,
            originalMessage: errorMessage
        };
    }
}

/**
 * Execute a query with parameters
 */
async function query(sql, params = []) {
    const pool = getPool();
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

/**
 * Execute a query and return first row
 */
async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Close connection pool
 */
async function close() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

module.exports = {
    getPool,
    testConnection,
    query,
    queryOne,
    close
};
