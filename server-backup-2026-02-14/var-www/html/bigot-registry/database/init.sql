-- Bigot Registry Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS bigot_registry CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bigot_registry;

-- Main people table
CREATE TABLE IF NOT EXISTS people (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    profile_photo_url VARCHAR(2000),
    phone_number VARCHAR(50),
    location VARCHAR(255),
    family_members TEXT,
    description LONGTEXT,
    markup_content LONGTEXT,
    social_link VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for search performance
    INDEX idx_name (first_name, last_name),
    INDEX idx_last_name (last_name),
    INDEX idx_slug (slug),
    INDEX idx_location (location),
    FULLTEXT INDEX ft_search (first_name, middle_name, last_name, description, family_members)
) ENGINE=InnoDB;

-- Hate records table (blog-style posts for each person)
CREATE TABLE IF NOT EXISTS hate_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL,
    title VARCHAR(500),
    content LONGTEXT NOT NULL,
    incident_date DATE,
    source_url VARCHAR(2000),
    media_urls TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    INDEX idx_person (person_id),
    INDEX idx_date (incident_date),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Social profiles table (multiple social links per person)
CREATE TABLE IF NOT EXISTS social_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL,
    platform VARCHAR(100),
    url VARCHAR(2000) NOT NULL,
    username VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    INDEX idx_person (person_id)
) ENGINE=InnoDB;

-- Create application user
CREATE USER IF NOT EXISTS 'bigot_registry'@'%' IDENTIFIED BY 'BigotRegistry2026!';
GRANT ALL PRIVILEGES ON bigot_registry.* TO 'bigot_registry'@'%';
FLUSH PRIVILEGES;
