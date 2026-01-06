CREATE TABLE `config` (
	`key` text PRIMARY KEY NOT NULL,
	`property_list` text,
	`objetivos_list` text,
	`fields_list` text,
	`user` text
);
--> statement-breakpoint
ALTER TABLE `praga` ADD `synced` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `praga` ADD `photo` text;--> statement-breakpoint
ALTER TABLE `recorders` ADD `synced` integer DEFAULT 0;