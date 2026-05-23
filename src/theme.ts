/** 런붕앱(runbung.app) 톤: 밝은 회색 배경 + 흰 카드 + 오렌지·그린 포인트 */
export const theme = {
  bg: '#f0f2f5',
  card: '#ffffff',
  cardMuted: '#f9fafb',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  text: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#9ca3af',
  orange: '#ea580c',
  orangeLight: '#fff7ed',
  orangeDark: '#c2410c',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  greenDark: '#15803d',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  shadow: '#111827',
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  space: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
  },
} as const;

export const cardShadow = {
  shadowColor: theme.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};
