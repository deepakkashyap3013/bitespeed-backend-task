-- +migrate Up
-- Write your up migration here
-- Function to update 'updatedAt' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updated_at" = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Contact Table
CREATE TABLE IF NOT EXISTS "contacts" (
  id SERIAL PRIMARY KEY,
  "phone_number" VARCHAR(255),
  email VARCHAR(255),
  "linked_id" INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  "link_precedence" VARCHAR(10) NOT NULL CHECK ("link_precedence" IN ('primary', 'secondary')),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ
);

-- Trigger to automatically update 'updated_at' on row update
CREATE TRIGGER update_contact_updated_at
BEFORE UPDATE ON "contacts"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_contact_email ON contacts(email) WHERE "deleted_at" IS NULL;
CREATE INDEX idx_contact_phone_number ON contacts(phone_number) WHERE "deleted_at" IS NULL;
CREATE INDEX idx_contact_linked_id ON contacts(linked_id) WHERE "deleted_at" IS NULL;
CREATE INDEX idx_contact_link_precedence ON contacts(link_precedence) WHERE "deleted_at" IS NULL;

-- +migrate Down
-- Write your down migration here
DROP INDEX IF EXISTS idx_contact_email;
DROP INDEX IF EXISTS idx_contact_phone_number;
DROP INDEX IF EXISTS idx_contact_linked_id;
DROP INDEX IF EXISTS idx_contact_link_precedence;
DROP TRIGGER IF EXISTS update_contact_updated_at ON "contacts";
DROP TABLE IF EXISTS "contacts" CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column();

