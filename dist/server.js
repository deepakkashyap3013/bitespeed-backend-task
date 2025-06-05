"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./db"));
const PORT = process.env.PORT || 8080;
async function startServer() {
    try {
        // Test database connection first
        console.log('Testing database connection...');
        await db_1.default.query('SELECT NOW()');
        console.log('Database connected successfully');
        // Start the server
        app_1.default.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    try {
        await db_1.default.end();
        console.log('Database connection closed');
    }
    catch (err) {
        console.error('Error closing database connection:', err);
    }
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    try {
        await db_1.default.end();
        console.log('Database connection closed');
    }
    catch (err) {
        console.error('Error closing database connection:', err);
    }
    process.exit(0);
});
startServer();
