import { Pool, PoolClient } from 'pg';
import fs from 'fs/promises';
import path from 'path';

interface Migration {
    id: string;
    filename: string;
    applied_at?: Date;
}

interface MigrationFile {
    id: string;
    filename: string;
    upSql: string;
    downSql: string;
}

export class DatabaseMigrator {
    private pool: Pool;
    private migrationsDir: string;

    constructor(pool: Pool, migrationsDir: string = './src/db/migrations/sql') {
        this.pool = pool;
        this.migrationsDir = migrationsDir;
    }

    // Initialize migrations table
    private async initializeMigrationsTable(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
            id VARCHAR(255) PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        } finally {
            client.release();
        }
    }

    // Get applied migrations from database
    private async getAppliedMigrations(): Promise<Migration[]> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT id, filename, applied_at FROM migrations ORDER BY applied_at ASC'
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Parse migration file to extract up and down SQL
    private parseMigrationFile(content: string): { upSql: string; downSql: string } {
        const lines = content.split('\n');
        let upSql = '';
        let downSql = '';
        let currentSection = '';

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('-- +migrate Up')) {
                currentSection = 'up';
                continue;
            } else if (trimmed.startsWith('-- +migrate Down')) {
                currentSection = 'down';
                continue;
            }

            if (currentSection === 'up') {
                upSql += line + '\n';
            } else if (currentSection === 'down') {
                downSql += line + '\n';
            }
        }

        return { upSql: upSql.trim(), downSql: downSql.trim() };
    }

    // Get all migration files from directory
    private async getMigrationFiles(): Promise<MigrationFile[]> {
        try {
            const files = await fs.readdir(this.migrationsDir);
            const migrationFiles: MigrationFile[] = [];

            for (const filename of files) {
                if (!filename.endsWith('.sql')) continue;

                const filepath = path.join(this.migrationsDir, filename);
                const content = await fs.readFile(filepath, 'utf-8');
                const { upSql, downSql } = this.parseMigrationFile(content);

                // Extract migration id from filename (e.g., "001_create_users.sql" -> "001")
                const id = filename.split('_')[0];

                migrationFiles.push({
                    id,
                    filename,
                    upSql,
                    downSql
                });
            }

            // Sort by migration id
            return migrationFiles.sort((a, b) => a.id.localeCompare(b.id));
        } catch (error) {
            console.error('Error reading migration files:', error);
            return [];
        }
    }

    // Run a single migration up
    private async runMigrationUp(migration: MigrationFile, client: PoolClient): Promise<void> {
        console.log(`Running migration up: ${migration.filename}`);

        if (migration.upSql) {
            await client.query(migration.upSql);
        }

        await client.query(
            'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
            [migration.id, migration.filename]
        );
    }

    // Run a single migration down
    private async runMigrationDown(migration: MigrationFile, client: PoolClient): Promise<void> {
        console.log(`Running migration down: ${migration.filename}`);

        if (migration.downSql) {
            await client.query(migration.downSql);
        }

        await client.query('DELETE FROM migrations WHERE id = $1', [migration.id]);
    }

    // Migrate up - apply pending migrations
    async migrateUp(): Promise<void> {
        await this.initializeMigrationsTable();

        const appliedMigrations = await this.getAppliedMigrations();
        const migrationFiles = await this.getMigrationFiles();
        const appliedIds = new Set(appliedMigrations.map(m => m.id));

        const pendingMigrations = migrationFiles.filter(m => !appliedIds.has(m.id));

        if (pendingMigrations.length === 0) {
            console.log('No pending migrations to apply.');
            return;
        }

        console.log(`Applying ${pendingMigrations.length} pending migration(s)...`);

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            for (const migration of pendingMigrations) {
                await this.runMigrationUp(migration, client);
            }

            await client.query('COMMIT');
            console.log('All migrations applied successfully.');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Migration failed, rolled back:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Migrate down - rollback migrations
    async migrateDown(steps: number = 1): Promise<void> {
        await this.initializeMigrationsTable();

        const appliedMigrations = await this.getAppliedMigrations();
        const migrationFiles = await this.getMigrationFiles();

        if (appliedMigrations.length === 0) {
            console.log('No migrations to rollback.');
            return;
        }

        // Get migrations to rollback (in reverse order)
        const migrationsToRollback = appliedMigrations
            .slice(-steps)
            .reverse();

        console.log(`Rolling back ${migrationsToRollback.length} migration(s)...`);

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            for (const appliedMigration of migrationsToRollback) {
                const migrationFile = migrationFiles.find(m => m.id === appliedMigration.id);
                if (migrationFile) {
                    await this.runMigrationDown(migrationFile, client);
                }
            }

            await client.query('COMMIT');
            console.log('Migrations rolled back successfully.');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Rollback failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Get migration status
    async getStatus(): Promise<void> {
        await this.initializeMigrationsTable();

        const appliedMigrations = await this.getAppliedMigrations();
        const migrationFiles = await this.getMigrationFiles();
        const appliedIds = new Set(appliedMigrations.map(m => m.id));

        console.log('\nMigration Status:');
        console.log('=================');

        for (const file of migrationFiles) {
            const status = appliedIds.has(file.id) ? '✓ Applied' : '✗ Pending';
            const appliedAt = appliedMigrations.find(m => m.id === file.id)?.applied_at;
            console.log(`${status} - ${file.filename}${appliedAt ? ` (${appliedAt})` : ''}`);
        }
    }
}
