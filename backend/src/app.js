require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (allow all origins for public API)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Routes
app.use('/api/series', require('./routes/api/series'));
app.use('/api/analysis', require('./routes/api/analysis'));
app.use('/health', require('./routes/health'));

// Frontend path
const frontendPath = path.join(__dirname, '../../frontend');

// Insight routes (must be before static middleware)
// Root redirects to the main insight
app.get('/', (req, res) => {
    res.redirect(302, '/sp500-crash-radar');
});

// Main insight: S&P 500 Crash Radar
app.get('/sp500-crash-radar', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Serve static frontend files (js, css, images, etc.)
app.use(express.static(frontendPath));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
async function start() {
    try {
        // Test database connection
        const dbStatus = await db.testConnection();
        if (!dbStatus.connected) {
            console.error('Database connection failed:', dbStatus.error || 'Unknown error');
            console.error('Please check your .env file and ensure MySQL is running.');
            console.error('DB Config:', {
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                database: process.env.DB_NAME,
                port: process.env.DB_PORT
            });
            process.exit(1);
        }
        
        console.log('Database connected successfully');
        
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, closing connections...');
    await db.close();
    process.exit(0);
});

start();
