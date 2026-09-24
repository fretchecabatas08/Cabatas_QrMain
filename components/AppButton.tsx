import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primaryFill : styles.secondaryFill,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.buttonInner}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isPrimary ? COLORS.textOnPrimary : COLORS.textPrimary}
          />
        )}

        <Text
          style={[
            styles.label,
            isPrimary ? styles.primaryLabel : styles.secondaryLabel,
          ]}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },

  primaryFill: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  secondaryFill: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  buttonInner: {
    minHeight: 48,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  label: {
    fontSize: 15,
  },

  primaryLabel: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },

  secondaryLabel: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.8,
  },

  disabled: {
    opacity: 0.5,
  },
});