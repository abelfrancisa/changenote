CREATE TABLE `flashcards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`cards` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flashcards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `improvedNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `improvedNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subject` varchar(64) NOT NULL,
	`inputText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `improvedNotes` ADD CONSTRAINT `improvedNotes_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `summaries` ADD CONSTRAINT `summaries_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;