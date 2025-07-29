import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  text,
  boolean,
  mysqlEnum,
  json,
  index,
} from "drizzle-orm/mysql-core";
import { users } from "./users";
import { conversations } from "./conversations";

let messages: any;

messages = mysqlTable(
  "messages",
  {
    id: int("id").primaryKey().autoincrement().notNull(),

    conversationId: int("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),

    senderId: int("sender_id")
      .references(() => users.id)
      .notNull(),

    content: text("content"),

    type: mysqlEnum("type", [
      "text",
      "image",
      "file",
      "audio",
      "video",
      "system",
    ])
      .notNull()
      .default("text"),

    replyToId: int("reply_to_id").references(() => messages.id),

    attachments: json("attachments").$type<
      {
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        thumbnail?: string;
      }[]
    >(),

    isEdited: boolean("is_edited").notNull().default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),

    metadata: json("metadata").$type<Record<string, any>>(),
  },
  (table) => ({
    conversationIdIdx: index("conversation_id_idx").on(table.conversationId),
    senderIdIdx: index("sender_id_idx").on(table.senderId),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
    conversationCreatedIdx: index("conversation_created_idx").on(
      table.conversationId,
      table.createdAt
    ),
  })
);

export { messages };
