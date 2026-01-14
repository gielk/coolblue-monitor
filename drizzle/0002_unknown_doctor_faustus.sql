CREATE TABLE `emailSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`smtpHost` varchar(255),
	`smtpPort` int,
	`smtpUser` varchar(255),
	`smtpPassword` text,
	`fromEmail` varchar(255),
	`fromName` varchar(255),
	`useResend` boolean DEFAULT false,
	`resendApiKey` text,
	`useSendGrid` boolean DEFAULT false,
	`sendGridApiKey` text,
	`notificationsEnabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailSettings_id` PRIMARY KEY(`id`)
);
