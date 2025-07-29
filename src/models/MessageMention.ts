export interface MessageMention {
  message_id: number;
  mentioned_user_id: number;
  is_read: number;
  read_at?: Date;
  created_at?: Date;
}
