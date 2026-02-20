#!/bin/bash
# migrate-permissions.sh
# Adds ban/mute/upload_limit columns to the users table on the live DB.
# Run from the project root on the VPS:
#   bash scripts/migrate-permissions.sh

set -e

CONTAINER="belonging-mysql"
DB_NAME="belonging"
DB_USER="belonging"

echo "Running permissions migration on container: $CONTAINER"

docker exec -i "$CONTAINER" mysql -u"$DB_USER" -p"${DB_PASSWORD:-TrueLove25320664!}" "$DB_NAME" <<'SQL'

-- Add column only if it doesn't exist (MySQL 8.0 compatible)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_banned');
SET @sql := IF(@col = 0, 'ALTER TABLE users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'banned_at');
SET @sql := IF(@col = 0, 'ALTER TABLE users ADD COLUMN banned_at TIMESTAMP NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'banned_by');
SET @sql := IF(@col = 0, 'ALTER TABLE users ADD COLUMN banned_by INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_muted');
SET @sql := IF(@col = 0, 'ALTER TABLE users ADD COLUMN is_muted BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'muted_at');
SET @sql := IF(@col = 0, 'ALTER TABLE users ADD COLUMN muted_at TIMESTAMP NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'muted_by');
SET @sql := IF(@col = 0, 'ALTER TABLE users ADD COLUMN muted_by INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'upload_limit_mb');
SET @sql := IF(@col = 0, 'ALTER TABLE users ADD COLUMN upload_limit_mb INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migration complete.' AS status;
DESCRIBE users;
SQL

echo "Done."
