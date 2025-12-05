import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, ArrowRight, Sprout } from 'lucide-react-native';
import { authService } from '../../services/auth';
import * as Speech from 'expo-speech';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await authService.login(email, password);
            if (response) {
                console.log(response.user.name);

                if (response.user && response.user.name) {
                    Speech.speak(`Bem-vindo ${response.user.name}`, {
                        language: 'pt-BR'
                    });
                }

                //await authService.saveToken(response.token);
                router.replace('/(tabs)');
            } else {
                Alert.alert('Erro', 'Token não recebido. Tente novamente.');
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha ao realizar login. Verifique suas credenciais.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor="#09090b" />

            <View style={styles.content}>
                {/* Logo Section */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Sprout size={48} color="#22c55e" />
                    </View>
                    <Text style={styles.appName}>AgroVoice</Text>
                    <Text style={styles.tagline}>Sua voz no campo</Text>
                </View>

                {/* Form Section */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>E-mail</Text>
                        <View style={styles.inputContainer}>
                            <Mail size={20} color="#71717a" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="seu@email.com"
                                placeholderTextColor="#52525b"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Senha</Text>
                        <View style={styles.inputContainer}>
                            <Lock size={20} color="#71717a" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Sua senha"
                                placeholderTextColor="#52525b"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>


                    <TouchableOpacity
                        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.loginButtonText}>
                            {isLoading ? 'Entrando...' : 'Entrar'}
                        </Text>
                        {!isLoading && <ArrowRight size={20} color="#fff" />}
                    </TouchableOpacity>
                </View>


            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff', // Zinc 950
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(34, 197, 94, 0.1)', // Green 500 with opacity
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#09090b',
        fontFamily: 'Inter_700Bold',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 20,
        color: '#09090b', // Zinc 400
        fontFamily: 'Inter_400Regular',
    },
    form: {
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 20,
        color: '#09090b', // Zinc 300
        marginBottom: 8,
        fontFamily: 'Inter_500Medium',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff', // Zinc 900
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272a', // Zinc 800
        height: 80,
    },
    inputIcon: {
        marginLeft: 16,
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#000000',
        fontSize: 20,
        fontFamily: 'Inter_400Regular',
        height: '100%',
        paddingRight: 16,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 32,
    },
    forgotPasswordText: {
        color: '#a1a1aa', // Zinc 400
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
    },
    loginButton: {
        backgroundColor: '#000000', // Green 600
        height: 56,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Inter_600SemiBold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        color: '#a1a1aa', // Zinc 400
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
    createAccountText: {
        color: '#22c55e', // Green 500
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Inter_600SemiBold',
    },
});
