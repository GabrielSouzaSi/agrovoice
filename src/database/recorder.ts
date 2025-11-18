import * as recorderSchema from "@/database/schemas/recorderSchema"
import { tableRecoder } from "./connection"
import { desc, eq } from "drizzle-orm"
import { RecorderDTO } from "@/dtos/recorderDTO"

// Função para inserir os dados da gração no banco
export async function insertRecorder(recorder: RecorderDTO) {
	try {
		await tableRecoder.insert(recorderSchema.recorder).values(recorder).run()
		return true
	} catch (error) {
		console.log("insertRecorder error =>" + error)
		return false
	}
}

// Função para buscar as gravações no banco
export async function getRecorders(): Promise<RecorderDTO[] | null> {
	try {
		const response = await tableRecoder.query.recorder.findMany()
		if (response.length > 0) {
			return response as RecorderDTO[]
		} else {
			return null // Retorna 0 se não houver registros ou se a contagem for indefinida.
		}
	} catch (error) {
		console.log("getRecorders error =>" + error)
	}
}
// Função para buscar as gravações por id no banco
export async function getRecorderId(id: number): Promise<RecorderDTO | null> {
	try {
		const response = await tableRecoder
			.select()
			.from(recorderSchema.recorder)
			.where(eq(recorderSchema.recorder.id, id))
		if (response.length > 0) {
			return response[0] as RecorderDTO
		} else {
			return null // Retorna 0 se não houver registros ou se a contagem for indefinida.
		}
	} catch (error) {
		console.log("getRecorderId error =>" + error)
	}
}
// Função para buscar as gravações no banco ordenado por data e hora
export async function getRecordersOrder(): Promise<RecorderDTO[] | null> {
	try {
		const response = await tableRecoder
			.select()
			.from(recorderSchema.recorder)
			.orderBy(desc(recorderSchema.recorder.datetime))

		if (!response || response.length === 0) {
			return null
		}

		return response
	} catch (error) {
		console.log("getRecordersOrder error =>" + error)
	}
}
// Função para editar uma gravação no banco
export async function upRecorder(recorder: RecorderDTO) {
	try {
		await tableRecoder
			.update(recorderSchema.recorder)
			.set({ ...recorder })
			.where(eq(recorderSchema.recorder.id, recorder.id))
	} catch (error) {
		console.log("upRecorder error =>" + error)
	}
}
// Função para deletar no banco a gravação por ID
export async function delRecorderId(id: number) {
	try {
		await tableRecoder
			.delete(recorderSchema.recorder)
			.where(eq(recorderSchema.recorder.id, id))
		return true
	} catch (error) {
		console.log("delRecorderId error =>" + error)
	}
}
// Função para deletar todas as gravações
export async function delRecorders(): Promise<boolean> {
	try {
		await tableRecoder.delete(recorderSchema.recorder)
		console.log("Todos os registros da tabela recorder foram deletados.")
		return true
	} catch (error) {
		console.log("delRecorders error =>" + error)
	}
}
