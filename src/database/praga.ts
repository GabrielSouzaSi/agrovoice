import * as pragaSchema from "@/database/schemas/pragaSchema"
import { tablePraga } from "./connection"
import { desc, eq } from "drizzle-orm"
import { PragaDTO } from "@/dtos/pragaDTO"

// Função para inserir os dados da gração no banco
export async function insertPraga(praga: PragaDTO) {
    try {
        await tablePraga.insert(pragaSchema.praga).values(praga).run()
        return true
    } catch (error) {
        console.log("insertPraga error =>" + error)
        return false
    }
}

// Função para buscar as gravações no banco
export async function getPraga(): Promise<PragaDTO[] | null> {
    try {
        const response = await tablePraga.query.praga.findMany()
        if (response.length > 0) {
            return response as PragaDTO[]
        } else {
            return null
        }
    } catch (error) {
        console.log("getRecorders error =>" + error)
    }
}
export async function getPragaId(id: number): Promise<PragaDTO | null> {
    try {
        const response = await tablePraga
            .select()
            .from(pragaSchema.praga)
            .where(eq(pragaSchema.praga.id, id))
        if (response.length > 0) {
            return response[0] as PragaDTO
        } else {
            return null // Retorna 0 se não houver registros ou se a contagem for indefinida.
        }
    } catch (error) {
        console.log("getRecorderId error =>" + error)
    }
}
// Função para buscar as gravações no banco ordenado por data e hora
export async function getPragaOrder(): Promise<PragaDTO[] | null> {
    try {
        const response = await tablePraga
            .select()
            .from(pragaSchema.praga)
            .orderBy(desc(pragaSchema.praga.datetime))

        if (!response || response.length === 0) {
            return null
        }

        return response
    } catch (error) {
        console.log("getRecordersOrder error =>" + error)
    }
}
// Função para editar uma gravação no banco
export async function upPraga(recorder: PragaDTO) {
    try {
        await tablePraga
            .update(pragaSchema.praga)
            .set({ ...recorder })
            .where(eq(pragaSchema.praga.id, recorder.id))
    } catch (error) {
        console.log("upRecorder error =>" + error)
    }
}
// Função para deletar no banco a gravação por ID
export async function delPragaId(id: number) {
    try {
        await tablePraga
            .delete(pragaSchema.praga)
            .where(eq(pragaSchema.praga.id, id))
        return true
    } catch (error) {
        console.log("delRecorderId error =>" + error)
    }
}
// Função para deletar todas as gravações
export async function delPraga(): Promise<boolean> {
    try {
        await tablePraga.delete(pragaSchema.praga)
        console.log("Todos os registros da tabela recorder foram deletados.")
        return true
    } catch (error) {
        console.log("delRecorders error =>" + error)
    }
}
