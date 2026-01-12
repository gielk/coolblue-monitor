CREATE TABLE `check_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`tweedeKansAvailable` boolean NOT NULL,
	`originalPrice` int,
	`tweedeKansPrice` int,
	`checkStatus` varchar(50) NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `check_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitored_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productUrl` text NOT NULL,
	`productName` varchar(255),
	`productImage` text,
	`originalPrice` int,
	`tweedeKansPrice` int,
	`tweedeKansAvailable` boolean NOT NULL DEFAULT false,
	`checkIntervalMinutes` int NOT NULL DEFAULT 60,
	`lastCheckedAt` timestamp,
	`lastNotifiedAt` timestamp,
	`userEmail` varchar(320) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitored_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `check_history` ADD CONSTRAINT `check_history_productId_monitored_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `monitored_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitored_products` ADD CONSTRAINT `monitored_products_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;