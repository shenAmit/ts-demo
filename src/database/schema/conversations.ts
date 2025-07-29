import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  text,
  boolean,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { users } from "./users";

export const conversations = mysqlTable("conversations", {
  id: int("id").primaryKey().autoincrement().notNull(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  type: mysqlEnum("type", ["direct", "group", "channel"])
    .notNull()
    .default("direct"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: int("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastMessageAt: timestamp("last_message_at"),

  participantCount: int("participant_count").notNull().default(0),
  messageCount: int("message_count").notNull().default(0),
});
