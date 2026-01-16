CREATE TABLE `priceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`originalPrice` int,
	`tweedeKansPrice` int,
	`tweedeKansAvailable` boolean DEFAULT false,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `priceHistory` ADD CONSTRAINT `priceHistory_productId_monitored_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `monitored_products`(`id`) ON DELETE cascade ON UPDATE no action;