import { useState, useEffect, useRef, useCallback } from "react"
import { StyleSheet, View, Text, Button } from "react-native"
import Vosk from "react-native-vosk"

// ------- suas ações reais aqui -------
function abrirMapa() {
	console.log(">> abrirMapa()")
	// ex: router.push("/map")
}
function mostrarPerfil() {
	console.log(">> mostrarPerfil()")
}
function mostrarSaldo() {
	console.log(">> mostrarSaldo()")
}
function voltar() {
	console.log(">> voltar()")
}
// -------------------------------------

type Command = {
	name: string
	// use padrões simples; regex ajuda a cobrir variações
	patterns: RegExp[]
	action: () => void | Promise<void>
	triggerOnPartial?: boolean // dispara também em parciais
}

const COMMANDS: Command[] = [
	{
		name: "abrir_mapa",
		patterns: [/abrir mapa/, /\bmapa\b/],
		action: abrirMapa,
		triggerOnPartial: true,
	},
	{
		name: "mostrar_perfil",
		patterns: [/mostrar perfil/, /\bperfil\b/],
		action: mostrarPerfil,
		triggerOnPartial: true,
	},
	{ name: "saldo", patterns: [/meu saldo/, /\bsaldo\b/], action: mostrarSaldo },
	{ name: "voltar", patterns: [/voltar|retornar/], action: voltar, triggerOnPartial: true },
]

// grammar ajuda o vosk a focar no vocabulário esperado
const COMMAND_GRAMMAR = [
	"abrir mapa",
	"mostrar perfil",
	"meu saldo",
	"voltar",
	"[unk]", // permite palavras fora do vocabulário sem quebrar
]

function normalize(text: string) {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // remove acentos
		.replace(/\s+/g, " ")
		.trim()
}

function extractText(res: any) {
	// o wrapper pode devolver string JSON ou objeto
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

export default function App() {
	const [ready, setReady] = useState(false)
	const [recognizing, setRecognizing] = useState(false)
	const [result, setResult] = useState<string>("")
	const [lastCommand, setLastCommand] = useState<string>("(nenhum)")
	const [results, setResults] = useState<string[]>([]) // histórico

	const vosk = useRef(new Vosk()).current
	const lastTriggerRef = useRef(0)

	const runCommand = useCallback((rawText: string, isPartial = false) => {
		const text = normalize(rawText)
		// anti-duplo disparo
		const now = Date.now()
		if (now - lastTriggerRef.current < 700) return

		for (const cmd of COMMANDS) {
			if (isPartial && !cmd.triggerOnPartial) continue
			if (cmd.patterns.some((p) => p.test(text))) {
				lastTriggerRef.current = now
				setLastCommand(cmd.name)
				Promise.resolve(cmd.action()).catch(() => {})
				return // dispara só o primeiro que casar
			}
		}
	}, [])

	const load = useCallback(() => {
		// use o nome exato da pasta do modelo dentro de android/app/src/main/assets
		// ex.: "vosk-model-pt" ou "model-pt-br"
		vosk.loadModel("vosk-model-pt")
			.then(() => setReady(true))
			.catch((e) => console.error(e))
	}, [vosk])

	const unload = useCallback(() => {
		vosk.unload()
		setReady(false)
		setRecognizing(false)
	}, [vosk])

	const record = () => {
		vosk.start()
			.then(() => {
				console.log("Starting recognition...")
				setRecognizing(true)
			})
			.catch((e) => console.error(e))
	}

	const recordWithGrammar = () => {
		vosk.start({ grammar: COMMAND_GRAMMAR, timeout: 5000 })
			.then(() => {
				console.log("Starting recognition with grammar...")
				setRecognizing(true)
			})
			.catch((e) => console.error(e))
	}

	const stop = () => {
		vosk.stop()
		console.log("Stopping recognition...")
		setRecognizing(false)
	}

	useEffect(() => {
		const onResult = vosk.onResult((res) => {
			const t = extractText(res)
			setResult(t)
			if (t) setResults((prev) => [...prev, t])
			runCommand(t, false)
		})

		const onPartial = vosk.onPartialResult((res) => {
			const t = extractText(res)
			setResult(t)
			if (t) runCommand(t, true)
		})

		const onFinal = vosk.onFinalResult((res) => {
			const t = extractText(res)
			setResult(t)
			if (t) setResults((prev) => [...prev, t])
			runCommand(t, false)
		})

		const onError = vosk.onError((e) => console.error(e))
		const onTimeout = vosk.onTimeout(() => {
			console.log("Recognizer timed out")
			setRecognizing(false)
		})

		return () => {
			onResult.remove()
			onPartial.remove()
			onFinal.remove()
			onError.remove()
			onTimeout.remove()
		}
	}, [vosk, runCommand])

	return (
		<View style={styles.container}>
			<View style={{ maxHeight: 200, padding: 8 }}>
				{results.length > 0 && <Text>{results.join(" ")}</Text>}
			</View>
			<Button
				onPress={ready ? unload : load}
				title={ready ? "Unload model" : "Load model"}
				color="blue"
			/>

			{!recognizing && (
				<View style={styles.recordingButtons}>
					<Button title="Record" onPress={record} disabled={!ready} color="green" />
					<Button
						title="Record (grammar)"
						onPress={recordWithGrammar}
						disabled={!ready}
						color="green"
					/>
				</View>
			)}

			{recognizing && <Button onPress={stop} title="Stop" color="red" />}

			<Text>Texto reconhecido:</Text>
			<Text style={{ fontWeight: "bold" }}>{result}</Text>

			<Text style={{ marginTop: 12 }}>Último comando executado:</Text>
			<Text style={{ fontWeight: "bold" }}>{lastCommand}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { gap: 20, flex: 1, alignItems: "center", justifyContent: "center" },
	recordingButtons: { gap: 12 },
})
