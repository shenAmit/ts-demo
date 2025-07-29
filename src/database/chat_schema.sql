-- Migration for chat database schema
-- Run this after generating with: npm run db:generate

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_created ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user_conversation ON participants(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation_active ON participants(conversation_id, is_active);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_emoji ON message_reactions(message_id, emoji);
CREATE INDEX IF NOT EXISTS idx_message_mentions_user_unread ON message_mentions(mentioned_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status, is_visible);

-- Full-text search index for message content
ALTER TABLE messages ADD FULLTEXT(content);

-- Add check constraints for data integrity
ALTER TABLE conversations ADD CONSTRAINT chk_conversation_type 
  CHECK (type IN ('direct', 'group', 'channel'));

ALTER TABLE messages ADD CONSTRAINT chk_message_type 
  CHECK (type IN ('text', 'image', 'file', 'audio', 'video', 'system'));

ALTER TABLE participants ADD CONSTRAINT chk_participant_role 
  CHECK (role IN ('owner', 'admin', 'moderator', 'member'));

ALTER TABLE user_presence ADD CONSTRAINT chk_presence_status 
  CHECK (status IN ('online', 'away', 'busy', 'offline'));

-- Triggers for maintaining conversation statistics
DELIMITER //

CREATE TRIGGER update_conversation_message_count 
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
  UPDATE conversations 
  SET message_count = message_count + 1,
      last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
END//

CREATE TRIGGER update_conversation_participant_count 
AFTER INSERT ON participants
FOR EACH ROW
BEGIN
  IF NEW.is_active = 1 THEN
    UPDATE conversations 
    SET participant_count = participant_count + 1
    WHERE id = NEW.conversation_id;
  END IF;
END//

CREATE TRIGGER update_conversation_participant_count_on_leave 
AFTER UPDATE ON participants
FOR EACH ROW
BEGIN
  IF OLD.is_active = 1 AND NEW.is_active = 0 THEN
    UPDATE conversations 
    SET participant_count = participant_count - 1
    WHERE id = NEW.conversation_id;
  ELSEIF OLD.is_active = 0 AND NEW.is_active = 1 THEN
    UPDATE conversations 
    SET participant_count = participant_count + 1
    WHERE id = NEW.conversation_id;
  END IF;
END//

-- Trigger to clean up old typing indicators (optional - can also use a cron job)
CREATE EVENT IF NOT EXISTS cleanup_typing_indicators
ON SCHEDULE EVERY 30 SECOND
DO
BEGIN
  DELETE FROM typing_indicators WHERE expires_at < NOW();
END//

DELIMITER ;

-- Create views for common queries
CREATE VIEW conversation_summary AS
SELECT 
  c.*,
  COUNT(DISTINCT p.user_id) as active_participant_count,
  COUNT(DISTINCT m.id) as total_message_count,
  MAX(m.created_at) as actual_last_message_at
FROM conversations c
LEFT JOIN participants p ON c.id = p.conversation_id AND p.is_active = 1
LEFT JOIN messages m ON c.id = m.conversation_id AND m.is_deleted = 0
GROUP BY c.id;

CREATE VIEW user_conversation_summary AS
SELECT 
  p.user_id,
  c.id as conversation_id,
  c.name,
  c.type,
  c.last_message_at,
  p.role,
  p.last_seen_at,
  p.notifications_enabled,
  COUNT(CASE WHEN m.id > COALESCE(p.last_read_message_id, 0) AND m.is_deleted = 0 THEN 1 END) as unread_count
FROM participants p
JOIN conversations c ON p.conversation_id = c.id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE p.is_active = 1
GROUP BY p.user_id, c.id;

-- Stored procedures for complex operations
DELIMITER //

CREATE PROCEDURE GetUserConversations(IN user_id INT, IN page_limit INT, IN page_offset INT)
BEGIN
  SELECT 
    ucs.*,
    u.name as last_message_sender_name,
    m.content as last_message_content,
    m.type as last_message_type,
    m.created_at as last_message_created_at
  FROM user_conversation_summary ucs
  LEFT JOIN messages m ON ucs.conversation_id = m.conversation_id 
    AND m.created_at = ucs.last_message_at
    AND m.is_deleted = 0
  LEFT JOIN users u ON m.sender_id = u.id
  WHERE ucs.user_id = user_id
  ORDER BY ucs.last_message_at DESC
  LIMIT page_limit OFFSET page_offset;
END//

CREATE PROCEDURE CreateDirectConversation(
  IN user1_id INT, 
  IN user2_id INT, 
  OUT conversation_id INT
)
BEGIN
  DECLARE existing_conv_id INT DEFAULT NULL;
  
  -- Check if direct conversation already exists
  SELECT c.id INTO existing_conv_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND c.id IN (
      SELECT p1.conversation_id 
      FROM participants p1
      JOIN participants p2 ON p1.conversation_id = p2.conversation_id
      WHERE p1.user_id = user1_id 
        AND p2.user_id = user2_id
        AND p1.is_active = 1 
        AND p2.is_active = 1
    )
  LIMIT 1;
  
  IF existing_conv_id IS NOT NULL THEN
    SET conversation_id = existing_conv_id;
  ELSE
    -- Create new conversation
    INSERT INTO conversations (type, created_by, participant_count) 
    VALUES ('direct', user1_id, 2);
    
    SET conversation_id = LAST_INSERT_ID();
    
    -- Add participants
    INSERT INTO participants (conversation_id, user_id, role) VALUES
    (conversation_id, user1_id, 'member'),
    (conversation_id, user2_id, 'member');
  END IF;
END//

DELIMITER ;