import {
  mysqlTable,
  int,
  timestamp,
  datetime,
  boolean,
  mysqlEnum,
  primaryKey,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { conversations } from "./conversations";

export const participants = mysqlTable(
  "participants",
  {
    conversationId: int("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    userId: int("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    // Participant role and permissions
    role: mysqlEnum("role", ["owner", "admin", "moderator", "member"])
      .notNull()
      .default("member"),

    // Participant status
    isActive: boolean("is_active").notNull().default(true),
    isMuted: boolean("is_muted").notNull().default(false),
    mutedUntil: datetime("muted_until"),

    // Join/leave tracking
    joinedAt: datetime("joined_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    leftAt: datetime("left_at"),

    // Last activity tracking
    lastSeenAt: datetime("last_seen_at"),
    lastReadMessageId: int("last_read_message_id"), // For read receipts

    // Notification preferences
    notificationsEnabled: boolean("notifications_enabled")
      .notNull()
      .default(true),

    // Timestamps
    createdAt: datetime("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.conversationId, table.userId] }),
    conversationIdIdx: index("conversation_id_idx").on(table.conversationId),
    userIdIdx: index("user_id_idx").on(table.userId),
    lastSeenIdx: index("last_seen_idx").on(table.lastSeenAt),
  })
);
