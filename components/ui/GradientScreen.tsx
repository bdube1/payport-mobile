import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

type Props = {
  children: React.ReactNode;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
};

// A genuine soft gradient (top-tinted blue fading to near-white), not the flat
// solid colour this component used to render despite its name.
export default function GradientScreen({ children, edges = ['top'] }: Props) {
  return (
    <LinearGradient
      colors={[Colors.gradientTop, Colors.gradientMid, Colors.background]}
      locations={[0, 0.35, 1]}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});
