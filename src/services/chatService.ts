// Create this file in src/services/chatService.ts
import { ChatQueries } from "../database/queries/chatQueries";
import type {
  SendMessageRequest,
  CreateConversationRequest,
  UpdateConversationRequest,
  PaginationParams,
  ConversationWithParticipants,
  MessageWithSender,
  MessagesResponse,
  ConversationsResponse,
} from "../types/chat";

export class ChatService {
  // Conversation methods
  static async getUserConversations(
    userId: number,
    pagination?: PaginationParams
  ): Promise<ConversationsResponse> {
    return ChatQueries.getUserConversations(userId, pagination);
  }

  static async createConversation(
    creatorId: number,
    data: CreateConversationRequest
  ) {
    // Validate participants exist and creator is not in the list
    if (data.participantIds.includes(creatorId)) {
      throw new Error("Creator cannot be in participant list");
    }

    // For direct conversations, ensure exactly 1 other participant
    if (data.type === "direct" && data.participantIds.length !== 1) {
      throw new Error(
        "Direct conversations must have exactly one other participant"
      );
    }

    // For group/channel conversations, ensure reasonable limits
    if (
      (data.type === "group" || data.type === "channel") &&
      data.participantIds.length > 100
    ) {
      throw new Error("Too many participants for group conversation");
    }

    return ChatQueries.createConversation(creatorId, data);
  }

  static async getConversationMembers(conversationId: number, userId: number) {
    return ChatQueries.getConversationMembers(conversationId, userId);
  }

  // Message methods
  static async getConversationMessages(
    conversationId: number,
    userId: number,
    pagination?: PaginationParams & { cursor?: number }
  ): Promise<MessagesResponse> {
    return ChatQueries.getConversationMessages(
      conversationId,
      userId,
      pagination
    );
  }

  static async sendMessage(userId: number, data: SendMessageRequest) {
    // Validate message content
    if (!data.content?.trim() && !data.attachments?.length) {
      throw new Error("Message must have content or attachments");
    }

    // Validate message length
    if (data.content && data.content.length > 4000) {
      throw new Error("Message content too long");
    }

    return ChatQueries.sendMessage(userId, data.conversationId, {
      content: data.content?.trim(),
      type: data.type || "text",
      replyToId: data.replyToId,
      attachments: data.attachments,
    });
  }

  static async editMessage(userId: number, messageId: number, content: string) {
    if (!content.trim()) {
      throw new Error("Message content cannot be empty");
    }

    if (content.length > 4000) {
      throw new Error("Message content too long");
    }

    return ChatQueries.updateMessage(userId, messageId, {
      content: content.trim(),
    });
  }

  static async deleteMessage(userId: number, messageId: number) {
    return ChatQueries.deleteMessage(userId, messageId);
  }

  // Reaction methods
  static async addReaction(userId: number, messageId: number, emoji: string) {
    // Validate emoji (basic validation - you might want more sophisticated)
    if (!emoji || emoji.length > 10) {
      throw new Error("Invalid emoji");
    }

    return ChatQueries.addReaction(userId, messageId, emoji);
  }

  static async removeReaction(
    userId: number,
    messageId: number,
    emoji: string
  ) {
    return ChatQueries.removeReaction(userId, messageId, emoji);
  }

  // Read status methods
  static async markMessagesAsRead(
    userId: number,
    conversationId: number,
    lastReadMessageId: number
  ) {
    return ChatQueries.markMessagesAsRead(
      userId,
      conversationId,
      lastReadMessageId
    );
  }

  static async getUnreadCounts(userId: number, conversationId?: number) {
    return ChatQueries.getUnreadMessageCount(userId, conversationId);
  }

  // Search methods
  static async searchMessages(
    userId: number,
    query: string,
    options?: {
      conversationIds?: number[];
      limit?: number;
      offset?: number;
    }
  ) {
    if (!query.trim()) {
      throw new Error("Search query cannot be empty");
    }

    if (query.length < 2) {
      throw new Error("Search query too short");
    }

    return ChatQueries.searchMessages(userId, query.trim(), options);
  }

  // Presence methods
  static async updateUserPresence(
    userId: number,
    data: {
      status?: "online" | "away" | "busy" | "offline";
      customStatus?: string;
      isVisible?: boolean;
    }
  ) {
    // Validate custom status length
    if (data.customStatus && data.customStatus.length > 255) {
      throw new Error("Custom status too long");
    }

    return ChatQueries.updateUserPresence(userId, {
      status: data.status,
      customStatus: data.customStatus?.trim(),
      isVisible: data.isVisible,
    });
  }

  // Utility methods
  static async validateUserAccess(
    userId: number,
    conversationId: number
  ): Promise<boolean> {
    try {
      const members = await this.getConversationMembers(conversationId, userId);
      return members.some((member) => member.participant.userId === userId);
    } catch (error) {
      return false;
    }
  }

  static async isUserInConversation(
    userId: number,
    conversationId: number
  ): Promise<boolean> {
    return this.validateUserAccess(userId, conversationId);
  }

  // Bulk operations
  static async markAllConversationsAsRead(userId: number) {
    const conversations = await this.getUserConversations(userId);

    const promises = conversations.conversations.map(async (conv) => {
      if (conv.lastMessage) {
        return this.markMessagesAsRead(userId, conv.id, conv.lastMessage.id);
      }
    });

    return Promise.all(promises);
  }

  // Analytics/Statistics (optional - for admin dashboards)
  static async getConversationStats(conversationId: number, userId: number) {
    // Verify user has access
    await this.getConversationMembers(conversationId, userId);

    // This would require additional queries - implement based on needs
    return {
      totalMessages: 0,
      totalParticipants: 0,
      createdAt: new Date(),
      // Add more stats as needed
    };
  }
}
