import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/mysql-core";
import { users } from "./users";
import { messages } from "./messages";

export const messageReactions = mysqlTable(
  "message_reactions",
  {
    messageId: int("message_id")
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    userId: int("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    emoji: varchar("emoji", { length: 10 }).notNull(), // Unicode emoji
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.userId, table.emoji] }),
    messageIdIdx: index("message_id_idx").on(table.messageId),
    userIdIdx: index("user_id_idx").on(table.userId),
  })
);
