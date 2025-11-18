import { Tabs } from "expo-router"
import { Mic, List, Settings } from "lucide-react-native"

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: "#1a1a1a",
					borderTopColor: "#333",
				},
				tabBarActiveTintColor: "#00ff00",
				tabBarInactiveTintColor: "#888",
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
	)
}
