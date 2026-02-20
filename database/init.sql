-- Create databases
CREATE DATABASE IF NOT EXISTS app_database;
CREATE DATABASE IF NOT EXISTS blog;
CREATE DATABASE IF NOT EXISTS `dev-blog`;

-- Create user with permissions
CREATE USER IF NOT EXISTS 'evepanzarino'@'%' IDENTIFIED BY 'TrueLove25320664!';

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON app_database.* TO 'evepanzarino'@'%';
GRANT ALL PRIVILEGES ON blog.* TO 'evepanzarino'@'%';
GRANT ALL PRIVILEGES ON `dev-blog`.* TO 'evepanzarino'@'%';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Use app_database for sample data
USE app_database;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO users (name, email) VALUES
('John Doe', 'john@example.com'),
('Jane Smith', 'jane@example.com'),
('Bob Johnson', 'bob@example.com');

INSERT INTO items (name, description) VALUES
('Item 1', 'Description for item 1'),
('Item 2', 'Description for item 2'),
('Item 3', 'Description for item 3');

-- ============================================================
-- Belonging app database migrations
-- Run these against the 'belonging' database when Docker is up
-- ============================================================

-- Member status columns (run once on live DB)
-- ALTER TABLE users
--   ADD COLUMN IF NOT EXISTS is_member BOOLEAN NOT NULL DEFAULT FALSE,
--   ADD COLUMN IF NOT EXISTS member_granted_at TIMESTAMP NULL,
--   ADD COLUMN IF NOT EXISTS member_granted_by INT NULL;

-- Message attachments table (run once on live DB)
-- CREATE TABLE IF NOT EXISTS message_attachments (
--   id INT PRIMARY KEY AUTO_INCREMENT,
--   message_id INT NULL,
--   file_url VARCHAR(500) NOT NULL,
--   file_name VARCHAR(255) NOT NULL,
--   file_size BIGINT NOT NULL,
--   file_type VARCHAR(100) NOT NULL,
--   thumbnail_url VARCHAR(500) NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
--   INDEX idx_message_id (message_id)
-- );
