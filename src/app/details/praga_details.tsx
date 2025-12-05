
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, StatusBar, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Edit, Trash2, CloudUpload, MapPin, Calendar, FileText, ArrowLeft } from 'lucide-react-native';
import { PragaDTO } from '@/dtos/pragaDTO';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const { width } = Dimensions.get('window');

export default function PragaDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const item: PragaDTO = params as unknown as PragaDTO;

    if (!item.id) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Item não encontrado.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Parse location
    const [lat, long] = item.location ? item.location.split(',').map(Number) : [0, 0];
    const hasLocation = !isNaN(lat) && !isNaN(long) && lat !== 0 && long !== 0;

    const handleDelete = () => {
        Alert.alert("Confirmação", "Tem certeza que deseja deletar este registro?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Deletar",
                onPress: () => {
                    console.log(`Deletando item com ID: ${item.id} `);
                    router.back();
                },
                style: "destructive"
            },
        ]);
    };

    const handleEdit = () => {
        console.log(`Editando item com ID: ${item.id} `);
    };

    const handleSync = () => {
        console.log(`Sincronizando item com ID: ${item.id} `);
        Alert.alert("Sincronização", "Registro enviado para o servidor!");
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString('pt-BR');
        } catch {
            return dateString;
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Map Header */}
            <View style={styles.mapContainer}>
                {hasLocation ? (
                    <MapView
                        style={styles.map}
                        provider={PROVIDER_DEFAULT}
                        initialRegion={{
                            latitude: lat,
                            longitude: long,
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                        }}
                    >
                        <Marker
                            coordinate={{ latitude: lat, longitude: long }}
                            title={item.praga}
                            description={item.fazenda}
                        />
                    </MapView>
                ) : (
                    <View style={styles.noMapContainer}>
                        <MapPin size={48} color="#52525b" />
                        <Text style={styles.noMapText}>Localização indisponível</Text>
                    </View>
                )}

                {/* Back Button Overlay */}
                <TouchableOpacity
                    style={styles.headerBackButton}
                    onPress={() => router.back()}
                >
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>{item.praga || "Praga Desconhecida"}</Text>
                    <View style={styles.dateRow}>
                        <Calendar size={14} color="#a1a1aa" />
                        <Text style={styles.dateText}>{formatDate(item.datetime)}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <MapPin size={20} color="#2ecc71" />
                        <View style={styles.cardTextContainer}>
                            <Text style={styles.cardLabel}>Local</Text>
                            <Text style={styles.cardValue}>{item.fazenda || "Não informado"}</Text>
                            {hasLocation && <Text style={styles.coordsText}>{lat.toFixed(6)}, {long.toFixed(6)}</Text>}
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <FileText size={20} color="#3b82f6" />
                        <View style={styles.cardTextContainer}>
                            <Text style={styles.cardLabel}>Descrição / Transcrição</Text>
                            <Text style={styles.descriptionText}>
                                {item.description ? `"${item.description}"` : "Nenhuma descrição disponível."}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
                    <View style={[styles.iconCircle, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                        <Edit size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleSync}>
                    <View style={[styles.iconCircle, { backgroundColor: "rgba(34, 197, 94, 0.1)" }]}>
                        <CloudUpload size={24} color="#22c55e" />
                    </View>
                    <Text style={styles.actionText}>Sincronizar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                    <View style={[styles.iconCircle, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                        <Trash2 size={24} color="#ef4444" />
                    </View>
                    <Text style={[styles.actionText, { color: "#ef4444" }]}>Excluir</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff", // Zinc 950
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "#09090b",
    },
    errorText: {
        color: "#000",
        fontSize: 18,
        marginBottom: 20,
    },
    backButton: {
        padding: 10,
        backgroundColor: "#27272a",
        borderRadius: 8,
    },
    backButtonText: {
        color: "#000",
    },
    mapContainer: {
        height: 300,
        width: '100%',
        backgroundColor: "#18181b",
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    noMapContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noMapText: {
        color: "#52525b",
        marginTop: 10,
        fontFamily: "Inter_500Medium",
    },
    headerBackButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    headerInfo: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontFamily: "Inter_700Bold",
        color: "#000",
        marginBottom: 8,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateText: {
        color: "#000",
        fontSize: 14,
        fontFamily: "Inter_400Regular",
    },
    card: {
        backgroundColor: "#fff", // Zinc 900
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#27272a",
    },
    cardRow: {
        flexDirection: 'row',
        gap: 16,
    },
    cardTextContainer: {
        flex: 1,
    },
    cardLabel: {
        color: "#000", // Zinc 400
        fontSize: 15,
        fontFamily: "Inter_500Medium",
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardValue: {
        color: "#000",
        fontSize: 18,
        fontFamily: "Inter_600SemiBold",
    },
    coordsText: {
        color: "#000",
        fontSize: 12,
        fontFamily: "Inter_400Regular",
        marginTop: 2,
    },
    descriptionText: {
        color: "#000", // Zinc 300
        fontSize: 16,
        fontFamily: "Inter_400Regular",
        fontStyle: 'italic',
        lineHeight: 24,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#000", // Zinc 900
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: "#27272a",
    },
    actionButton: {
        alignItems: 'center',
        gap: 8,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        color: "#000",
        fontSize: 12,
        fontFamily: "Inter_500Medium",
    },
});
