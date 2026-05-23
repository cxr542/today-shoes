import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

const PHONE_WIDTH = 430;

/** 데스크톱 브라우저에서 모바일 폭으로 미리보기 */
export function WebAppFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.desktop}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktop: {
    flex: 1,
    backgroundColor: '#d1d5db',
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: PHONE_WIDTH,
    backgroundColor: theme.bg,
    overflow: Platform.OS === 'web' ? ('visible' as const) : 'hidden',
    // @ts-expect-error web-only shadow
    boxShadow: '0 12px 40px rgba(17,24,39,0.15)',
  },
});
