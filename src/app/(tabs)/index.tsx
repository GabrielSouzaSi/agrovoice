import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { View, Text, TouchableOpacity, Alert, Button, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
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
import { findBestMatch } from "@/lib/validation"
import * as ImagePicker from 'expo-image-picker';


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
	"coleta",
	"anomalia",
	"propriedade",
	"objetivo",
	//"corrigir",
	"repetir",
	"finalizar",
	"dia",
]



const styles = StyleSheet.create({
	contentContainer: {
		flex: 1,
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#ffffff',
	},
	title: {
		fontSize: 24,
		fontFamily: "Inter_700Bold",
		color: "#000000",
		marginTop: 60,
		marginBottom: 20,
	},
	container: {
		flex: 1,
		backgroundColor: "#ffffff",
		padding: 16,
	},
});

export default function RecordScreen() {
	const [isDayStarted, setIsDayStarted] = useState(false);
	const [showColetaUI, setShowColetaUI] = useState(false);

	// --- Voice Assistant State ---
	const [source, setSource] = useState<{ uri: string } | null>(null)
	const player = useAudioPlayer(source)
	const vosk = useRef(new Vosk()).current

	const [ready, setReady] = useState(false)
	const [recognizing, setRecognizing] = useState(false)
	const [partial, setPartial] = useState("")
	const [result, setResult] = useState("")
	const [results, setResults] = useState<string[]>([])
	const [lastCommand, setLastCommand] = useState("(nenhum)")
	const [mode, setMode] = useState<"commands" | "dictation">("commands")

	// Photo Flow State
	const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
	const [tempPragaName, setTempPragaName] = useState("");
	const [tempPragaFile, setTempPragaFile] = useState<any>(null);
	const isPhotoDecisionFlow = useRef(false);

	// Animation
	const pulseAnim = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pulseAnim.value }],
	}));

	useEffect(() => {
		if (recognizing) {
			pulseAnim.value = withRepeat(
				withSequence(
					withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
					withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
				),
				-1, true
			);
		} else {
			pulseAnim.value = withTiming(1);
		}
	}, [recognizing]);

	const startingRef = useRef(false)
	const commandFiredRef = useRef(false)
	const partialRef = useRef("")
	const recognizingRef = useRef(false)
	const transcriptRef = useRef("")
	const isColetaFlow = useRef(false)

	// Permissions
	const [perm, setPerm] = useState<"undetermined" | "denied" | "granted">("undetermined")
	useEffect(() => {
		(async () => {
			const res = await getRecordingPermissionsAsync()
			setPerm(res.status)
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
		android: { outputFormat: "mpeg4", audioEncoder: "aac" },
		ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MAX, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
		web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
	})

	// --- Logic ---
	const recognizingStart = useCallback(async (startMode: "commands" | "dictation" = "commands") => {
		if (recognizingRef.current || startingRef.current) return
		startingRef.current = true

		try {
			if (startMode === "dictation") {
				transcriptRef.current = ""
				setResults([])
				try {
					await recorder.prepareToRecordAsync()
					await recorder.record()
				} catch (e) {
					console.warn("Falha ao iniciar gravação:", e)
				}
			}
			commandFiredRef.current = false
			partialRef.current = ""
			setPartial("")
			setMode(startMode)

			const opts = startMode === "commands" ? { grammar: COMMAND_GRAMMAR } : undefined
			const started = await vosk.start(opts)

			if (started === undefined) {
				Alert.alert("Voz", "Permissão de microfone negada")
				return
			}
			recognizingRef.current = true
			setRecognizing(true)
		} catch (e) {
			console.error("start:", e)
		} finally {
			startingRef.current = false
		}
	}, [ready, vosk])

	const recognizingStop = useCallback(async () => {
		if (!recognizingRef.current) return
		recognizingRef.current = false
		setRecognizing(false)
		let { isRecording } = recorder.getStatus()

		try {
			await vosk.stop()
			if (isRecording) {
				await recorder.stop()
				let filename = buildRecordingName(recorder.uri, "recorder")
				let saved = await persistFromCache(recorder.uri, { targetSubdir: "recordings", overwrite: false, filename })
				let location = await statusGPS()

				// Logic for Coleta Command
				const pestName = transcriptRef.current.trim() || "Não identificado";

				// Store temp data and ask for photo
				setTempPragaName(pestName);
				setTempPragaFile(saved);
				isColetaFlow.current = false;
				isPhotoDecisionFlow.current = true;
				setShowColetaUI(false); // Hide the "Qual anomalia?" UI
				setShowPhotoPrompt(true); // Show the "Deseja foto?" UI

				Speech.speak(`Entendi ${pestName}. Deseja tirar uma foto?`, {
					language: "pt-BR",
					onDone: () => {
						transcriptRef.current = "";
						setResults([]);
						recognizingStart("dictation");
					}
				});
				// We don't save yet. We wait for the photo decision.
			}
			return
		} catch (e) {
			console.error("stop:", e)
		} finally {
			recognizingRef.current = false
			setRecognizing(false)
			commandFiredRef.current = false
			partialRef.current = ""
			transcriptRef.current = ""
			setResult("")
			if (isRecording) {
				setTimeout(() => {
					if (!isColetaFlow.current && !isPhotoDecisionFlow.current) {
						speakCommandVoice()
					}
				}, 5000)
			}
		}
	}, [vosk])

	const speakCommandVoice = useCallback(async (message = "Estou ouvindo") => {
		setLastSpokenMessage(message)
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

	const speakUnknownCommand = useCallback(() => {
		Speech.stop()
		Speech.speak("Desculpe, não entendi. Pode repetir?", {
			language: "pt-BR",
			onDone: () => {
				setTimeout(() => {
					recognizingStart("commands")
				}, 500)
			}
		})
	}, [recognizingStart])

	// Actions
	const abrirMapa = useCallback(() => {
		Speech.stop()
		Speech.speak("Abrindo mapa agora", {
			language: "pt-BR",
			onDone: () => {
				setTimeout(() => recognizingStart("commands"), 5000)
			}
		})
	}, [])
	const mostrarPerfil = useCallback(() => { Speech.stop(); Speech.speak("Mostrando perfil", { language: "pt-BR" }) }, [])
	const mostrarSaldo = useCallback(() => { Speech.stop(); Speech.speak("Mostrando saldo", { language: "pt-BR" }) }, [])
	const voltar = useCallback(() => { Speech.stop(); Speech.speak("Voltando", { language: "pt-BR" }) }, [])

	const gravarVoz = useCallback(async () => {
		Speech.stop()
		Speech.speak("Pode falar alguma coisa", {
			language: "pt-BR",
			onDone: () => {
				; (async () => {
					await recognizingStop()
					await recognizingStart("dictation")
				})()
			},
		})
	}, [recognizingStop, recognizingStart])

	const gravarColeta = useCallback(async () => {
		Speech.stop()
		setShowColetaUI(true);
		Speech.speak("Qual anomalia você encontrou?", {
			language: "pt-BR",
			onDone: () => {
				; (async () => {
					isColetaFlow.current = true;
					await recognizingStop()
					await recognizingStart("dictation")
				})()
			},
		})
	}, [recognizingStop, recognizingStart])



	const [lastSpokenMessage, setLastSpokenMessage] = useState("")

	const savePraga = async (photoUri: string | null) => {
		let location = await statusGPS()
		await insertPraga({
			name: tempPragaFile.name,
			file: tempPragaFile.uri,
			description: `Coleta de anomalia`,
			fazenda: "Indefinido",
			praga: tempPragaName,
			location: location ? `${location.coords.latitude},${location.coords.longitude}` : "Indisponível",
			datetime: new Date().toISOString(),
			photo: photoUri || undefined
		} as any)

		setShowPhotoPrompt(false);
		setTempPragaName("");
		setTempPragaFile(null);
		isPhotoDecisionFlow.current = false;

		Speech.speak(`Coleta salva com sucesso.`, {
			language: "pt-BR",
			onDone: () => {
				setTimeout(() => {
					speakCommandVoice("O que deseja fazer agora?");
				}, 1000);
			}
		});
	};

	const takePhoto = async () => {
		const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
		if (permissionResult.granted === false) {
			Alert.alert("Permissão negada", "Você recusou a permissão da câmera.");
			savePraga(null);
			return;
		}

		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: false,
			quality: 0.5,
		});

		if (!result.canceled) {
			savePraga(result.assets[0].uri);
		} else {
			savePraga(null);
		}
	};

	const processPhotoDecision = useCallback(async (text: string) => {
		const cleanText = text.trim().toLowerCase();
		if (cleanText.includes("sim") || cleanText.includes("tirar") || cleanText.includes("foto") || cleanText.includes("pode")) {
			await recognizingStop();
			await takePhoto();
		} else if (cleanText.includes("não") || cleanText.includes("cancelar") || cleanText.includes("sem")) {
			await recognizingStop();
			await savePraga(null);
		}
	}, [tempPragaName, tempPragaFile]);



	// ... (other functions)

	const corrigir = useCallback(async () => {
		Speech.stop()
		// If in Coleta flow, restart it
		if (isColetaFlow.current) {
			Speech.speak("Correção. Qual anomalia você encontrou?", {
				language: "pt-BR",
				onDone: () => {
					; (async () => {
						transcriptRef.current = ""
						setResults([])
						await recognizingStop()
						await recognizingStart("dictation")
					})()
				},
			})
		} else {
			// Generic correction
			Speech.speak("Correção. O que deseja fazer?", {
				language: "pt-BR",
				onDone: () => {
					; (async () => {
						await recognizingStart("commands")
					})()
				},
			})
		}
	}, [recognizingStop, recognizingStart])

	const repetir = useCallback(async () => {
		Speech.stop()
		const msg = lastSpokenMessage || "Não tenho nada para repetir."
		Speech.speak(msg, {
			language: "pt-BR",
			onDone: () => {
				; (async () => {
					if (isColetaFlow.current) {
						await recognizingStart("dictation")
					} else {
						await recognizingStart("commands")
					}
				})()
			},
		})
	}, [lastSpokenMessage, recognizingStart])

	const handleEndDay = useCallback(() => {
		setIsDayStarted(false);
		recognizingStop();
		Speech.stop();
		setShowColetaUI(false);
	}, [recognizingStop]);

	const COMMANDS = useMemo(() => [
		{ label: "abrir mapa", re: /(^|\s)abrir\s+(o\s+)?mapa(\s|$)/, run: abrirMapa },
		{ label: "mostrar perfil", re: /(^|\s)(mostrar\s+(o\s+)?)?perfil(\s|$)/, run: mostrarPerfil },
		{ label: "saldo", re: /(^|\s)(meu\s+)?saldo(\s|$)/, run: mostrarSaldo },
		{ label: "voltar", re: /(^|\s)(voltar|retornar)(\s|$)/, run: voltar },
		{ label: "gravar voz", re: /(^|\s)gravar\s+voz(\s|$)/, run: gravarVoz },
		{ label: "coleta", re: /(^|\s)coleta(\s|$)/, run: gravarColeta },
		{ label: "corrigir", re: /(^|\s)corrigir(\s|$)/, run: corrigir },
		{ label: "repetir", re: /(^|\s)repetir(\s|$)/, run: repetir },
		{ label: "finalizar dia", re: /(^|\s)finalizar\s+dia(\s|$)/, run: () => { Speech.stop(); Speech.speak("Finalizando o dia", { language: "pt-BR", onDone: handleEndDay }); } },
	], [abrirMapa, mostrarPerfil, mostrarSaldo, voltar, gravarVoz, gravarColeta, corrigir, repetir, handleEndDay])

	useEffect(() => {
		vosk.loadModel("vosk-model-pt").then(() => setReady(true)).catch(e => console.error("loadModel:", e))
		return () => { vosk.unload() }
	}, [vosk])

	const tryRunCommand = useCallback(async (raw: string) => {
		if (commandFiredRef.current) return
		const t = normalize(raw)
		if (!t) return
		for (const c of COMMANDS) {
			if (c.re.test(t)) {
				commandFiredRef.current = true
				setLastCommand(c.label)
				try { await Promise.resolve(c.run()) }
				catch (e) { console.error("Falha ação:", e) }
				finally { if (c.label !== "gravar voz" && c.label !== "gravar praga" && c.label !== "coleta") recognizingStop() }
				break
			}
		}
	}, [COMMANDS])

	useEffect(() => {
		const handleHotwordStop = (text: string) => {
			const n = normalize(text)
			if (mode === "dictation" && /\bfinalizar\b/i.test(n)) {
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
				transcriptRef.current = (transcriptRef.current + " " + t).trim()
				setResults(prev => [...prev, t])
				if (handleHotwordStop(t)) return

				// Auto-save for Coleta flow on first result
				if (isColetaFlow.current && t.trim().length > 0) {
					console.log("chegou aqui on result")
					recognizingStop()
				}

				if (isPhotoDecisionFlow.current && t.trim().length > 0) {
					processPhotoDecision(transcriptRef.current);
				}
			}
		})
		const onPartial = vosk.onPartialResult((s: string) => {
			const raw = extractText(s)
			partialRef.current = raw
			setPartial(raw)
			if (mode === "commands") tryRunCommand(raw)
		})
		const onFinal = vosk.onFinalResult((res: string) => {
			const t = extractText(res)
			partialRef.current = ""
			setPartial("")
			if (!t) return
			if (mode === "dictation") {
				transcriptRef.current = (transcriptRef.current + " " + t).trim()
				setResults(prev => [...prev, t])
				if (handleHotwordStop(t)) return

				// Auto-save for Coleta flow: if we got a result, assume user finished speaking the name
				if (isColetaFlow.current && t.trim().length > 0) {
					console.log("chegou aqui on final")
					recognizingStop()
				}

				if (isPhotoDecisionFlow.current && t.trim().length > 0) {
					processPhotoDecision(transcriptRef.current);
				}
			} else {
				tryRunCommand(normalize(t))
			}
		})
		const onError = vosk.onError((e: any) => console.error("Vosk error:", e))
		const onTimeout = vosk.onTimeout(async () => {
			// Auto-save for Coleta flow when user pauses
			if (isColetaFlow.current && mode === "dictation" && transcriptRef.current.trim().length > 0) {
				recognizingStop()
				return
			}

			if (isPhotoDecisionFlow.current && mode === "dictation" && transcriptRef.current.trim().length > 0) {
				processPhotoDecision(transcriptRef.current);
				return;
			}

			if (mode === "commands") {
				if (partialRef.current && !commandFiredRef.current) {
					await tryRunCommand(partialRef.current)
				} else if (!commandFiredRef.current) {
					speakUnknownCommand()
					return
				}
			}
			recognizingStop()
		})
		return () => { onResult.remove(); onPartial.remove(); onFinal.remove(); onError.remove(); onTimeout.remove() }
	}, [vosk, tryRunCommand, mode])

	useFocusEffect(useCallback(() => { return () => { recognizingStop() } }, []))
	useEffect(() => { recognizingRef.current = recognizing }, [recognizing])

	async function getPermissionGPS() {
		const { status } = await Location.requestForegroundPermissionsAsync()
		if (status !== "granted") return
		await statusGPS()
	}
	async function statusGPS() {
		const isGPSEnabled = await Location.hasServicesEnabledAsync()
		if (!isGPSEnabled) return false
		return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
	}
	useEffect(() => { getPermissionGPS() }, [])

	// --- Start Day Logic ---
	const handleStartDay = () => {
		setIsDayStarted(true);
		// Auto-start voice assistant
		setTimeout(() => {
			speakCommandVoice(`Dia iniciado. O que deseja fazer?`);
		}, 1000);
	};



	if (showPhotoPrompt) {
		return (
			<View style={styles.container} className="justify-center">
				<View className="flex-1 justify-center px-6">
					<View className="mb-8 items-center">
						<Text className="text-3xl text-black font-bold mb-4 text-center">
							Deseja tirar uma foto da anomalia?
						</Text>
						<Text className="text-xl text-gray-600 mb-8 text-center">
							{tempPragaName}
						</Text>

						<View className="flex-row gap-4 w-full">
							<TouchableOpacity
								className="flex-1 bg-green-600 py-6 rounded-2xl items-center shadow-lg"
								onPress={async () => { await recognizingStop(); await takePhoto(); }}
							>
								<Text className="text-white text-xl font-bold">SIM</Text>
							</TouchableOpacity>
							<TouchableOpacity
								className="flex-1 bg-gray-200 py-6 rounded-2xl items-center"
								onPress={async () => { await recognizingStop(); await savePraga(null); }}
							>
								<Text className="text-gray-800 text-xl font-bold">NÃO</Text>
							</TouchableOpacity>
						</View>
						<Text className="text-gray-400 mt-8 text-center animate-pulse">
							Diga "Sim" ou "Não"
						</Text>
					</View>
				</View>
			</View>
		);
	}

	if (showColetaUI) {
		return (
			<View style={styles.container} className="justify-center">
				<View className="flex-1 justify-center px-6">
					<TouchableOpacity
						onPress={() => { setShowColetaUI(false); isColetaFlow.current = false; recognizingStop(); }}
						className="absolute top-10 right-4 z-20 bg-gray-100 p-2 rounded-full"
					>
						<Trash size={24} color="#ef4444" />
					</TouchableOpacity>

					<View className="mb-8">
						<Text className="text-3xl text-green-600 font-bold mb-4">
							Qual anomalia?
						</Text>
						<View>
							<Text className="text-4xl font-bold text-black leading-tight">
								{partial || "..."}
							</Text>
							{recognizing && <Text className="text-sm text-green-500 mt-2 font-bold animate-pulse">Ouvindo...</Text>}
						</View>
					</View>
				</View>
			</View>
		);
	}

	// etapa 1
	if (!isDayStarted) {
		return (
			<View style={styles.container} className="items-center justify-center">
				<Text style={styles.title}>AgroVoice</Text>
				<TouchableOpacity
					className="bg-green-400 px-20 py-10 rounded-full shadow-lg elevation-lg"
					onPress={handleStartDay}
				>
					<Text className="text-white text-x2 font-bold">INICIAR DIA</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View className="absolute top-10 right-4 z-10">
				<TouchableOpacity onPress={handleEndDay} className="bg-red-500/20 px-8 py-4 rounded-full">
					<Text className="text-red-400 text-base font-bold">FINALIZAR DIA</Text>
				</TouchableOpacity>
			</View>

			<View>
				<View className="p-4 rounded-lg mb-2">
					<Text style={styles.title}>Agro</Text>
					<Text className="text-black text-lg font-light">
						{recognizing
							? mode === "commands" ? "Escutando comando..." : "Gravando voz..."
							: "Pressione o botão e fale um comando"}
					</Text>
				</View>

				<View className="p-4 rounded-lg w-full mb-2 items-center min-h-[100px] justify-center">
					{!!partial && (
						<Text className="text-black text-2xl font-bold text-center leading-8 shadow-sm">
							"{partial}"
						</Text>
					)}
					<Text className="text-black text-sm font-semiBold italic mt-4">
						{lastCommand !== "(nenhum)" ? `Último: ${lastCommand}` : ""}
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
		</View>
	)
}
