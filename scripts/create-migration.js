const fs = require("fs");
const path = require("path");

function createMigration() {
  const name = process.argv[2];
  if (!name) {
    console.error("Please provide a migration name");
    console.log("Usage: npm run migrate:create <migration_name>");
    process.exit(1);
  }

  const migrationsDir = "./src/db/migrations/sql";
  const currTimestamp = new Date().getTime();

  const filename = `${currTimestamp}_${name
    .toLowerCase()
    .replace(/\s+/g, "_")}.sql`;
  const filepath = path.join(migrationsDir, filename);

  const template = `-- +migrate Up
-- Write your up migration here

-- +migrate Down
-- Write your down migration here
    
`;

  fs.writeFileSync(filepath, template);
  console.log(`Created migration: ${filepath}`);
}

if (require.main === module) {
  createMigration();
}
