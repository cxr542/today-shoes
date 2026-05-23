import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

/** 모바일 하단 탭: 홈 · 신발장 · 추가 · 가이드 · 링크 */
export type TabId = 'home' | 'closet' | 'add' | 'guide' | 'links';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: '홈', icon: '🏠' },
  { id: 'closet', label: '신발장', icon: '👟' },
  { id: 'add', label: '추가', icon: '➕' },
  { id: 'guide', label: '가이드', icon: '📖' },
  { id: 'links', label: '링크', icon: '🔗' },
];

export function BottomTabs({
  active,
  onChange,
  onAddPress,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
  /** 웹 + 버튼: 클릭 직후 파일 선택 (동기) */
  onAddPress?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => {
        const isAdd = tab.id === 'add';
        const selected = active === tab.id && !isAdd;
        return (
          <Pressable
            key={tab.id}
            style={({ pressed }) => [
              styles.item,
              isAdd && styles.itemAdd,
              pressed && styles.pressed,
            ]}
            hitSlop={isAdd ? { top: 16, bottom: 16, left: 12, right: 12 } : undefined}
            onPress={() => {
              if (isAdd && onAddPress) {
                onAddPress();
                return;
              }
              onChange(tab.id);
            }}
            accessibilityRole={isAdd ? 'button' : 'tab'}
            accessibilityState={{ selected: selected || (isAdd && false) }}
            accessibilityLabel={tab.label}
          >
            {isAdd ? (
              <View style={styles.addFab}>
                <Text style={styles.addFabIcon}>{tab.icon}</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.icon, selected && styles.iconActive]}>{tab.icon}</Text>
                <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: Platform.OS === 'web' ? 10 : 6,
    paddingBottom: 8,
    paddingHorizontal: 2,
    ...(Platform.OS === 'web'
      ? {
          overflow: 'visible' as const,
          zIndex: 200,
          position: 'relative' as const,
        }
      : {}),
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 1,
    minWidth: 0,
  },
  itemAdd: {
    marginTop: Platform.OS === 'web' ? -12 : -20,
    zIndex: 201,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  addFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: theme.card,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer' as const,
          // @ts-expect-error web
          boxShadow: '0 4px 14px rgba(234, 88, 12, 0.45)',
        }
      : {}),
  },
  addFabIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  icon: { fontSize: 18, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textMuted,
    maxWidth: '100%',
  },
  labelActive: {
    color: theme.orange,
    fontWeight: '800',
  },
  pressed: { opacity: 0.85 },
});
