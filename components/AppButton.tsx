import { Pressable, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors';

type AppButtonProps = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  theme?: 'primary';
  onPress: () => void;
  disabled?: boolean;
};

export default function AppButton({
  title,
  icon,
  theme,
  onPress,
  disabled = false,
}: AppButtonProps) {
  const isPrimary = theme === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primaryFill : styles.secondaryFill,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.buttonInner}>
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={isPrimary ? COLORS.textOnPrimary : COLORS.primary}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            isPrimary ? styles.primaryLabel : styles.secondaryLabel,
          ]}
        >
          {title}
        </Text>
        {!isPrimary ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.textSecondary}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const platformShadow = Platform.select({
  web: {
    boxShadow: '0px 5px 9px rgba(0, 0, 0, 0.14)',
  },
  default: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryFill: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...platformShadow,
  },
  secondaryFill: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonInner: {
    minHeight: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    flex: 1,
    fontSize: 15,
  },
  primaryLabel: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryLabel: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
