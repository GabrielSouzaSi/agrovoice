import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Mic, CheckCircle, ArrowLeft } from 'lucide-react-native';
import * as Speech from 'expo-speech';

const CALIBRATION_PHRASES = [
    'Iniciar dia',
    'Coleta de pragas',
    'Corrigir',
    'Repetir',
    'Confirmar',
    'Cancelar',
    'Voltar',
    'Próximo',
];

export default function CalibrationPage() {
    const router = useRouter();
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [completedPhrases, setCompletedPhrases] = useState<boolean[]>(
        new Array(CALIBRATION_PHRASES.length).fill(false)
    );
    const [calibrationComplete, setCalibrationComplete] = useState(false);

    const currentPhrase = CALIBRATION_PHRASES[currentPhraseIndex];
    const progress = ((currentPhraseIndex + 1) / CALIBRATION_PHRASES.length) * 100;

    const handleStartRecording = () => {
        setIsRecording(true);

        // Speak the phrase for the user to repeat
        Speech.speak(currentPhrase, {
            language: 'pt-BR',
            pitch: 1.0,
            rate: 0.9,
        });

        // Simulate recording for 3 seconds
        setTimeout(() => {
            handleCompletePhrase();
        }, 3000);
    };

    const handleCompletePhrase = () => {
        setIsRecording(false);

        // Mark current phrase as completed
        const newCompleted = [...completedPhrases];
        newCompleted[currentPhraseIndex] = true;
        setCompletedPhrases(newCompleted);

        // Move to next phrase or complete calibration
        if (currentPhraseIndex < CALIBRATION_PHRASES.length - 1) {
            setTimeout(() => {
                setCurrentPhraseIndex(currentPhraseIndex + 1);
            }, 500);
        } else {
            setCalibrationComplete(true);
            Speech.speak('Calibragem concluída com sucesso!', {
                language: 'pt-BR',
                pitch: 1.0,
                rate: 0.9,
            });
        }
    };

    const handleFinish = () => {
        router.back();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Calibragem de Voz</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {!calibrationComplete ? (
                    <>
                        {/* Progress Bar */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${progress}%` }]} />
                            </View>
                            <Text style={styles.progressText}>
                                {currentPhraseIndex + 1} de {CALIBRATION_PHRASES.length}
                            </Text>
                        </View>

                        {/* Instructions */}
                        <View style={styles.instructionsCard}>
                            <Text style={styles.instructionsTitle}>Como funciona?</Text>
                            <Text style={styles.instructionsText}>
                                Você ouvirá uma frase e deverá repeti-la em voz alta. Isso ajudará o sistema a reconhecer melhor sua voz.
                            </Text>
                        </View>

                        {/* Current Phrase */}
                        <View style={styles.phraseCard}>
                            <Text style={styles.phraseLabel}>Repita a frase:</Text>
                            <Text style={styles.phraseText}>"{currentPhrase}"</Text>
                        </View>

                        {/* Recording Button */}
                        <TouchableOpacity
                            style={[
                                styles.recordButton,
                                isRecording && styles.recordButtonActive,
                            ]}
                            onPress={handleStartRecording}
                            disabled={isRecording}
                        >
                            {isRecording ? (
                                <ActivityIndicator size="large" color="#fff" />
                            ) : (
                                <>
                                    <Mic size={32} color="#fff" />
                                    <Text style={styles.recordButtonText}>
                                        Tocar e Gravar
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {isRecording && (
                            <Text style={styles.recordingText}>Gravando...</Text>
                        )}

                        {/* Completed Phrases List */}
                        <View style={styles.phrasesListContainer}>
                            <Text style={styles.phrasesListTitle}>Frases</Text>
                            {CALIBRATION_PHRASES.map((phrase, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.phraseItem,
                                        completedPhrases[index] && styles.phraseItemCompleted,
                                        index === currentPhraseIndex && styles.phraseItemCurrent,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.phraseItemText,
                                            completedPhrases[index] && styles.phraseItemTextCompleted,
                                        ]}
                                    >
                                        {phrase}
                                    </Text>
                                    {completedPhrases[index] && (
                                        <CheckCircle size={20} color="#10b981" />
                                    )}
                                </View>
                            ))}
                        </View>
                    </>
                ) : (
                    /* Completion Screen */
                    <View style={styles.completionContainer}>
                        <CheckCircle size={80} color="#10b981" />
                        <Text style={styles.completionTitle}>Calibragem Concluída!</Text>
                        <Text style={styles.completionText}>
                            Sua voz foi calibrada com sucesso. O sistema agora reconhecerá melhor seus comandos de voz.
                        </Text>
                        <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                            <Text style={styles.finishButtonText}>Concluir</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: '#1a1a1a',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    progressContainer: {
        marginBottom: 24,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#E5E5E5',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: '#666',
        textAlign: 'center',
    },
    instructionsCard: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    instructionsTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    instructionsText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#666',
        lineHeight: 20,
    },
    phraseCard: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 24,
        marginBottom: 32,
        alignItems: 'center',
    },
    phraseLabel: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: '#666',
        marginBottom: 12,
    },
    phraseText: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: '#1a1a1a',
        textAlign: 'center',
    },
    recordButton: {
        backgroundColor: '#10b981',
        borderRadius: 60,
        width: 120,
        height: 120,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    recordButtonActive: {
        backgroundColor: '#ef4444',
    },
    recordButtonText: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
        marginTop: 8,
    },
    recordingText: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: 24,
    },
    phrasesListContainer: {
        marginTop: 32,
    },
    phrasesListTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    phraseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    phraseItemCurrent: {
        backgroundColor: '#FEF3C7',
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    phraseItemCompleted: {
        backgroundColor: '#D1FAE5',
    },
    phraseItemText: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: '#666',
    },
    phraseItemTextCompleted: {
        color: '#10b981',
    },
    completionContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    completionTitle: {
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        color: '#1a1a1a',
        marginTop: 24,
        marginBottom: 16,
        textAlign: 'center',
    },
    completionText: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 24,
    },
    finishButton: {
        backgroundColor: '#10b981',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 48,
    },
    finishButtonText: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
    },
});
