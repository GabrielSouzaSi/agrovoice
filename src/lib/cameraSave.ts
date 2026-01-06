import { ImageDTO } from "@/dtos/imageDTO"
import * as ImagePicker from "expo-image-picker"

// Função principal de captura e salvamento
export async function cameraSave() {
	try {
		// 1️⃣ Abre a câmera
		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ["images"],
			allowsEditing: false,
			quality: 1,
		})

		if (result.canceled) return

		const uri = result.assets[0].uri

		const imageObj: ImageDTO = {
			uri: result.assets[0].uri,
			name: result.assets[0].fileName ?? `${Date.now()}.jpg`,
			type: "image/jpeg",
		}
		return imageObj.uri
	} catch (error) {
		console.log("Erro ao capturar imagem:", error)
	}
}
