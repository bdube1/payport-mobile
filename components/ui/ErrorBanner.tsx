import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={17} color="#e53e3e" style={{ marginRight: 8 }} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(229,62,62,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.3)',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  text: {
    flex: 1,
    color: '#e53e3e',
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
});
