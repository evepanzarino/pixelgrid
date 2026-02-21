-- Add evepanzarino (id=1) to conversation 1 if not already there
INSERT IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (1, 1);
-- Insert a message from another user (id=7) to id=1
INSERT INTO messages (conversation_id, sender_id, content) VALUES (1, 7, 'Hello! This is an unread message test.');
-- Also insert an unread notification for likes
INSERT INTO notifications (user_id, actor_id, type, post_id, is_read) VALUES (1, 7, 'like', 106, FALSE);
