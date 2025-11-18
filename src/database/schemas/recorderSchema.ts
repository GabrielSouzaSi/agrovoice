// comando para gerar a tabela
// npx drizzle-kit generate

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const recorder = sqliteTable("recorders", {
	id: integer("id").primaryKey(),
	name: text("name"),
	transcription: text("transcription"),
	file: text("file"),
	location: text("location"),
	datetime: text("datetime")
})
