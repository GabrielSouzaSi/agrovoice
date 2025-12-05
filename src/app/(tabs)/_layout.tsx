import { Tabs } from "expo-router"
import { Mic, List, Settings } from "lucide-react-native"
import React from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
const COLORS = {
	background: '#111827', // Um cinza bem escuro (gray-900)
	activeTint: '#4ade80', // Um verde de destaque (green-400)
	inactiveTint: '#9ca3af', // Um cinza mais claro (gray-400)
};


export default function TabLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Tabs
				screenOptions={{
					// Oculta o cabeçalho nativo da tela
					headerShown: false,

					// 1. FUNDO DA TAB BAR: Torna a Tab Bar nativa invisível
					tabBarStyle: {
						backgroundColor: 'black', // Fundo transparente
						borderTopWidth: 0,              // Remove a linha superior
						elevation: 0,                   // Remove a sombra no Android
						shadowOpacity: 0,
						height: 120,          // Remove a sombra no iOS
						position: 'absolute',
						left: 20,
						right: 20,
					},

					// 2. CONFIGURAÇÃO DE ÍCONES/LABEL: Define cores base
					tabBarActiveTintColor: COLORS.activeTint, // Roxo de destaque (para os ícones laterais)
					tabBarInactiveTintColor: COLORS.inactiveTint, // Cinza claro (para os ícones laterais)
				}}
			>
				<Tabs.Screen
					name="index"
					options={{
						title: "Record",
						tabBarIcon: ({ size, color }) => <Mic size={size} color={color} />,
					}}
				/>
				<Tabs.Screen
					name="recordings"
					options={{
						title: "Recordings",
						tabBarIcon: ({ size, color }) => <List size={size} color={color} />,
					}}
				/>
				<Tabs.Screen
					name="settings"
					options={{
						title: "Settings",
						tabBarIcon: ({ size, color }) => <Settings size={size} color={color} />,
					}}
				/>
			</Tabs>
		</GestureHandlerRootView>
	)
}
