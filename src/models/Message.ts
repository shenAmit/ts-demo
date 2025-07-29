export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  type: string;
  content: string;
  reply_to_id: number;
  attachments: string;
  is_edited: number;
  is_deleted: number;
  metadata: string;
  createdAt?: Date;
  updatedAt?: Date;
  deleted_at?: Date;
}
