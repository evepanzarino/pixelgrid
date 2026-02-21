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

-- User Skills table (RuneScape-style leveling)
CREATE TABLE IF NOT EXISTS user_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_name VARCHAR(50) NOT NULL,
  xp INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_skill (user_id, skill_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- XP History table (for tracking XP gains)
CREATE TABLE IF NOT EXISTS xp_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_name VARCHAR(50) NOT NULL,
  xp_gained INT NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Conversations table (for instant messaging)
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,
  last_read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_participant (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tribes table
CREATE TABLE IF NOT EXISTS tribes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tag VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#667eea',
  icon VARCHAR(50) DEFAULT '🏳️‍🌈',
  banner_url TEXT,
  owner_id INT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tribe members table
CREATE TABLE IF NOT EXISTS tribe_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tribe_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('member', 'moderator', 'admin', 'owner') DEFAULT 'member',
  show_on_profile BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tribe_member (tribe_id, user_id),
  FOREIGN KEY (tribe_id) REFERENCES tribes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tribe announcements/posts
CREATE TABLE IF NOT EXISTS tribe_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tribe_id INT NOT NULL,
  user_id INT NOT NULL,
  content LONGTEXT NOT NULL,
  is_announcement BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tribe_id) REFERENCES tribes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- DISCORD INTEGRATION TABLES
-- ============================================

-- Add Discord fields to users (migration-safe)
SET @columnname = 'discord_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN discord_id VARCHAR(50) UNIQUE'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'discord_username';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN discord_username VARCHAR(100)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'discord_avatar';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN discord_avatar VARCHAR(255)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Discord post sync table (tracks which posts are synced between Discord and website)
CREATE TABLE IF NOT EXISTS discord_post_sync (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT,
  discord_message_id VARCHAR(50) NOT NULL UNIQUE,
  discord_channel_id VARCHAR(50) NOT NULL,
  discord_thread_id VARCHAR(50),
  discord_user_id VARCHAR(50),
  direction ENUM('discord_to_web', 'web_to_discord') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
);

-- Discord comment sync table (tracks which comments are synced)
CREATE TABLE IF NOT EXISTS discord_comment_sync (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT,
  discord_message_id VARCHAR(50) NOT NULL UNIQUE,
  discord_thread_id VARCHAR(50),
  discord_user_id VARCHAR(50),
  direction ENUM('discord_to_web', 'web_to_discord') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE SET NULL
);

-- Discord-only users (for users with "connected" role but no belonging account)
CREATE TABLE IF NOT EXISTS discord_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  discord_id VARCHAR(50) NOT NULL UNIQUE,
  discord_username VARCHAR(100) NOT NULL,
  discord_discriminator VARCHAR(10),
  discord_avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
