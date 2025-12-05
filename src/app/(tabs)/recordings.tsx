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
	StatusBar,
} from "react-native"
import { Cloud, Play, Pause, Trash, Calendar, MapPin } from "lucide-react-native"
import { delPragaId, getPraga } from "@/database/praga"
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import * as FileSystem from "expo-file-system"
import { useRouter, useFocusEffect } from "expo-router"
import { PragaDTO } from "@/dtos/pragaDTO"

const router = useRouter();

export default function RecordingsScreen() {
	const [selectedRecording, setSelectedRecording] = useState<number | null>(null)
	const [syncModalVisible, setSyncModalVisible] = useState(false)
	const [collection, setCollection] = useState("")
	const [property, setProperty] = useState("")
	const [praga, setPraga] = useState<PragaDTO[]>([])
	const [playingRecordingId, setPlayingRecordingId] = useState<number | null>(null)

	const player = useAudioPlayer(null)
	const status = useAudioPlayerStatus(player)

	const getItemById = (id: number) => praga.find((r) => r.id === id)

	const handlePlayback = async (id: number) => {
		try {
			const item = getItemById(id)
			if (!item) return

			if (playingRecordingId === id) {
				if (status?.playing) {
					await player.pause()
					setPlayingRecordingId(null)
					return
				} else {
					await player.seekTo(0)
					await player.play()
					setPlayingRecordingId(id)
					return
				}
			}

			await player.replace({ uri: item.file })
			await player.seekTo(0)
			await player.play()
			setPlayingRecordingId(id)
		} catch (e) {
			console.log("Playback error", e)
			Alert.alert("Erro", "Não foi possível reproduzir este áudio.")
			setPlayingRecordingId(null)
		}
	}

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
					transcription: item.description ?? "",
				},
			})

			if (res.status >= 200 && res.status < 300) {
				Alert.alert("Sucesso", "Gravação sincronizada.")
				setSyncModalVisible(false)
				setSelectedRecording(null)
				setCollection("")
				setProperty("")
			} else {
				Alert.alert("Erro", "Falha ao sincronizar. Verifique o servidor.")
			}
		} catch (e) {
			console.log("Sync error", e)
			Alert.alert("Erro", "Não foi possível sincronizar esta gravação.")
		}
	}

	const deleteRecording = async (item: PragaDTO) => {
		player.pause()
		Alert.alert("Atenção", `Deseja remover ${item.name}?`, [
			{ text: "Não", onPress: () => { } },
			{
				text: "Sim",
				onPress: () => {
					delRecording(item)
				},
			},
		])
	}

	const delRecording = async (item: PragaDTO) => {
		try {
			await delPragaId(item.id)
			await FileSystem.deleteAsync(item.file, { idempotent: true })
			fetchRecordings()
			setPlayingRecordingId(null)
		} catch (e) {
			console.log("Delete error", e)
			Alert.alert("Erro", "Não foi possível remover esta gravação.")
		}
	}

	const fetchRecordings = async () => {
		const data = await getPraga()
		setPraga(data.reverse()) // Show newest first
	}

	const handleNavigateToDetails = ({ item }: { item: PragaDTO }) => {
		router.push({
			pathname: `/details/praga_details`,
			params: item as any,
		});
	};

	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
		} catch {
			return dateString;
		}
	}

	const renderItem = ({ item }: { item: PragaDTO }) => (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={() => handleNavigateToDetails({ item })}
			style={styles.card}
		>
			<View style={styles.cardHeader}>
				<View style={styles.headerLeft}>
					<Text style={styles.pestName}>{item.praga || "Praga Desconhecida"}</Text>
					<View style={styles.dateContainer}>
						<Calendar size={12} color="#888" />
						<Text style={styles.dateText}>{formatDate(item.datetime)}</Text>
					</View>
				</View>
				{/* Status indicator or menu could go here */}
			</View>

			<View style={styles.cardBody}>
				<View style={styles.locationContainer}>
					<MapPin size={14} color="#2ecc71" />
					<Text style={styles.locationText}>{item.fazenda || "Localização não definida"}</Text>
				</View>

				{item.description && (
					<Text style={styles.description} numberOfLines={2}>
						"{item.description}"
					</Text>
				)}
			</View>

			<View style={styles.cardFooter}>
				<TouchableOpacity
					style={styles.playButton}
					onPress={(e) => {
						e.stopPropagation();
						handlePlayback(item.id);
					}}
				>
					{playingRecordingId === item.id && status?.playing ? (
						<Pause size={20} color="#000" fill="#000" />
					) : (
						<Play size={20} color="#fff" fill="#fff" />
					)}
				</TouchableOpacity>

				<View style={styles.actionsRight}>


					<TouchableOpacity
						style={[styles.iconButton, styles.deleteButton]}
						onPress={(e) => {
							e.stopPropagation();
							deleteRecording(item);
						}}
					>
						<Trash size={20} color="#ef4444" />
					</TouchableOpacity>
				</View>
			</View>
		</TouchableOpacity>
	)

	useFocusEffect(
		useCallback(() => {
			fetchRecordings()
		}, []),
	)

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" />
			<View style={styles.header}>
				<Text style={styles.title}>Minhas Coletas</Text>
				<Text style={styles.subtitle}>{praga.length} registros encontrados</Text>
			</View>

			<FlatList
				data={praga}
				renderItem={renderItem}
				keyExtractor={(item) => String(item.id)}
				contentContainerStyle={styles.list}
				showsVerticalScrollIndicator={false}
			/>

			<Modal
				visible={syncModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={() => setSyncModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Sincronizar Coleta</Text>

						<View style={styles.inputGroup}>
							<Text style={styles.label}>Coleção</Text>
							<TextInput
								style={styles.input}
								value={collection}
								onChangeText={setCollection}
								placeholder="Nome da coleção"
								placeholderTextColor="#666"
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.label}>Propriedade</Text>
							<TextInput
								style={styles.input}
								value={property}
								onChangeText={setProperty}
								placeholder="Nome da propriedade"
								placeholderTextColor="#666"
							/>
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
		backgroundColor: "#fff", // Zinc 950
		paddingHorizontal: 20,
		paddingTop: 60,
	},
	header: {
		marginBottom: 24,
	},
	title: {
		fontSize: 28,
		fontFamily: "Inter_700Bold",
		color: "#000",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		fontFamily: "Inter_400Regular",
		color: "#a1a1aa", // Zinc 400
	},
	list: {
		paddingBottom: 40,
	},
	card: {
		backgroundColor: "#f9f9f9", // Zinc 900
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#27272a", // Zinc 800
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 12,
	},
	headerLeft: {
		flex: 1,
	},
	pestName: {
		fontSize: 18,
		fontFamily: "Inter_600SemiBold",
		color: "#000",
		marginBottom: 4,
	},
	dateContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	dateText: {
		fontSize: 12,
		fontFamily: "Inter_400Regular",
		color: "#71717a", // Zinc 500
	},
	cardBody: {
		marginBottom: 16,
	},
	locationContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginBottom: 8,
	},
	locationText: {
		fontSize: 14,
		fontFamily: "Inter_500Medium",
		color: "#000", // Zinc 300
	},
	description: {
		fontSize: 14,
		fontFamily: "Inter_400Regular",
		color: "#000000", // Zinc 400
		fontStyle: "italic",
		lineHeight: 20,
	},
	cardFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "#000000", // Zinc 800
	},
	playButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "#16a34a", // Green 600
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#16a34a",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 2,
	},
	actionsRight: {
		flexDirection: "row",
		gap: 8,
	},
	iconButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#27272a", // Zinc 800
	},
	deleteButton: {
		backgroundColor: "rgba(239, 68, 68, 0.1)", // Red 500 with opacity
	},

	// Modal Styles
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		justifyContent: "center",
		padding: 20,
	},
	modalContent: {
		backgroundColor: "#18181b", // Zinc 900
		borderRadius: 20,
		padding: 24,
		borderWidth: 1,
		borderColor: "#27272a",
	},
	modalTitle: {
		fontSize: 20,
		fontFamily: "Inter_700Bold",
		color: "#000000",
		marginBottom: 24,
		textAlign: "center",
	},
	inputGroup: {
		marginBottom: 16,
	},
	label: {
		fontSize: 18,
		fontFamily: "Inter_500Medium",
		color: "#000000",
		marginBottom: 8,
	},
	input: {
		backgroundColor: "#27272a", // Zinc 800
		borderRadius: 12,
		padding: 16,
		color: "#fff",
		fontFamily: "Inter_400Regular",
		fontSize: 16,
	},
	modalActions: {
		flexDirection: "row",
		gap: 12,
		marginTop: 8,
	},
	button: {
		flex: 1,
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelButton: {
		backgroundColor: "#27272a",
	},
	syncButton: {
		backgroundColor: "#16a34a",
	},
	cancelButtonText: {
		color: "#fff",
		fontFamily: "Inter_600SemiBold",
		fontSize: 18,
	},
	syncButtonText: {
		color: "#fff",
		fontFamily: "Inter_600SemiBold",
		fontSize: 18,
	},
})
