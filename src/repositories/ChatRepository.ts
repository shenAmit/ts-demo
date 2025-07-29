import { eq, desc, and, sql, inArray, gt, lt } from "drizzle-orm";

import type {
  ConversationWithParticipants,
  MessageWithSender,
  MessagesResponse,
  ConversationsResponse,
  PaginationParams,
} from "@/types/chat";
import { db } from "@/database/connection";
import {
  conversations,
  messageMentions,
  messageReactions,
  messages,
  participants,
  userPresence,
  users,
} from "@/database/schema";
export class ChatRepository {
  // Get user's conversations with participants and last message
  static async getUserConversations(
    userId: number,
    { page = 1, limit = 20 }: PaginationParams = {}
  ): Promise<ConversationsResponse> {
    const offset = (page - 1) * limit;

    const userConversations = await db
      .select({
        conversation: conversations,
        participant: participants,
        lastMessage: messages,
        lastMessageSender: users,
      })
      .from(participants)
      .innerJoin(
        conversations,
        eq(participants.conversationId, conversations.id)
      )
      .leftJoin(messages, eq(conversations.lastMessageAt, messages.createdAt))
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        and(eq(participants.userId, userId), eq(participants.isActive, true))
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit + 1) // Get one extra to check if there are more
      .offset(offset);

    const hasMore = userConversations.length > limit;
    const conversationsData = hasMore
      ? userConversations.slice(0, -1)
      : userConversations;

    // Get all participants for these conversations
    const conversationIds = conversationsData.map((c) => c.conversation.id);
    const allParticipants = await db
      .select({
        participant: participants,
        user: users,
      })
      .from(participants)
      .innerJoin(users, eq(participants.userId, users.id))
      .where(
        and(
          inArray(participants.conversationId, conversationIds),
          eq(participants.isActive, true)
        )
      );

    // Group participants by conversation
    const participantsByConversation = allParticipants.reduce(
      (acc, { participant, user }) => {
        if (!acc[participant.conversationId]) {
          acc[participant.conversationId] = [];
        }
        acc[participant.conversationId].push({ ...participant, user });
        return acc;
      },
      {} as Record<
        number,
        (typeof participants.$inferSelect & {
          user: typeof users.$inferSelect;
        })[]
      >
    );

    const result: ConversationWithParticipants[] = conversationsData.map(
      ({ conversation, lastMessage, lastMessageSender }) => ({
        ...conversation,
        participants: participantsByConversation[conversation.id] || [],
        lastMessage:
          lastMessage && lastMessageSender
            ? { ...lastMessage, sender: lastMessageSender }
            : undefined,
      })
    );

    return {
      conversations: result,
      nextCursor: hasMore ? page + 1 : undefined,
      hasMore,
    };
  }

  // Get messages for a conversation with pagination
  static async getConversationMessages(
    conversationId: number,
    userId: number,
    { cursor, limit = 50 }: PaginationParams & { cursor?: number } = {}
  ): Promise<MessagesResponse> {
    // Verify user is participant
    const participant = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.conversationId, conversationId),
          eq(participants.userId, userId),
          eq(participants.isActive, true)
        )
      )
      .limit(1);

    if (!participant.length) {
      throw new Error("User is not a participant in this conversation");
    }

    const whereConditions = [eq(messages.conversationId, conversationId)];

    if (cursor) {
      whereConditions.push(lt(messages.id, cursor));
    }

    // Get messages with sender information
    const messageData = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);

    const hasMore = messageData.length > limit;
    const messagesResult = hasMore ? messageData.slice(0, -1) : messageData;

    // Get reply-to messages separately
    const replyToIds = messagesResult
      .map((m) => m.message.replyToId)
      .filter((id): id is number => id !== null);

    const replyToMessages =
      replyToIds.length > 0
        ? await db
            .select({
              message: messages,
              sender: users,
            })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(inArray(messages.id, replyToIds))
        : [];

    const replyToMap = replyToMessages.reduce(
      (acc, { message, sender }) => {
        acc[message.id] = { ...message, sender };
        return acc;
      },
      {} as Record<number, any>
    );

    // Get reactions for these messages
    const messageIds = messagesResult.map((m) => m.message.id);
    const reactions =
      messageIds.length > 0
        ? await db
            .select({
              reaction: messageReactions,
              user: users,
            })
            .from(messageReactions)
            .innerJoin(users, eq(messageReactions.userId, users.id))
            .where(inArray(messageReactions.messageId, messageIds))
        : [];

    // Get mentions for these messages
    const mentions =
      messageIds.length > 0
        ? await db
            .select({
              mention: messageMentions,
              mentionedUser: users,
            })
            .from(messageMentions)
            .innerJoin(users, eq(messageMentions.mentionedUserId, users.id))
            .where(inArray(messageMentions.messageId, messageIds))
        : [];

    // Group reactions and mentions by message
    const reactionsByMessage = reactions.reduce(
      (acc, { reaction, user }) => {
        if (!acc[reaction.messageId]) acc[reaction.messageId] = [];
        acc[reaction.messageId].push({ ...reaction, user });
        return acc;
      },
      {} as Record<number, any[]>
    );

    const mentionsByMessage = mentions.reduce(
      (acc, { mention, mentionedUser }) => {
        if (!acc[mention.messageId]) acc[mention.messageId] = [];
        acc[mention.messageId].push({ ...mention, mentionedUser });
        return acc;
      },
      {} as Record<number, any[]>
    );

    const result: MessageWithSender[] = messagesResult.map(
      ({ message, sender }) => ({
        ...message,
        sender,
        replyTo: message.replyToId ? replyToMap[message.replyToId] : undefined,
        reactions: reactionsByMessage[message.id] || [],
        mentions: mentionsByMessage[message.id] || [],
      })
    );

    return {
      messages: result.reverse(), // Return in chronological order
      nextCursor: hasMore
        ? messagesResult[messagesResult.length - 1].message.id
        : undefined,
      hasMore,
    };
  }

  // Create a new conversation
  static async createConversation(
    creatorId: number,
    {
      name,
      description,
      type,
      participantIds,
    }: {
      name?: string;
      description?: string;
      type: "direct" | "group" | "channel";
      participantIds: number[];
    }
  ) {
    return db.transaction(async (tx) => {
      // Create conversation
      const [conversation] = await tx
        .insert(conversations)
        .values({
          name,
          description,
          type,
          createdBy: creatorId,
          participantCount: participantIds.length + 1, // +1 for creator
        })
        .$returningId();

      // Add creator as owner
      await tx.insert(participants).values({
        conversationId: conversation.id,
        userId: creatorId,
        role: "owner",
      });

      // Add other participants
      if (participantIds.length > 0) {
        await tx.insert(participants).values(
          participantIds.map((userId) => ({
            conversationId: conversation.id,
            userId,
            role: "member" as const,
          }))
        );
      }

      return conversation;
    });
  }

  // Send a message
  static async sendMessage(
    senderId: number,
    conversationId: number,
    {
      content,
      type = "text",
      replyToId,
      attachments,
      metadata,
    }: {
      content?: string;
      type?: "text" | "image" | "file" | "audio" | "video" | "system";
      replyToId?: number;
      attachments?: any[];
      metadata?: Record<string, any>;
    }
  ) {
    return db.transaction(async (tx) => {
      // Verify sender is participant
      const participant = await tx
        .select()
        .from(participants)
        .where(
          and(
            eq(participants.conversationId, conversationId),
            eq(participants.userId, senderId),
            eq(participants.isActive, true)
          )
        )
        .limit(1);

      if (!participant.length) {
        throw new Error("User is not a participant in this conversation");
      }

      // Insert message
      const [message] = await tx
        .insert(messages)
        .values({
          conversationId,
          senderId,
          content,
          type,
          replyToId,
          attachments,
          metadata,
        })
        .$returningId();

      // Update conversation last message timestamp and message count
      await tx
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: sql`${conversations.messageCount} + 1`,
        })
        .where(eq(conversations.id, conversationId));

      // Extract mentions from content and create mention records
      if (content && content.includes("@")) {
        const mentionMatches = content.match(/@(\w+)/g);
        if (mentionMatches) {
          const usernames = mentionMatches.map((m) => m.substring(1));
          const mentionedUsers = await tx
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.name, usernames));

          if (mentionedUsers.length > 0) {
            await tx.insert(messageMentions).values(
              mentionedUsers.map((user) => ({
                messageId: message.id,
                mentionedUserId: user.id,
              }))
            );
          }
        }
      }

      return message;
    });
  }

  // Add reaction to message
  static async addReaction(userId: number, messageId: number, emoji: string) {
    // First verify user can access this message
    const messageAccess = await db
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .innerJoin(
        participants,
        eq(messages.conversationId, participants.conversationId)
      )
      .where(
        and(
          eq(messages.id, messageId),
          eq(participants.userId, userId),
          eq(participants.isActive, true)
        )
      )
      .limit(1);

    if (!messageAccess.length) {
      throw new Error("User cannot access this message");
    }

    return db
      .insert(messageReactions)
      .values({ messageId, userId, emoji })
      .onDuplicateKeyUpdate({ set: { createdAt: new Date() } });
  }

  // Remove reaction from message
  static async removeReaction(
    userId: number,
    messageId: number,
    emoji: string
  ) {
    return db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      );
  }

  // Update message (edit)
  static async updateMessage(
    userId: number,
    messageId: number,
    { content, metadata }: { content?: string; metadata?: Record<string, any> }
  ) {
    // Verify user owns the message
    const message = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)))
      .limit(1);

    if (!message.length) {
      throw new Error("Message not found or user unauthorized");
    }

    await db
      .update(messages)
      .set({
        content,
        metadata,
        isEdited: true,
      })
      .where(eq(messages.id, messageId));

    return { success: true };
  }

  // Delete message (soft delete)
  static async deleteMessage(userId: number, messageId: number) {
    // Verify user owns the message or is admin/owner
    const messageWithPermission = await db
      .select({
        message: messages,
        participant: participants,
      })
      .from(messages)
      .innerJoin(
        participants,
        eq(messages.conversationId, participants.conversationId)
      )
      .where(
        and(
          eq(messages.id, messageId),
          eq(participants.userId, userId),
          eq(participants.isActive, true)
        )
      )
      .limit(1);

    if (!messageWithPermission.length) {
      throw new Error("Message not found or user unauthorized");
    }

    const { message, participant } = messageWithPermission[0];

    // Check if user owns message or has admin privileges
    const canDelete =
      message.senderId === userId ||
      ["owner", "admin", "moderator"].includes(participant.role);

    if (!canDelete) {
      throw new Error("User unauthorized to delete this message");
    }

    await db
      .update(messages)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        content: null, // Clear content for privacy
      })
      .where(eq(messages.id, messageId));

    return { success: true };
  }

  // Update user presence
  static async updateUserPresence(
    userId: number,
    {
      status,
      customStatus,
      isVisible,
    }: {
      status?: "online" | "away" | "busy" | "offline";
      customStatus?: string;
      isVisible?: boolean;
    }
  ) {
    return db
      .insert(userPresence)
      .values({
        userId,
        status: status || "online",
        customStatus,
        isVisible: isVisible ?? true,
      })
      .onDuplicateKeyUpdate({
        set: {
          status: status || sql`${userPresence.status}`,
          customStatus: customStatus || sql`${userPresence.customStatus}`,
          isVisible: isVisible ?? sql`${userPresence.isVisible}`,
          lastSeenAt: new Date(),
        },
      });
  }

  // Get unread message count for user
  static async getUnreadMessageCount(userId: number, conversationId?: number) {
    let baseQuery = db
      .select({
        conversationId: messages.conversationId,
        unreadCount: sql<number>`COUNT(*)`,
      })
      .from(messages)
      .innerJoin(
        participants,
        eq(messages.conversationId, participants.conversationId)
      )
      .where(
        and(
          eq(participants.userId, userId),
          eq(participants.isActive, true),
          gt(messages.id, sql`COALESCE(${participants.lastReadMessageId}, 0)`)
        )
      )
      .groupBy(messages.conversationId);

    if (conversationId) {
      baseQuery = baseQuery.where(eq(messages.conversationId, conversationId));
    }

    return baseQuery;
  }

  // Mark messages as read
  static async markMessagesAsRead(
    userId: number,
    conversationId: number,
    lastReadMessageId: number
  ) {
    await db
      .update(participants)
      .set({
        lastReadMessageId,
        lastSeenAt: new Date(),
      })
      .where(
        and(
          eq(participants.userId, userId),
          eq(participants.conversationId, conversationId)
        )
      );

    return { success: true };
  }

  // Search messages
  static async searchMessages(
    userId: number,
    query: string,
    {
      conversationIds,
      limit = 20,
      offset = 0,
    }: {
      conversationIds?: number[];
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const whereConditions = [
      eq(participants.userId, userId),
      eq(participants.isActive, true),
      sql`MATCH(${messages.content}) AGAINST(${query} IN BOOLEAN MODE)`,
    ];

    if (conversationIds?.length) {
      whereConditions.push(inArray(messages.conversationId, conversationIds));
    }

    return db
      .select({
        message: messages,
        sender: users,
        conversation: conversations,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .innerJoin(
        participants,
        eq(messages.conversationId, participants.conversationId)
      )
      .where(and(...whereConditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Get conversation members with their roles
  static async getConversationMembers(
    conversationId: number,
    requestingUserId: number
  ) {
    // Verify requesting user is a participant
    const isParticipant = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.conversationId, conversationId),
          eq(participants.userId, requestingUserId),
          eq(participants.isActive, true)
        )
      )
      .limit(1);

    if (!isParticipant.length) {
      throw new Error("User is not a participant in this conversation");
    }

    return db
      .select({
        participant: participants,
        user: users,
        presence: userPresence,
      })
      .from(participants)
      .innerJoin(users, eq(participants.userId, users.id))
      .leftJoin(userPresence, eq(users.id, userPresence.userId))
      .where(
        and(
          eq(participants.conversationId, conversationId),
          eq(participants.isActive, true)
        )
      )
      .orderBy(participants.role, users.name);
  }
}
