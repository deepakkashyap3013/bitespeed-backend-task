"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.migrator = void 0;
exports.runMigrations = runMigrations;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const migrator_1 = require("./migrator");
dotenv_1.default.config();
// Database configuration
const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};
const pool = new pg_1.Pool(dbConfig);
exports.pool = pool;
const migrator = new migrator_1.DatabaseMigrator(pool);
exports.migrator = migrator;
async function runMigrations() {
    const command = process.argv[2];
    const steps = parseInt(process.argv[3]) || 1;
    try {
        switch (command) {
            case 'up':
                await migrator.migrateUp();
                break;
            case 'down':
                await migrator.migrateDown(steps);
                break;
            case 'status':
                await migrator.getStatus();
                break;
            default:
                console.log('Usage: npm run migrate [up|down|status] [steps]');
                console.log('Examples:');
                console.log('  npm run migrate up       - Apply all pending migrations');
                console.log('  npm run migrate down     - Rollback last migration');
                console.log('  npm run migrate down 3   - Rollback last 3 migrations');
                console.log('  npm run migrate status   - Show migration status');
        }
    }
    catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
    finally {
        await pool.end();
    }
}
// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations();
}
