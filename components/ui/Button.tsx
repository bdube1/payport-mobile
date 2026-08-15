import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';

type Variant = 'primary' | 'green' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

export default function Button({
  label, onPress, variant = 'primary', loading = false,
  disabled = false, style, textStyle, icon,
}: ButtonProps) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isDisabled = disabled || loading;

  const bg = {
    primary: Colors.primary,
    green:   Colors.green,
    outline: 'transparent',
    ghost:   'transparent',
    danger:  Colors.red,
  }[variant];

  const borderColor = {
    primary: Colors.primary,
    green:   Colors.green,
    outline: Colors.border,
    ghost:   'transparent',
    danger:  Colors.red,
  }[variant];

  const textColor = {
    primary: '#fff',
    green:   '#fff',
    outline: Colors.muted,
    ghost:   Colors.muted,
    danger:  '#fff',
  }[variant];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        { backgroundColor: isDisabled && variant !== 'outline' ? '#94b8ca' : bg,
          borderColor, borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: isDisabled ? 0.6 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {icon ? `${icon}  ` : ''}{label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 52,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Rubik_700Bold',
  },
});
