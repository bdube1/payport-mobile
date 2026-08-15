import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface NetworkBadgeProps {
  networkName: string;
  valid?: boolean;
}

export default function NetworkBadge({ networkName, valid = true }: NetworkBadgeProps) {
  return (
    <View style={[styles.badge, !valid && styles.badgeInvalid]}>
      <View style={[styles.dot, !valid && styles.dotInvalid]} />
      <Text style={[styles.text, !valid && styles.textInvalid]}>
        {networkName} detected{!valid ? ' — wrong network selected' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(52,173,84,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,173,84,0.3)',
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  badgeInvalid: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderColor: 'rgba(220,38,38,0.3)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
  },
  dotInvalid: {
    backgroundColor: Colors.red,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.green,
    fontFamily: 'Rubik_700Bold',
  },
  textInvalid: {
    color: Colors.red,
  },
});
