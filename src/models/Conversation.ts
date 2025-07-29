export interface Conversation {
  id: number;
  name: string;
  description: string;
  type: string;
  is_active: number;
  created_by: number;
  last_message_at: Date;
  participant_count: number;
  message_count: number;
  createdAt?: Date;
  updatedAt?: Date;
}
