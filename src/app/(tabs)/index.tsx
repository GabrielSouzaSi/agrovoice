import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { View, Text, TouchableOpacity, Alert, Modal } from "react-native"
import { useFocusEffect } from "expo-router"
import Vosk from "react-native-vosk"
import * as Speech from "expo-speech"
import { Mic, Square, Trash } from "lucide-react-native"
import {
	useAudioRecorder,
	useAudioPlayer,
	IOSOutputFormat,
	getRecordingPermissionsAsync,
	requestRecordingPermissionsAsync,
	AudioQuality,
} from "expo-audio"
import * as Location from "expo-location"
import { persistFromCache } from "@/lib/fs"
import { colors } from "@/styles/colors"
import { buildRecordingName } from "@/lib/fileName"
import { insertRecorder } from "@/database/recorder"
import { CameraCapture, CameraCaptureRef } from "@/components/CameraCapture"
import { CameraVideoRecorder, CameraVideoRecorderRef } from "@/components/CameraVideoRecorder"

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
	"iniciar",
	"coleta",
	"retornar",
	"gravar",
	"voz",
	"video",
	"tirar",
	"foto",
	"o",
	"[unk]",
]

export default function RecordScreen() {
	const [visible, setVisible] = useState(false)
	// fonte dinâmica para o player (será definida após a gravação)
	const [source, setSource] = useState<{ uri: string } | null>(null)
	// player vinculado à fonte acima
	const player = useAudioPlayer(source)
	const vosk = useRef(new Vosk()).current

	const [ready, setReady] = useState(false)
	const [recognizing, setRecognizing] = useState(false)
	const [partial, setPartial] = useState("")
	const [result, setResult] = useState("")
	const [results, setResults] = useState<string[]>([]) // histórico
	const [lastCommand, setLastCommand] = useState("(nenhum)")
	const [mode, setMode] = useState<"commands" | "dictation">("commands") // <- novo

	const cameraRef = useRef<CameraCaptureRef>(null)
	const videoRecorderRef = useRef<CameraVideoRecorderRef>(null)

	const [photo, setPhoto] = useState<boolean>(false)
	const [video, setVideo] = useState<boolean>(false)

	const startingRef = useRef(false)
	const commandFiredRef = useRef(false)
	const partialRef = useRef("")

	const recognizingRef = useRef(false)

	// ref para acumular tudo
	const transcriptRef = useRef("")

	// Solicitar permissão do GPS
	async function getPermissionGPS() {
		const { status } = await Location.requestForegroundPermissionsAsync()

		if (status !== "granted") {
			Alert.alert("Permissão negada", "Dê permissão da localização para continuar.", [
				{ text: "OK", onPress: () => getPermissionGPS() },
			])
			return
		} else {
			await statusGPS()
		}
	}
	// Verificar se o GPS está ativado
	async function statusGPS() {
		const isGPSEnabled = await Location.hasServicesEnabledAsync()

		if (!isGPSEnabled) {
			Alert.alert("GPS desativado", "Ative o GPS para capturar a localização.")
			return false
		} else {
			// Capturar localização
			const userLocation = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.High,
			})
			// Armazena a localização no estado
			return userLocation
		}
	}

	// estado de permissão de gravação (mic)
	const [perm, setPerm] = useState<"undetermined" | "denied" | "granted">("undetermined")
	useEffect(() => {
		;(async () => {
			// verifica a permissão atual
			const res = await getRecordingPermissionsAsync()
			setPerm(res.status)
			// se não concedida e puder perguntar de novo, solicita ao usuário
			if (res.status !== "granted" && res.canAskAgain) {
				const req = await requestRecordingPermissionsAsync()
				setPerm(req.status)
			}
		})()
	}, [])

	// Carrega modelo 1x
	useEffect(() => {
		vosk.loadModel("vosk-model-pt")
			.then(() => setReady(true))
			.catch((e) => console.error("loadModel:", e))
		return () => {
			vosk.unload()
		}
	}, [vosk])

	const recorder = useAudioRecorder({
		isMeteringEnabled: true,
		extension: ".m4a",
		sampleRate: 44100,
		numberOfChannels: 1,
		bitRate: 64000,
		android: {
			// enums/strings aceitos pelo expo-audio para Android
			outputFormat: "mpeg4",
			audioEncoder: "aac",
		},
		ios: {
			// enums para iOS (qualidade máxima e parâmetros PCM)
			outputFormat: IOSOutputFormat.MPEG4AAC,
			audioQuality: AudioQuality.MAX,
			linearPCMBitDepth: 16,
			linearPCMIsBigEndian: false,
			linearPCMIsFloat: false,
		},
		web: {
			// fallback para web (quando aplicável)
			mimeType: "audio/webm",
			bitsPerSecond: 128000,
		},
	})

	// Start: "commands" (grammar) ou "dictation" (sem grammar)
	const recognizingStart = useCallback(
		async (startMode: "commands" | "dictation" = "commands") => {
			console.log("recognizingStart =>", ready, recognizingRef.current, startingRef.current)

			if (recognizingRef.current || startingRef.current) return
			//if (!ready) return // só bloqueia se ainda não carregou pela 1ª vez
			startingRef.current = true
			console.log(
				"Modo de gravação:",
				startMode === "commands" ? "com grammar" : "sem grammar",
			)

			try {
				// NOVO: grava APENAS no modo ditado "dictation"
				if (startMode === "dictation") {
					transcriptRef.current = "" // 🔹 zera transcrição acumulada
					setResults([]) // (opcional) limpa histórico mostrado na tela
					try {
						await recorder.prepareToRecordAsync()
						await recorder.record()
						console.log("Gravação iniciada 🎤")
					} catch (e) {
						console.warn("Falha ao iniciar gravação (dictation):", e)
					}
				}
				commandFiredRef.current = false
				partialRef.current = ""
				setPartial("")
				setResult("")
				setMode(startMode)
				const opts = startMode === "commands" ? { grammar: COMMAND_GRAMMAR } : {}
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
		if (!recognizingRef.current) {
			return // já está parado, não precisa parar de novo
		}
		recognizingRef.current = false
		setRecognizing(false)
		// console.log(mode)
		let { isRecording } = recorder.getStatus()

		try {
			// 2) para o Vosk
			await vosk.stop()
			console.log("Reconhecimento parado ⏹️")

			if (isRecording) {
				await recorder.stop()
				console.log("recognizingStop:" + isRecording)

				// pega todo o texto acumulado
				const transcription = transcriptRef.current

				let filename = buildRecordingName(recorder.uri, "recorder")
				let saved = await persistFromCache(recorder.uri, {
					targetSubdir: "recordings",
					overwrite: false,
					filename,
				})

				let location = await statusGPS()

				console.log(
					"Gravação salva!\n" +
						"Name => " +
						saved.name +
						"\nURI => " +
						saved.uri +
						"\nSize => " +
						saved.size,
				)
				let insert = await insertRecorder({
					name: saved.name,
					file: saved.uri,
					transcription: transcription,
					location: location
						? `${location.coords.latitude},${location.coords.longitude}`
						: "Indisponível",
					datetime: new Date().toISOString(),
				} as any)
				console.log(insert)
				insert
					? Speech.speak("Audio gravado com sucesso")
					: Speech.speak("Erro ao gravar audio")
				// reseta para próxima vez
				// setSource(saved)
				return
			}
		} catch (e) {
			console.error("stop:", e)
		} finally {
			// 3) atualiza estados/refs
			recognizingRef.current = false // ✅ ref zera já
			setRecognizing(false)
			commandFiredRef.current = false
			partialRef.current = ""
			// reseta para próxima vez
			transcriptRef.current = ""
			setResult("")
			if (isRecording) {
				setTimeout(() => {
					speakCommandVoice()
				}, 5000)
			}
		}
	}, [vosk])

	// AÇÕES dentro do componente
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

	const iniciarColeta = useCallback(() => {
		Speech.stop()
		Speech.speak("Coleta iniciada, qual o tipo de anomalia?", {
			language: "pt-BR",
			onDone: () => {
				speakCommandVoice()
			},
		})
	}, [])

	// Padrões de comando
	const COMMANDS = useMemo(
		() => [
			{ label: "iniciar coleta", re: /(^|\s)iniciar\s+coleta(\s|$)/, run: iniciarColeta },
			{ label: "gravar voz", re: /(^|\s)gravar\s+voz(\s|$)/, run: gravarVoz },
			{ label: "gravar voz", re: /(^|\s)tirar\s+foto(\s|$)/, run: takePhoto },
			{ label: "gravar voz", re: /(^|\s)gravar\s+video(\s|$)/, run: startVideoRecording },
		],
		[iniciarColeta, gravarVoz],
	)

	// Dispara 1 comando por ciclo
	const tryRunCommand = useCallback(
		async (raw: string) => {
			if (commandFiredRef.current) return
			const t = normalize(raw)
			if (!t) return
			//console.log("[tryRunCommand] texto:", t)
			for (const c of COMMANDS) {
				if (c.re.test(t)) {
					commandFiredRef.current = true
					setLastCommand(c.label)
					//console.log("[tryRunCommand] comando reconhecido:", c.label)
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

	const speakCommandVoice = useCallback(async () => {
		Speech.stop()
		Speech.speak("Diga um comando", {
			language: "pt-BR",
			onDone: () => {
				;(async () => {
					await recognizingStart("commands")
				})()
			},
		})
	}, [])

	async function takePhoto() {
		console.log("tirar foto");
		
		setPhoto(true)
		setVisible(true)
		const timer = setTimeout(async () => {
			try {
				const uri = await cameraRef.current.takePhoto()

				console.log("Foto salva em:", uri)
			} catch (error) {
				console.error("Erro ao tirar foto", error)
			} finally {
				setVisible(false)
				setPhoto(false)
				await recognizingStop()
				await speakCommandVoice()
			}
		}, 3000)
	}
	function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	async function startVideoRecording() {
		console.log("iniciar gravação de vídeo")

		setVideo(true)
		setVisible(true)

		// dá tempo para o componente Camera montar
		await sleep(250)

		await videoRecorderRef.current?.startRecording()

		setTimeout(async () => {
			try {
				const uri = await videoRecorderRef.current?.stopRecording()
				console.log("VIDEO:", uri)
			} catch (error) {
				console.error("Erro ao gravar vídeo", error)
			} finally {
				setVisible(false)
				setVideo(false)
				await recognizingStop()
				await speakCommandVoice()
			}
		}, 10000)
	}

	// Listeners
	useEffect(() => {
		// 🔹 helper local para detectar "stop" no modo ditado
		const handleHotwordStop = (text: string) => {
			const n = normalize(text)
			if (mode === "dictation" && /\bfinalizar\b/i.test(n)) {
				// limpa UI de parcial e encerra
				partialRef.current = ""
				setPartial("")
				recognizingStop()
				return true
			}
			return false
		}
		const onResult = vosk.onResult((res: string) => {
			const t = extractText(res)
			if (!t) return

			if (mode === "dictation") {
				transcriptRef.current = (transcriptRef.current + " " + t).trim() // 🔹 acumula
				setResults((prev) => [...prev, t]) // (UI) histórico
				// ⛔ HOTWORD
				if (handleHotwordStop(t)) return
			}
		})

		const onPartial = vosk.onPartialResult((s: string) => {
			const raw = extractText(s)

			partialRef.current = raw
			setPartial(raw)
			// responder já em parcial (mais responsivo) SÓ no modo comandos
			if (mode === "commands") tryRunCommand(raw)
		})
		const onFinal = vosk.onFinalResult((res: string) => {
			const t = extractText(res)
			partialRef.current = ""
			setPartial("")

			if (!t) return

			if (mode === "dictation") {
				transcriptRef.current = (transcriptRef.current + " " + t).trim() // 🔹 acumula
				setResults((prev) => [...prev, t]) // (UI)
				// ⛔ HOTWORD
				if (handleHotwordStop(t)) return
			} else {
				tryRunCommand(normalize(t))
			}
		})
		const onError = vosk.onError((e: any) => console.error("Vosk error:", e))
		const onTimeout = vosk.onTimeout(async () => {
			console.log("[timeout] último parcial:", partialRef.current)
			if (mode === "commands" && partialRef.current && !commandFiredRef.current) {
				await tryRunCommand(partialRef.current)
			}
			console.log("[timeout] parando reconhecimento")
			recognizingStop()
		})
		return () => {
			onResult.remove()
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
		}, []),
	)

	useEffect(() => {
		recognizingRef.current = recognizing
	}, [recognizing])

	const clearText = () => {
		setPartial("")
		setResult("")
		setLastCommand("(nenhum)")
	}

	useEffect(() => {
		if (results.length > 0) console.log(results.join(" "))
	}, [results])

	useEffect(() => {
		getPermissionGPS()
	}, [])

	return (
		<>
			<View className="flex-1 justify-center items-center bg-gray-1000 gap-3">
				{/* {source?.uri && <Button title="play" onPress={() => player.play()} />} */}
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
					{!!partial && (
						<Text className="text-gray-500 text-sm font-semiBold italic">
							Escutando: {partial}
						</Text>
					)}
					<Text className="text-gray-500 text-sm font-semiBold italic mt-2">
						Último comando: {lastCommand}
					</Text>
				</View>

				<View className="items-center justify-center">
					<TouchableOpacity
						className={`w-20 h-20 rounded-full bg-green-500 items-center justify-center shadow-lg shadow-black-500/50 elevation-md ${recognizing ? "bg-red-500" : ""}`}
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
					<TouchableOpacity
						className="absolute bottom-10 p-4 rounded-lg bg-gray-900"
						onPress={clearText}
					>
						<Trash size={24} color={colors.red[500]} />
					</TouchableOpacity>
				)}
			</View>
			<Modal visible={visible} animationType="slide">
				<View className="flex-1">
					{photo && <CameraCapture ref={cameraRef} />}
					{video && <CameraVideoRecorder ref={videoRecorderRef} />}
				</View>
			</Modal>
		</>
	)
}
