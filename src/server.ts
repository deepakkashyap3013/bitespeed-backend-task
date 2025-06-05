import app from './app';
import db from './db';

const PORT = process.env.PORT || 8080;

async function startServer() {
    try {
        // Test database connection first
        console.log('Testing database connection...');
        await db.query('SELECT NOW()');
        console.log('Database connected successfully');

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    try {
        await db.end();
        console.log('Database connection closed');
    } catch (err) {
        console.error('Error closing database connection:', err);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    try {
        await db.end();
        console.log('Database connection closed');
    } catch (err) {
        console.error('Error closing database connection:', err);
    }
    process.exit(0);
});

startServer();