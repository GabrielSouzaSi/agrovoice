import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native"
import { useFocusEffect } from "expo-router"
import Vosk from "react-native-vosk"
import * as Speech from "expo-speech"
import { Mic, Square, Trash } from "lucide-react-native"

function normalize(text: string) {
	return String(text || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\p{L}\p{N}\s]/gu, "")
		.replace(/\s+/g, " ")
		.trim()
}
function extractText(res: any) {
	if (typeof res === "string") {
		try {
			const o = JSON.parse(res)
			return o.text ?? o.partial ?? res
		} catch {
			return res
		}
	}
	if (res?.text) return res.text
	if (res?.partial) return res.partial
	return ""
}

// Grammar por tokens (modo comandos)
const COMMAND_GRAMMAR = [
	"abrir",
	"mapa",
	"mostrar",
	"perfil",
	"saldo",
	"meu",
	"voltar",
	"retornar",
	"gravar",
	"voz",
	"o",
	"[unk]",
]

export default function RecordScreen() {
	const vosk = useRef(new Vosk()).current

	const [ready, setReady] = useState(false)
	const [recognizing, setRecognizing] = useState(false)
	const [partial, setPartial] = useState("")
	const [result, setResult] = useState("")
	const [lastCommand, setLastCommand] = useState("(nenhum)")
	const [mode, setMode] = useState<"commands" | "dictation">("commands") // <- novo

	const startingRef = useRef(false)
	const commandFiredRef = useRef(false)
	const partialRef = useRef("")

	const recognizingRef = useRef(false)

	// Start: "commands" (grammar) ou "dictation" (sem grammar)
	const recognizingStart = useCallback(
		async (startMode: "commands" | "dictation" = "commands") => {
			if (!ready || recognizingRef.current || startingRef.current) return
			startingRef.current = true
			try {
				commandFiredRef.current = false
				partialRef.current = ""
				setPartial("")
				setResult("")
				setMode(startMode)
				const opts =
					startMode === "commands"
						? { grammar: COMMAND_GRAMMAR, timeout: 5000 }
						: { timeout: 20000 }
				const started = await vosk.start(opts as any)
				if (started === undefined) {
					Alert.alert("Voz", "Permissão de microfone negada")
					return
				}
				recognizingRef.current = true // ✅ atualiza ref imediatamente
				setRecognizing(true)
				console.log("Reconhecimento iniciado 🎤", startMode)
			} catch (e) {
				console.error("start:", e)
			} finally {
				startingRef.current = false
			}
		},
		[ready, vosk], // ⬅️ não dependa de `recognizing` aqui
	)

	const recognizingStop = useCallback(async () => {
		try {
			await vosk.stop()
			console.log("Reconhecimento parado ⏹️")
		} catch (e) {
			console.error("stop:", e)
		} finally {
			recognizingRef.current = false // ✅ ref zera já
			setRecognizing(false)
			commandFiredRef.current = false
			partialRef.current = ""
		}
	}, [vosk])

	// AÇÕES dentro do componente
	const abrirMapa = useCallback(() => {
		Speech.stop()
		Speech.speak("Abrindo mapa", { language: "pt-BR" })
		console.log(">> abrirMapa()")
	}, [])
	const mostrarPerfil = useCallback(() => {
		Speech.stop()
		Speech.speak("Mostrando perfil", { language: "pt-BR" })
		console.log(">> mostrarPerfil()")
	}, [])
	const mostrarSaldo = useCallback(() => {
		Speech.stop()
		Speech.speak("Mostrando saldo", { language: "pt-BR" })
		console.log(">> mostrarSaldo()")
	}, [])
	const voltar = useCallback(() => {
		Speech.stop()
		Speech.speak("Voltando", { language: "pt-BR" })
		console.log(">> voltar()")
	}, [])
	// “gravar voz” => trocar para modo ditado na MESMA instância
	const gravarVoz = useCallback(async () => {
		Speech.stop()
		Speech.speak("Gravar voz", {
			language: "pt-BR",
			onDone: () => {
				// reinicia em modo ditado (sem grammar, timeout maior)
				;(async () => {
					await recognizingStop()
					await recognizingStart("dictation")
				})()
			},
		})
	}, [recognizingStop, recognizingStart]) // sem deps de estado

	// Padrões de comando
	const COMMANDS = useMemo(
		() => [
			{ label: "abrir mapa", re: /(^|\s)abrir\s+(o\s+)?mapa(\s|$)/, run: abrirMapa },
			{
				label: "mostrar perfil",
				re: /(^|\s)(mostrar\s+(o\s+)?)?perfil(\s|$)/,
				run: mostrarPerfil,
			},
			{ label: "saldo", re: /(^|\s)(meu\s+)?saldo(\s|$)/, run: mostrarSaldo },
			{ label: "voltar", re: /(^|\s)(voltar|retornar)(\s|$)/, run: voltar },
			{ label: "gravar voz", re: /(^|\s)gravar\s+voz(\s|$)/, run: gravarVoz },
		],
		[abrirMapa, mostrarPerfil, mostrarSaldo, voltar, gravarVoz],
	)

	// Carrega modelo 1x
	useEffect(() => {
		let mounted = true
		vosk.loadModel("vosk-model-pt")
			.then(() => mounted && setReady(true))
			.catch((e) => console.error("loadModel:", e))
		return () => {
			vosk.unload()
			setReady(false)
		}
	}, [vosk])

	// Dispara 1 comando por ciclo
	const tryRunCommand = useCallback(
		async (raw: string) => {
			if (commandFiredRef.current) return
			const t = normalize(raw)
			if (!t) return
			console.log("[tryRunCommand] texto:", t)
			for (const c of COMMANDS) {
				if (c.re.test(t)) {
					commandFiredRef.current = true
					setLastCommand(c.label)
					console.log("[tryRunCommand] comando reconhecido:", c.label)
					try {
						await Promise.resolve(c.run())
					} catch (e) {
						console.error("Falha ao executar ação:", e)
					} finally {
						// se comando NÃO foi “gravar voz”, pare após executar
						if (c.label !== "gravar voz") recognizingStop()
					}
					break
				}
			}
		},
		[COMMANDS],
	)

	const speakCommandVoice = () => {
		Speech.stop()
		Speech.speak("Diga um comando", {
			onDone: () => {
				recognizingStart("commands")
			},
		})
	}

	// Listeners
	useEffect(() => {
		const onPartial = vosk.onPartialResult((s: string) => {
			const raw = extractText(s)
			partialRef.current = raw
			setPartial(raw)
			// responder já em parcial (mais responsivo) SÓ no modo comandos
			if (mode === "commands") tryRunCommand(raw)
		})
		const onFinal = vosk.onFinalResult((s: string) => {
			const raw = extractText(s)
			const t = normalize(raw)
			partialRef.current = ""
			setPartial("")
			if (t) {
				setResult((prev) => (prev ? prev + " " + t : t))
				if (mode === "commands") tryRunCommand(t)
				// em ditado, você poderia salvar o texto reconhecido
			}
		})
		const onError = vosk.onError((e: any) => console.error("Vosk error:", e))
		const onTimeout = vosk.onTimeout(async () => {
			console.log("[timeout] último parcial:", partialRef.current)
			if (mode === "commands" && partialRef.current && !commandFiredRef.current) {
				await tryRunCommand(partialRef.current)
			}
			recognizingStop()
		})
		return () => {
			onPartial.remove()
			onFinal.remove()
			onError.remove()
			onTimeout.remove()
		}
	}, [vosk, tryRunCommand, mode])

	// Para ao desfocar
	useFocusEffect(
		useCallback(() => {
			return () => {
				recognizingStop()
			}
		}, [recognizingStop]),
	)

	useEffect(() => {
		recognizingRef.current = recognizing
	}, [recognizing])

	const clearText = () => {
		setPartial("")
		setResult("")
		setLastCommand("(nenhum)")
	}

	return (
		<View className="flex-1 justify-center items-center bg-gray-1000 gap-3 p-4">
			<View className="absolute top-24 p-4 rounded-lg bg-gray-900">
				<Text className="text-white-500 text-lg font-semiBold">
					{recognizing
						? mode === "commands"
							? "Escutando comando..."
							: "Gravando voz..."
						: "Pressione o botão e fale um comando"}
				</Text>
			</View>

			<View className="absolute top-44 p-4 rounded-lg bg-gray-900 w-11/12">
				{!!partial && <Text style={styles.partialText}>Escutando: {partial}</Text>}
				{!!result && <Text style={styles.transcriptionText}>Você disse: {result}</Text>}
				<Text style={[styles.partialText, { marginTop: 6 }]}>
					Último comando: {lastCommand}
				</Text>
			</View>

			<View style={[styles.buttonContainer]}>
				<TouchableOpacity
					style={[styles.recordButton, recognizing && styles.recordingButton]}
					disabled={!ready || startingRef.current}
					onPress={() => (recognizing ? recognizingStop() : speakCommandVoice())}
				>
					{recognizing ? (
						<Square size={32} color="#fff" />
					) : (
						<Mic size={32} color="#fff" />
					)}
				</TouchableOpacity>
			</View>

			{recognizing && (
				<TouchableOpacity style={styles.deleteButton} onPress={clearText}>
					<Trash size={24} color="#ff4444" />
				</TouchableOpacity>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	partialText: { color: "#888", fontSize: 14, fontStyle: "italic" },
	transcriptionText: { color: "#fff", fontSize: 16, marginTop: 8 },
	buttonContainer: { alignItems: "center", justifyContent: "center" },
	recordButton: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: "#2ecc71",
		justifyContent: "center",
		alignItems: "center",
		elevation: 5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
	},
	recordingButton: { backgroundColor: "#e74c3c" },
	deleteButton: {
		position: "absolute",
		bottom: 40,
		padding: 16,
		borderRadius: 8,
		backgroundColor: "#1a1a1a",
	},
})
