CREATE DATABASE IF NOT EXISTS timeline_db;
USE timeline_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timeline entries table
CREATE TABLE IF NOT EXISTS timeline_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500) NOT NULL,
  date DATE NOT NULL,
  title VARCHAR(255),
  slug VARCHAR(255),
  description TEXT,
  html_content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  UNIQUE INDEX idx_slug (slug)
);

-- Insert admin user (password: TrueLove25320664!)
-- bcrypt hash with 10 rounds
INSERT INTO users (username, password, is_admin) VALUES 
('evepanzarino', '$2a$10$YF1j6KQGqRGp9VYmZMGQc.VU.Q5Y5YJK5eRJkFRR7j5Y5Y5Y5Y5Y5', TRUE)
ON DUPLICATE KEY UPDATE is_admin = TRUE;
