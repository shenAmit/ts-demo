// Create this file in src/types/chat.ts
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  users,
  conversations,
  messages,
  participants,
  messageReactions,
  messageMentions,
  userPresence,
  typingIndicators,
} from "../database/schema";

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Conversation types
export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;
export type ConversationType = "direct" | "group" | "channel";

// Message types
export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;
export type MessageType =
  | "text"
  | "image"
  | "file"
  | "audio"
  | "video"
  | "system";

export interface MessageAttachment {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnail?: string;
}

// Participant types
export type Participant = InferSelectModel<typeof participants>;
export type NewParticipant = InferInsertModel<typeof participants>;
export type ParticipantRole = "owner" | "admin" | "moderator" | "member";

// Message reaction types
export type MessageReaction = InferSelectModel<typeof messageReactions>;
export type NewMessageReaction = InferInsertModel<typeof messageReactions>;

// Message mention types
export type MessageMention = InferSelectModel<typeof messageMentions>;
export type NewMessageMention = InferInsertModel<typeof messageMentions>;

// User presence types
export type UserPresence = InferSelectModel<typeof userPresence>;
export type NewUserPresence = InferInsertModel<typeof userPresence>;
export type PresenceStatus = "online" | "away" | "busy" | "offline";

// Typing indicator types
export type TypingIndicator = InferSelectModel<typeof typingIndicators>;
export type NewTypingIndicator = InferInsertModel<typeof typingIndicators>;

// Extended types for API responses
export interface ConversationWithParticipants extends Conversation {
  participants: (Participant & { user: User })[];
  lastMessage?: Message & { sender: User };
  unreadCount?: number;
}

export interface MessageWithSender extends Message {
  sender: User;
  replyTo?: MessageWithSender;
  reactions?: (MessageReaction & { user: User })[];
  mentions?: (MessageMention & { mentionedUser: User })[];
}

export interface UserWithPresence extends User {
  presence?: UserPresence;
}

// WebSocket event types
export interface TypingEvent {
  conversationId: number;
  userId: number;
  isTyping: boolean;
}

export interface MessageEvent {
  type: "message_sent" | "message_updated" | "message_deleted";
  message: MessageWithSender;
  conversationId: number;
}

export interface ReactionEvent {
  type: "reaction_added" | "reaction_removed";
  messageId: number;
  userId: number;
  emoji: string;
  conversationId: number;
}

export interface PresenceEvent {
  type: "presence_updated";
  userId: number;
  status: PresenceStatus;
  customStatus?: string;
}

// API request/response types
export interface SendMessageRequest {
  conversationId: number;
  content?: string;
  type?: MessageType;
  replyToId?: number;
  attachments?: MessageAttachment[];
}

export interface CreateConversationRequest {
  name?: string;
  description?: string;
  type: ConversationType;
  participantIds: number[];
}

export interface UpdateConversationRequest {
  name?: string;
  description?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: number; // For cursor-based pagination
}

export interface MessagesResponse {
  messages: MessageWithSender[];
  nextCursor?: number;
  hasMore: boolean;
}

export interface ConversationsResponse {
  conversations: ConversationWithParticipants[];
  nextCursor?: number;
  hasMore: boolean;
}
