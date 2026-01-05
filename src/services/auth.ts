import * as SecureStore from 'expo-secure-store';
import { setConfig } from '@/database/config';

const API_URL = 'https://api.simids.cpafrr.embrapa.br/api/jwt-token/';
const TOKEN_KEY = 'auth_token';

export interface LoginResponse {
    access: string;
    refresh: string;
    user: {
        name: string;
        email: string;
        id: number;
        [key: string]: any;
    };
    [key: string]: any;
}

export const authService = {
    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    enhanced: "true",
                }),
            });

            if (!response.ok) {
                throw new Error("deu erro");
            }

            const data = await response.json();

            // Salvar valores permitidos e usuário se retornados pela API
            if (data.allowed_values || data.user) {
                await setConfig('current_config', {
                    objetivos_list: data.allowed_values?.objectives,
                    property_list: data.allowed_values?.properties,
                    fields_list: data.allowed_values?.fields,
                    user: data.user
                });
            }

            return data;

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async saveToken(token: string): Promise<void> {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    },

    async getToken(): Promise<string | null> {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },

    async removeToken(): Promise<void> {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    },
};
