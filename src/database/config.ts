import * as configSchema from "@/database/schemas/configSchema"
import { tableConfig } from "./connection"
import { eq } from "drizzle-orm"

export async function setConfig(key: string, data: { property_list?: any, objetivos_list?: any, fields_list?: any, user?: any }) {
    try {
        const existing = await tableConfig
            .select()
            .from(configSchema.config)
            .where(eq(configSchema.config.key, key));

        const values = {
            key,
            property_list: data.property_list ? JSON.stringify(data.property_list) : null,
            objetivos_list: data.objetivos_list ? JSON.stringify(data.objetivos_list) : null,
            fields_list: data.fields_list ? JSON.stringify(data.fields_list) : null,
            user: data.user ? JSON.stringify(data.user) : null,
        };

        if (existing.length > 0) {
            await tableConfig
                .update(configSchema.config)
                .set(values)
                .where(eq(configSchema.config.key, key));
        } else {
            await tableConfig
                .insert(configSchema.config)
                .values(values);
        }
        return true;
    } catch (error) {
        console.log("setConfig error =>", error);
        return false;
    }
}

export async function getConfig(key: string) {
    try {
        const response = await tableConfig
            .select()
            .from(configSchema.config)
            .where(eq(configSchema.config.key, key));

        if (response.length > 0) {
            const row = response[0];
            return {
                property_list: row.property_list ? JSON.parse(row.property_list) : null,
                objetivos_list: row.objetivos_list ? JSON.parse(row.objetivos_list) : null,
                fields_list: row.fields_list ? JSON.parse(row.fields_list) : null,
                user: row.user ? JSON.parse(row.user) : null,
            };
        }
        return null;
    } catch (error) {
        console.log("getConfig error =>", error);
        return null;
    }
}
