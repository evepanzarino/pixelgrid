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
