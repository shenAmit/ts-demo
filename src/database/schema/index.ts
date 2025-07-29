// Export all schema tables
export { users } from "./users";
export { conversations } from "./conversations";
export { messages } from "./messages";
export { participants } from "./participants";
export { messageReactions } from "./messageReactions";
export { messageMentions } from "./messageMentions";
export { userPresence } from "./userPresence";
export { typingIndicators } from "./typingIndicators";

// Define relationships for better type inference
import { relations } from "drizzle-orm";
import { users } from "./users";
import { conversations } from "./conversations";
import { messages } from "./messages";
import { participants } from "./participants";
import { messageReactions } from "./messageReactions";
import { messageMentions } from "./messageMentions";
import { userPresence } from "./userPresence";
import { typingIndicators } from "./typingIndicators";

// User relations
export const usersRelations = relations(users, ({ many, one }) => ({
  conversations: many(participants),
  sentMessages: many(messages, { relationName: "sender" }),
  messageReactions: many(messageReactions),
  mentions: many(messageMentions),
  presence: one(userPresence),
  typingIndicators: many(typingIndicators),
}));

// Conversation relations
export const conversationsRelations = relations(
  conversations,
  ({ many, one }) => ({
    participants: many(participants),
    messages: many(messages),
    creator: one(users, {
      fields: [conversations.createdBy],
      references: [users.id],
    }),
    typingIndicators: many(typingIndicators),
  })
);

// Message relations
export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
    relationName: "replies",
  }),
  replies: many(messages, { relationName: "replies" }),
  reactions: many(messageReactions),
  mentions: many(messageMentions),
}));

// Participant relations
export const participantsRelations = relations(participants, ({ one }) => ({
  user: one(users, {
    fields: [participants.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [participants.conversationId],
    references: [conversations.id],
  }),
}));

// Message reaction relations
export const messageReactionsRelations = relations(
  messageReactions,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageReactions.messageId],
      references: [messages.id],
    }),
    user: one(users, {
      fields: [messageReactions.userId],
      references: [users.id],
    }),
  })
);

// Message mention relations
export const messageMentionsRelations = relations(
  messageMentions,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageMentions.messageId],
      references: [messages.id],
    }),
    mentionedUser: one(users, {
      fields: [messageMentions.mentionedUserId],
      references: [users.id],
    }),
  })
);

// User presence relations
export const userPresenceRelations = relations(userPresence, ({ one }) => ({
  user: one(users, {
    fields: [userPresence.userId],
    references: [users.id],
  }),
}));

// Typing indicator relations
export const typingIndicatorsRelations = relations(
  typingIndicators,
  ({ one }) => ({
    user: one(users, {
      fields: [typingIndicators.userId],
      references: [users.id],
    }),
    conversation: one(conversations, {
      fields: [typingIndicators.conversationId],
      references: [conversations.id],
    }),
  })
);
