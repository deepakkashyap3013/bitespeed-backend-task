-- +migrate Up
-- Write your up migration here
CREATE TABLE IF NOT EXISTS test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- +migrate Down
-- Write your down migration here
DROP TABLE IF EXISTS test_table;


