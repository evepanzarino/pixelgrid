-- Initialize belonging database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_picture TEXT,
  handle VARCHAR(50),
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add profile_picture column if it doesn't exist (for existing databases)
-- This is a migration for existing installations
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'profile_picture';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN profile_picture TEXT'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create admin user (password: TrueLove25320664!)
-- bcrypt hash for TrueLove25320664!
INSERT INTO users (username, email, password_hash, role) VALUES 
  ('evepanzarino', 'eve@evepanzarino.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDq8cXZj1SHzPPQl5VXfqsaXvVdT7W', 'admin')
ON DUPLICATE KEY UPDATE role = 'admin';

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content LONGTEXT NOT NULL,
  custom_css TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
