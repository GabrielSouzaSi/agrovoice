import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const settingsItems = [
    {
      title: 'Voice Recognition',
      description: 'Configure voice command settings',
    },
    {
      title: 'Storage',
      description: 'Manage recording storage and backup',
    },
    {
      title: 'Location Services',
      description: 'Configure GPS and location settings',
    },
    {
      title: 'Sync Settings',
      description: 'Configure automatic synchronization',
    },
    {
      title: 'About',
      description: 'App information and credits',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.settingsList}>
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.settingItem}
            onPress={() => {}}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingDescription}>{item.description}</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginTop: 60,
    marginBottom: 20,
  },
  settingsList: {
    gap: 12,
  },
  settingItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});