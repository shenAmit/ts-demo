import {
  mysqlTable,
  int,
  timestamp,
  boolean,
  primaryKey,
  index,
} from "drizzle-orm/mysql-core";
import { users } from "./users";
import { messages } from "./messages";

export const messageMentions = mysqlTable(
  "message_mentions",
  {
    messageId: int("message_id")
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    mentionedUserId: int("mentioned_user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.mentionedUserId] }),
    messageIdIdx: index("message_id_idx").on(table.messageId),
    mentionedUserIdIdx: index("mentioned_user_id_idx").on(
      table.mentionedUserId
    ),
    unreadMentionsIdx: index("unread_mentions_idx").on(
      table.mentionedUserId,
      table.isRead
    ),
  })
);
