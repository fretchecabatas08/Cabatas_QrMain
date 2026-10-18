import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = { title: string };

export default function Header({ title }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <MaterialIcons name="qr-code-scanner" size={30} color={COLORS.textOnPrimary} />
      </View>
      <Text style={styles.eyebrow}>QR-ATTENDANCE SYSTEM</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    width: '100%',
    paddingVertical: 20,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
