import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, themed } from '../../constants/colors';

type Props = {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
};

export default function AppBar({ title, showBack = false, rightElement }: Props) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={styles.side} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.side} />
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.side}>{rightElement || null}</View>
    </View>
  );
}

const styles = themed(() => ({
  bar: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    elevation: 3,
  },
  side:     { width: 48, alignItems: 'center', justifyContent: 'center' },
  title:    { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#fff', fontFamily: 'Rubik_700Bold', textAlign: 'center' },
}));
