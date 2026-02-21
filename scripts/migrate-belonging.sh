#!/bin/bash
# Run this script when Docker is running to apply belonging database migrations
# Usage: bash scripts/migrate-belonging.sh

set -e

DB_HOST="127.0.0.1"
DB_PORT="3307"
DB_USER="belonging"
DB_PASS="belonging"
DB_NAME="belonging"

echo "Applying migrations to ${DB_NAME} database..."

mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" <<'SQL'

-- Add member status columns to users (safe to run multiple times)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_member'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users
     ADD COLUMN is_member BOOLEAN NOT NULL DEFAULT FALSE,
     ADD COLUMN member_granted_at TIMESTAMP NULL,
     ADD COLUMN member_granted_by INT NULL',
  'SELECT "is_member column already exists" AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  thumbnail_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  INDEX idx_message_id (message_id)
);

SELECT 'Migrations applied successfully!' AS result;

SQL

echo "Done!"
