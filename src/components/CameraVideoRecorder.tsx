import { CameraView, useCameraPermissions } from "expo-camera"
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { StyleSheet, View, Text } from "react-native"

export type CameraVideoRecorderRef = {
	startRecording: () => Promise<void>
	stopRecording: () => Promise<string | null>
}

type Props = {
	facing?: "front" | "back"
}

export const CameraVideoRecorder = forwardRef<CameraVideoRecorderRef, Props>(
	({ facing = "back" }, ref) => {
		const cameraRef = useRef<CameraView>(null)
		const [permission, requestPermission] = useCameraPermissions()

		// guarda a promise da gravação para pegar o uri quando parar
		const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null)

		useEffect(() => {
			if (!permission?.granted) requestPermission()
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [])

		useImperativeHandle(ref, () => ({
			async startRecording() {
				if (!cameraRef.current) return
				if (recordingPromiseRef.current) return // já está gravando

				// inicia e guarda a promise (só resolve quando parar)
				recordingPromiseRef.current = cameraRef.current.recordAsync()
			},

			async stopRecording() {
				if (!cameraRef.current) return null
				if (!recordingPromiseRef.current) return null // não está gravando

				try {
					// manda parar
					cameraRef.current.stopRecording()

					// pega o resultado da gravação
					const video = await recordingPromiseRef.current
					return video?.uri ?? null
				} finally {
					recordingPromiseRef.current = null
				}
			},
		}))

		if (!permission?.granted) {
			return (
				<View style={styles.center}>
					<Text>Permissão da câmera necessária</Text>
				</View>
			)
		}

		return (
			<CameraView
				ref={cameraRef}
				style={StyleSheet.absoluteFill}
				facing={facing}
				mode="video"
			/>
		)
	},
)

const styles = StyleSheet.create({
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
})
