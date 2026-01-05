import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export const config = sqliteTable("config", {
    key: text("key").primaryKey(),
    property_list: text("property_list"),
    objetivos_list: text("objetivos_list"),
    fields_list: text("fields_list"),
    user: text("user"),
})
