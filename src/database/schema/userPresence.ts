import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  boolean,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";
import { users } from "./users";

export const userPresence = mysqlTable(
  "user_presence",
  {
    userId: int("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    status: mysqlEnum("status", ["online", "away", "busy", "offline"])
      .notNull()
      .default("offline"),
    customStatus: varchar("custom_status", { length: 255 }),
    isVisible: boolean("is_visible").notNull().default(true), // For privacy
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    statusIdx: index("status_idx").on(table.status),
    lastSeenIdx: index("last_seen_idx").on(table.lastSeenAt),
  })
);
