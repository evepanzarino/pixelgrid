ALTER TABLE notifications MODIFY COLUMN type ENUM('like', 'favorite', 'comment', 'repost', 'follow') NOT NULL;
