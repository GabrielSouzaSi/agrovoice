import "@/styles/global.css"
import { useEffect } from "react"
import { StatusBar } from "expo-status-bar"
import {
	useFonts,
	Inter_400Regular,
	Inter_600SemiBold,
	Inter_700Bold,
} from "@expo-google-fonts/inter"
import * as SplashScreen from "expo-splash-screen"
import { Stack } from "expo-router"

// Database
import { SQLiteProvider } from "expo-sqlite"
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator"
import { useDrizzleStudio } from "expo-drizzle-studio-plugin"
import { DATABASE_NAME, db, expoDb } from "@/database/connection"
import migrations from "../../drizzle/migrations.js"
import React from "react"

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
	const [fontsLoaded] = useFonts({
		Inter_400Regular,
		Inter_600SemiBold,
		Inter_700Bold,
	})

	const { success, error } = useMigrations(db, migrations)
	useDrizzleStudio(expoDb)

	useEffect(() => {
		if (fontsLoaded) {
			// Wait for 3 seconds before hiding the splash screen
			const timer = setTimeout(async () => {
				await SplashScreen.hideAsync()
			}, 3000)

			return () => clearTimeout(timer)
		}
	}, [fontsLoaded, success])

	if (!fontsLoaded) {
		return null
	}

	return (
		<>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(tabs)" />
			</Stack>
			<StatusBar style="light" />
		</>
	)
}

export default function RootLayout() {
	return (
		<SQLiteProvider databaseName={DATABASE_NAME}>
			<RootLayoutNav />
		</SQLiteProvider>
		
	)
}
