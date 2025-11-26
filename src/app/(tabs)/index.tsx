import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { View, Text, TouchableOpacity, Alert, Button, StyleSheet } from "react-native"
import { useFocusEffect } from "expo-router"
import Vosk from "react-native-vosk"

import * as Speech from "expo-speech"
import { Mic, Square, Trash } from "lucide-react-native"
import BottomSheet from '@gorhom/bottom-sheet';
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
import { insertPraga } from "@/database/praga"
import React from "react"


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
	"praga",
	"[unk]",

]



export default function RecordScreen() {

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

	// Animation shared value
	const pulseAnim = useSharedValue(1);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ scale: pulseAnim.value }],
		};
	});

	useEffect(() => {
		if (recognizing) {
			pulseAnim.value = withRepeat(
				withSequence(
					withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
					withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
				),
				-1, // Infinite
				true // Reverse
			);
		} else {
			pulseAnim.value = withTiming(1);
		}
	}, [recognizing]);

	const startingRef = useRef(false)
	const commandFiredRef = useRef(false)
	const partialRef = useRef("")

	const recognizingRef = useRef(false)

	// ref para acumular tudo
	const transcriptRef = useRef("")



	// estado de permissão de gravação (mic)
	const [perm, setPerm] = useState<"undetermined" | "denied" | "granted">("undetermined")
	useEffect(() => {
		; (async () => {
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
				let transcription = transcriptRef.current.split("ponto")
				console.log(transcriptRef.current)
				console.log(transcription)
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
				let insert = await insertPraga({
					name: saved.name,
					file: saved.uri,
					description: transcription[0] || "Sem descrição",
					fazenda: transcription[1] || "Indefinido",
					praga: transcription[2] || "Indefinido",
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
	const abrirMapa = useCallback(() => {
		Speech.stop()
		Speech.speak("Abrindo mapa agora", {
			language: "pt-BR",
			onDone: () => {
				// reinicia em modo ditado (sem grammar, timeout maior)
				; (async () => {
					setTimeout(() => {
						recognizingStart("commands")
					}, 5000)
				})()
			},
		})
	}, []) // sem deps de estado
	const mostrarPerfil = useCallback(() => {
		Speech.stop()
		Speech.speak("Mostrando perfil", { language: "pt-BR" })
		console.log(">> mostrarPerfil aqui()")
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
		Speech.speak("Pode falar alguma coisa", {
			language: "pt-BR",
			onDone: () => {
				// reinicia em modo ditado (sem grammar, timeout maior)
				; (async () => {
					await recognizingStop()
					await recognizingStart("dictation")
				})()
			},
		})
	}, [recognizingStop, recognizingStart]) // sem deps de estado
	const gravarPraga = useCallback(async () => {
		Speech.stop()
		Speech.speak("Iniciando a gravação", {
			language: "pt-BR",
			onDone: () => {
				// reinicia em modo ditado (sem grammar, timeout maior)
				; (async () => {
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
			{ label: "mostrar perfil", re: /(^|\s)(mostrar\s+(o\s+)?)?perfil(\s|$)/, run: mostrarPerfil, },
			{ label: "saldo", re: /(^|\s)(meu\s+)?saldo(\s|$)/, run: mostrarSaldo },
			{ label: "voltar", re: /(^|\s)(voltar|retornar)(\s|$)/, run: voltar },
			{ label: "gravar voz", re: /(^|\s)gravar\s+voz(\s|$)/, run: gravarVoz },
			{ label: "gravar praga", re: /(^|\s)gravar\s+praga(\s|$)/, run: gravarPraga },
		],
		[abrirMapa, mostrarPerfil, mostrarSaldo, voltar, gravarVoz, gravarPraga],
	)

	// Carrega modelo 1x
	useEffect(() => {
		vosk.loadModel("vosk-model-pt")
			.then(() => setReady(true))
			.catch((e) => console.error("loadModel:", e))
		return () => {
			vosk.unload()
		}
	}, [vosk])

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



	const speakCommandVoice = useCallback(async (message = "Estou ouvindo") => {
		Speech.stop()
		Speech.speak(message, {
			language: "pt-BR",
			onDone: () => {
				; (async () => {
					await recognizingStart("commands")
				})()
			},
		})
	}, [recognizingStart])

	// Feedback de erro/não entendido
	const speakUnknownCommand = useCallback(() => {
		Speech.stop()
		Speech.speak("Desculpe, não entendi. Pode repetir?", {
			language: "pt-BR",
			onDone: () => {
				// Tenta ouvir de novo
				setTimeout(() => {
					recognizingStart("commands")
				}, 500)
			}
		})
	}, [recognizingStart])

	// Listeners
	useEffect(() => {
		// 🔹 helper local para detectar "stop" no modo ditado
		const handleHotwordStop = (text: string) => {
			const n = normalize(text)
			if (mode === "dictation" && /\bfinalizar\b/i.test(n)) {
				// limpa UI de parcial e encerra
				partialRef.current = ""
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
			if (mode === "commands") {
				if (partialRef.current && !commandFiredRef.current) {
					await tryRunCommand(partialRef.current)
				} else if (!commandFiredRef.current) {
					// Se não falou nada ou não entendeu nada
					speakUnknownCommand()
					return // Não chama recognizingStop aqui, o speakUnknownCommand vai reiniciar
				}
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

	// Solicitar permissão
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

	useEffect(() => {
		getPermissionGPS()
	}, [])

	return (
		<View style={styles.container}>


			<View >


				<View className="p-4 rounded-lg mb-2">
					<Text style={styles.title}>Agro</Text>

					<Text className="text-white-500 text-lg font-light">
						{recognizing
							? mode === "commands"
								? "Escutando comando..."
								: "Gravando voz..."
							: "Pressione o botão e fale um comando"}
					</Text>
				</View>

				<View className="p-4 rounded-lg bg-gray-900 w-full mb-2">
					{!!partial && (
						<Text className="text-gray-500 text-sm font-semiBold italic">
							Escutando: {partial}
						</Text>
					)}
					<Text className="text-gray-500 text-sm font-semiBold italic mt-2">
						Último comando: {lastCommand}
					</Text>
				</View>



			</View>

			<View className="items-center justify-center top-20">
				<TouchableOpacity
					disabled={!ready || startingRef.current}
					onPress={() => (recognizing ? recognizingStop() : speakCommandVoice())}
				>
					<Animated.View
						className={`w-20 h-20 rounded-full bg-green-500 items-center justify-center shadow-lg shadow-black-500/50 elevation-md ${recognizing ? "bg-red-500" : ""}`}
						style={[animatedStyle]}
					>
						{recognizing ? (
							<Square size={32} color="#fff" />
						) : (
							<Mic size={32} color="#fff" />
						)}
					</Animated.View>
				</TouchableOpacity>
			</View>







			{recognizing && (
				<TouchableOpacity
					className="absolute bottom-40 p-4 rounded-lg bg-gray-900"
					onPress={clearText}
				>
					<Trash size={24} color={colors.red[500]} />
				</TouchableOpacity>
			)}

		</View>
	)

}
const styles = StyleSheet.create({
	contentContainer: {
		flex: 1,
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#1f2937',
	},
	title: {
		fontSize: 24,
		fontFamily: "Inter_700Bold",
		color: "#fff",
		marginTop: 60,
		marginBottom: 20,
	},
	container: {
		flex: 1,
		backgroundColor: "#121212",
		padding: 16,
	},
});
