import {
  mysqlTable,
  int,
  timestamp,
  datetime,
  primaryKey,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { conversations } from "./conversations";

// This table can be used with a TTL or regular cleanup job
// Alternatively, you might handle typing indicators purely in memory/Redis
export const typingIndicators = mysqlTable(
  "typing_indicators",
  {
    conversationId: int("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    userId: int("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    startedAt: datetime("started_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: datetime("expires_at").notNull(), // Usually startedAt + 5 seconds
  },
  (table) => ({
    pk: primaryKey({ columns: [table.conversationId, table.userId] }),
    conversationIdIdx: index("conversation_id_idx").on(table.conversationId),
    expiresAtIdx: index("expires_at_idx").on(table.expiresAt), // For cleanup
  })
);
