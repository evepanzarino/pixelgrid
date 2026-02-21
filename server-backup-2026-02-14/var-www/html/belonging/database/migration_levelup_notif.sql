-- Update notifications table type enum
ALTER TABLE notifications MODIFY COLUMN type ENUM('like', 'favorite', 'comment', 'repost', 'follow', 'level_up') NOT NULL;

-- Add columns for level up metadata
ALTER TABLE notifications ADD COLUMN skill_name VARCHAR(50);
ALTER TABLE notifications ADD COLUMN new_level INT;
