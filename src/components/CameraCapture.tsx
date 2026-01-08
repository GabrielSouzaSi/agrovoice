import { CameraView, useCameraPermissions } from "expo-camera"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { StyleSheet, View, Text } from "react-native"

export type CameraCaptureRef = {
	takePhoto: () => Promise<string | null>
}

type Props = {
	facing?: "front" | "back"
}

export const CameraCapture = forwardRef<CameraCaptureRef, Props>(({ facing = "back" }, ref) => {
	const cameraRef = useRef<CameraView>(null)
	const [permission, requestPermission] = useCameraPermissions()

	useEffect(() => {
		if (!permission?.granted) {
			requestPermission()
		}
	}, [])

	useImperativeHandle(ref, () => ({
		async takePhoto() {
			if (!cameraRef.current) return null

			const photo = await cameraRef.current.takePictureAsync({
				quality: 0.7,
				skipProcessing: true,
			})

			return photo.uri
		},
	}))

	if (!permission?.granted) {
		return (
			<View style={styles.center}>
				<Text>Permissão da câmera necessária</Text>
			</View>
		)
	}

	return <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
})

const styles = StyleSheet.create({
	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
})
