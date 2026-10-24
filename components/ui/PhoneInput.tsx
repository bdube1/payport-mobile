import React from 'react';
import {
  View, TextInput, Text, StyleSheet, TextStyle, ViewStyle,
} from 'react-native';
import { Colors, themed } from '../../constants/colors';

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  hint?: string;
  locked?: boolean;
  valid?: boolean;
  invalid?: boolean;
  style?: ViewStyle;
}

export default function PhoneInput({
  label, value, onChange, placeholder = '07X XXX XXXX',
  hint, locked = false, valid = false, invalid = false, style,
}: PhoneInputProps) {
  const borderColor = invalid
    ? Colors.red
    : valid
    ? Colors.green
    : Colors.border;

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.row, { borderColor }]}>
        <View style={styles.prefix}>
          <Text style={styles.prefixText}>🇿🇼 +263</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={locked ? undefined : onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
          keyboardType="phone-pad"
          editable={!locked}
          style={[
            styles.input,
            locked && styles.locked,
          ]}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = themed(() => ({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontFamily: 'Nunito_600SemiBold',
  },
  row: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.light,
  },
  prefix: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'Rubik_700Bold',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.dark,
    fontFamily: 'Nunito_400Regular',
  },
  locked: {
    backgroundColor: 'rgba(52,173,84,0.07)',
    color: Colors.dark,
  },
  hint: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 6,
    fontFamily: 'Nunito_400Regular',
  },
}));
