import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { AppLogo } from '../ui';

export function TabPageHeader({
  title = '',
  subtitle,
  showLogo = false,
}: {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {showLogo ? <AppLogo /> : <Text style={styles.title}>{title}</Text>}
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
    lineHeight: 20,
  },
});
