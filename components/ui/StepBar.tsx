import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface StepBarProps {
  step: number;
  labels: string[];
}

export default function StepBar({ step, labels }: StepBarProps) {
  return (
    <View style={styles.row}>
      {labels.map((label, idx) => {
        const n = idx + 1;
        const active = step === n;
        const done = step > n;
        return (
          <View key={n} style={styles.item}>
            <View style={styles.stepRow}>
              <View style={[
                styles.circle,
                done  && styles.circleDone,
                active && styles.circleActive,
              ]}>
                <Text style={[
                  styles.circleText,
                  (done || active) && styles.circleTextActive,
                ]}>
                  {done ? '✓' : String(n)}
                </Text>
              </View>
              {n < labels.length && (
                <View style={[styles.line, done && styles.lineDone]} />
              )}
            </View>
            <Text style={[
              styles.label,
              active && styles.labelActive,
              done   && styles.labelDone,
            ]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 28,
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(6,163,218,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  circleDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(6,163,218,0.4)',
    fontFamily: 'Rubik_700Bold',
  },
  circleTextActive: {
    color: '#fff',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(6,163,218,0.15)',
    marginHorizontal: 2,
  },
  lineDone: {
    backgroundColor: Colors.green,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(6,163,218,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 6,
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
  },
  labelActive: { color: Colors.primary },
  labelDone:   { color: Colors.green },
});
