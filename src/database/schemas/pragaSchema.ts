// comando para gerar a tabela
// npx drizzle-kit generate

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const praga = sqliteTable("praga", {
    id: integer("id").primaryKey(),
    name: text("name"),
    description: text("description"),
    fazenda: text("fazenda"),
    praga: text("praga"),
    file: text("file"),
    location: text("location"),
    datetime: text("datetime"),
    synced: integer("synced").default(0),
    photo: text("photo")
})
