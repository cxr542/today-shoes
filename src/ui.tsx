import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { cardShadow, theme } from './theme';

export function AppLogo() {
  return (
    <View style={logoStyles.row}>
      <Text style={logoStyles.today}>오늘</Text>
      <Text style={logoStyles.shoes}>뭐신지</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  today: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.orange,
    letterSpacing: -0.5,
  },
  shoes: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
  },
});

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const inner = (
    <View style={[styles.card, style]}>{children}</View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}) {
  const v =
    variant === 'primary'
      ? styles.btnPrimary
      : variant === 'secondary'
        ? styles.btnSecondary
        : styles.btnOutline;
  const t =
    variant === 'primary'
      ? styles.btnPrimaryText
      : variant === 'secondary'
        ? styles.btnSecondaryText
        : styles.btnOutlineText;
  return (
    <Pressable
      style={({ pressed }) => [v, pressed && styles.pressed, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={t}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...cardShadow,
  },
  pressed: { opacity: 0.92 },
  sectionHeader: { marginBottom: theme.space.sm, marginTop: theme.space.md },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.3,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: theme.orange,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: theme.green,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  btnOutline: {
    flex: 1,
    backgroundColor: theme.card,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnSecondaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnOutlineText: { color: theme.textSecondary, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
