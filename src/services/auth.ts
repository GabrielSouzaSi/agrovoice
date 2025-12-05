import * as SecureStore from 'expo-secure-store';

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
