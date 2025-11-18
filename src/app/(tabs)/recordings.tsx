import React, { useCallback, useEffect, useState } from "react"
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Modal,
	TextInput,
	Alert,
} from "react-native"
import { Cloud, Play, Pause, Trash } from "lucide-react-native"
import { delRecorderId, getRecorders } from "@/database/recorder"
import { RecorderDTO } from "@/dtos/recorderDTO"
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import * as FileSystem from "expo-file-system"
import { useFocusEffect } from "expo-router"

export default function RecordingsScreen() {
	const [selectedRecording, setSelectedRecording] = useState<number | null>(null)
	const [syncModalVisible, setSyncModalVisible] = useState(false)
	const [collection, setCollection] = useState("")
	const [property, setProperty] = useState("")
	const [recordings, setRecordings] = useState<RecorderDTO[]>([])
	const [playingRecordingId, setPlayingRecordingId] = useState<number | null>(null)

	// Player único (sem fonte inicial)
	const player = useAudioPlayer(null)
	const status = useAudioPlayerStatus(player) // { isPlaying, duration, currentTime, ... }

	const getItemById = (id: number) => recordings.find((r) => r.id === id)

	// PLAY/PAUSE
	const handlePlayback = async (id: number) => {
		try {
			const item = getItemById(id)
			if (!item) return

			// Se já é o atual
			if (playingRecordingId === id) {
				if (status?.playing) {
					await player.pause()
					setPlayingRecordingId(null)
					return
				} else {
					// “Replay” ou retomar
					await player.seekTo(0) // expo-audio não volta sozinho ao início
					await player.play()
					setPlayingRecordingId(id)
					return
				}
			}

			// Troca a fonte e toca
			await player.replace({ uri: item.file }) // file:///…m4a
			await player.seekTo(0)
			await player.play()
			setPlayingRecordingId(id)
		} catch (e) {
			console.log("Playback error", e)
			Alert.alert("Erro", "Não foi possível reproduzir este áudio.")
			setPlayingRecordingId(null)
		}
	}

	// SYNC (exemplo multipart)
	const handleSync = async (id: number) => {
		try {
			const item = getItemById(id)
			if (!item) return
			if (!collection.trim() || !property.trim()) {
				Alert.alert("Atenção", "Preencha Collection e Property.")
				return
			}

			const API_URL = "https://SEU_BACKEND.com/api/recordings"
			const res = await FileSystem.uploadAsync(API_URL, item.file, {
				httpMethod: "POST",
				uploadType: FileSystem.FileSystemUploadType.MULTIPART,
				fieldName: "file",
				parameters: {
					id: String(item.id),
					name: item.name,
					datetime: String(item.datetime),
					collection,
					property,
					transcription: item.transcription ?? "",
				},
				headers: {
					// Authorization: `Bearer ${token}`,
				},
			})

			if (res.status >= 200 && res.status < 300) {
				Alert.alert("Sucesso", "Gravação sincronizada.")
				setSyncModalVisible(false)
				setSelectedRecording(null)
				setCollection("")
				setProperty("")
			} else {
				console.log("Upload response:", res)
				Alert.alert("Erro", "Falha ao sincronizar. Verifique o servidor.")
			}
		} catch (e) {
			console.log("Sync error", e)
			Alert.alert("Erro", "Não foi possível sincronizar esta gravação.")
		}
	}

	// DELETE
	const deleteRecording = async (item: RecorderDTO) => {
		player.pause()
		Alert.alert("Atenção", `Deseja remover ${item.name}?`, [
			{ text: "Não", onPress: () => {} },
			{
				text: "Sim",
				onPress: () => {
					delRecording(item)
				},
			},
		])
	}

	const delRecording = async (item: RecorderDTO) => {
		try {
			await delRecorderId(item.id)

			await FileSystem.deleteAsync(item.file, { idempotent: true })
			Alert.alert("Sucesso", "Gravação removida.")
			fetchRecordings()
			setPlayingRecordingId(null)
		} catch (e) {
			console.log("Delete error", e)
			Alert.alert("Erro", "Não foi possível remover esta gravação.")
		}
	}

	const fetchRecordings = async () => {
		const data = await getRecorders()
		setRecordings(data)
	}

	const renderItem = ({ item }: { item: RecorderDTO }) => (
		<View style={styles.recordingItem}>
			<View style={styles.recordingInfo}>
				<Text style={styles.timestamp}>{item.name}</Text>
				<Text style={styles.location}>{item.location}</Text>
				{/* {item.collection && (
					<Text style={styles.collection}>
						Collection: {item.collection} - Property: {item.property}
					</Text>
				)} */}
				{item.transcription && (
					<Text style={styles.transcription}>"{item.transcription}"</Text>
				)}
			</View>

			<View style={styles.actions}>
				<TouchableOpacity
					style={[styles.actionButton, { backgroundColor: "#3498db" }]}
					onPress={() => handlePlayback(item.id)}
				>
					{playingRecordingId === item.id ? (
						<Pause size={20} color="#fff" />
					) : (
						<Play size={20} color="#fff" />
					)}
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.actionButton, { backgroundColor: "#2ecc71" }]}
					onPress={() => {
						setSelectedRecording(item.id)
						setSyncModalVisible(true)
					}}
				>
					<Cloud size={20} color="#fff" />
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.actionButton, { backgroundColor: "#e74c3c" }]}
					onPress={() => deleteRecording(item)}
				>
					<Trash size={20} color="#fff" />
				</TouchableOpacity>
			</View>
		</View>
	)

	useFocusEffect(
		useCallback(() => {
			fetchRecordings()
		}, []),
	)

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Recordings</Text>

			<FlatList
				data={recordings}
				renderItem={renderItem}
				keyExtractor={(item) => item.name}
				contentContainerStyle={styles.list}
			/>

			<Modal
				visible={syncModalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setSyncModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Sync Recording</Text>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>Collection Name</Text>
							<TextInput
								style={styles.input}
								value={collection}
								onChangeText={setCollection}
								placeholder="Enter collection name"
								placeholderTextColor="#666"
							/>
						</View>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>Property Name</Text>
							<TextInput
								style={styles.input}
								value={property}
								onChangeText={setProperty}
								placeholder="Enter property name"
								placeholderTextColor="#666"
							/>
						</View>

						<View style={styles.modalActions}>
							<TouchableOpacity
								style={[styles.modalButton, styles.cancelButton]}
								onPress={() => setSyncModalVisible(false)}
							>
								<Text style={styles.buttonText}>Cancel</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.modalButton, styles.syncButton]}
								onPress={() => selectedRecording && handleSync(selectedRecording)}
							>
								<Text style={styles.buttonText}>Sync</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#121212",
		padding: 16,
	},
	title: {
		fontSize: 24,
		fontFamily: "Inter_700Bold",
		color: "#fff",
		marginTop: 60,
		marginBottom: 20,
	},
	list: {
		paddingBottom: 20,
	},
	recordingItem: {
		backgroundColor: "#1a1a1a",
		borderRadius: 8,
		padding: 16,
		marginBottom: 12,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	recordingInfo: {
		flex: 1,
	},
	timestamp: {
		color: "#fff",
		fontSize: 16,
		fontFamily: "Inter_600SemiBold",
		marginBottom: 4,
	},
	location: {
		color: "#888",
		fontSize: 14,
		fontFamily: "Inter_400Regular",
	},
	collection: {
		color: "#666",
		fontSize: 12,
		fontFamily: "Inter_400Regular",
		marginTop: 4,
	},
	transcription: {
		color: "#2ecc71",
		fontSize: 14,
		fontFamily: "Inter_400Regular",
		fontStyle: "italic",
		marginTop: 8,
	},
	actions: {
		flexDirection: "row",
		gap: 8,
	},
	actionButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	modalContainer: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		padding: 16,
	},
	modalContent: {
		backgroundColor: "#1a1a1a",
		borderRadius: 12,
		padding: 20,
	},
	modalTitle: {
		fontSize: 20,
		fontFamily: "Inter_700Bold",
		color: "#fff",
		marginBottom: 20,
	},
	inputContainer: {
		marginBottom: 16,
	},
	label: {
		color: "#fff",
		fontSize: 16,
		fontFamily: "Inter_600SemiBold",
		marginBottom: 8,
	},
	input: {
		backgroundColor: "#2a2a2a",
		borderRadius: 8,
		padding: 12,
		color: "#fff",
		fontFamily: "Inter_400Regular",
	},
	modalActions: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: 12,
		marginTop: 20,
	},
	modalButton: {
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 8,
	},
	cancelButton: {
		backgroundColor: "#444",
	},
	syncButton: {
		backgroundColor: "#2ecc71",
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontFamily: "Inter_600SemiBold",
	},
})
