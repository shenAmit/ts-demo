CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255),
	`description` text,
	`type` enum('direct','group','channel') NOT NULL DEFAULT 'direct',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_message_at` timestamp,
	`participant_count` int NOT NULL DEFAULT 0,
	`message_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_mentions` (
	`message_id` int NOT NULL,
	`mentioned_user_id` int NOT NULL,
	`is_read` boolean NOT NULL DEFAULT false,
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_mentions_message_id_mentioned_user_id_pk` PRIMARY KEY(`message_id`,`mentioned_user_id`)
);
--> statement-breakpoint
CREATE TABLE `message_reactions` (
	`message_id` int NOT NULL,
	`user_id` int NOT NULL,
	`emoji` varchar(10) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_reactions_message_id_user_id_emoji_pk` PRIMARY KEY(`message_id`,`user_id`,`emoji`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`sender_id` int NOT NULL,
	`content` text,
	`type` enum('text','image','file','audio','video','system') NOT NULL DEFAULT 'text',
	`reply_to_id` int,
	`attachments` json,
	`is_edited` boolean NOT NULL DEFAULT false,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`metadata` json,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`conversation_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('owner','admin','moderator','member') NOT NULL DEFAULT 'member',
	`is_active` boolean NOT NULL DEFAULT true,
	`is_muted` boolean NOT NULL DEFAULT false,
	`muted_until` timestamp,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	`left_at` timestamp,
	`last_seen_at` timestamp,
	`last_read_message_id` int,
	`notifications_enabled` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participants_conversation_id_user_id_pk` PRIMARY KEY(`conversation_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `typing_indicators` (
	`conversation_id` int NOT NULL,
	`user_id` int NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `typing_indicators_conversation_id_user_id_pk` PRIMARY KEY(`conversation_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user_presence` (
	`user_id` int NOT NULL,
	`status` enum('online','away','busy','offline') NOT NULL DEFAULT 'offline',
	`custom_status` varchar(255),
	`is_visible` boolean NOT NULL DEFAULT true,
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_presence_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(150) NOT NULL,
	`password` varchar(255) NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `message_id_idx` ON `message_mentions` (`message_id`);--> statement-breakpoint
CREATE INDEX `mentioned_user_id_idx` ON `message_mentions` (`mentioned_user_id`);--> statement-breakpoint
CREATE INDEX `unread_mentions_idx` ON `message_mentions` (`mentioned_user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `message_id_idx` ON `message_reactions` (`message_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `message_reactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `conversation_id_idx` ON `messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `sender_id_idx` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `conversation_created_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `conversation_id_idx` ON `participants` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `participants` (`user_id`);--> statement-breakpoint
CREATE INDEX `last_seen_idx` ON `participants` (`last_seen_at`);--> statement-breakpoint
CREATE INDEX `conversation_id_idx` ON `typing_indicators` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `typing_indicators` (`expires_at`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `user_presence` (`status`);--> statement-breakpoint
CREATE INDEX `last_seen_idx` ON `user_presence` (`last_seen_at`);--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_mentions` ADD CONSTRAINT `message_mentions_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_mentions` ADD CONSTRAINT `message_mentions_mentioned_user_id_users_id_fk` FOREIGN KEY (`mentioned_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reactions` ADD CONSTRAINT `message_reactions_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reactions` ADD CONSTRAINT `message_reactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_reply_to_id_messages_id_fk` FOREIGN KEY (`reply_to_id`) REFERENCES `messages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participants` ADD CONSTRAINT `participants_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participants` ADD CONSTRAINT `participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `typing_indicators` ADD CONSTRAINT `typing_indicators_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `typing_indicators` ADD CONSTRAINT `typing_indicators_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_presence` ADD CONSTRAINT `user_presence_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;