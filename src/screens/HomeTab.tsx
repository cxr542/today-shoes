import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hasVisionRecommendation } from '../recommendation';
import { Shoe } from '../shoeStore';
import { TabPageHeader } from '../components/TabPageHeader';
import { theme } from '../theme';
import { Card } from '../ui';

export function HomeTab({
  shoes,
  onGoCloset,
  onAddPress,
}: {
  shoes: Shoe[];
  onGoCloset: () => void;
  onAddPress: () => void;
}) {
  const aiOn = hasVisionRecommendation();
  const withRec = shoes.filter((s) => s.recommendation?.trim()).length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <TabPageHeader showLogo subtitle="오늘 달릴 때 어울리는 러닝화를 골라보세요" />

      <View style={styles.dashboard}>
        <Card style={styles.dashCard} onPress={onGoCloset}>
          <Text style={styles.dashEmoji}>👟</Text>
          <Text style={styles.dashLabel}>신발장</Text>
          <Text style={styles.dashValue}>{shoes.length}켤레</Text>
          <Text style={styles.dashLink}>신발장 탭으로 →</Text>
        </Card>
        <Card style={[styles.dashCard, styles.dashCardGreen]}>
          <Text style={styles.dashEmoji}>✨</Text>
          <Text style={styles.dashLabel}>AI 분석</Text>
          <Text style={[styles.dashValue, styles.dashValueSmall]}>
            {aiOn ? `${withRec}/${shoes.length} 완료` : '키 설정 필요'}
          </Text>
        </Card>
      </View>

      <View style={styles.tipBanner}>
        <Text style={styles.tipBannerTitle}>오늘의 한 줄</Text>
        <Text style={styles.tipBannerBody}>
          러닝 전 신발 밑창·쿠션 상태를 확인하고, 비 오는 날에는 그립이 좋은 페어를 골라보세요.
        </Text>
      </View>

      <Text style={styles.menuTitle}>빠른 메뉴</Text>
      <View style={styles.menuList}>
        <MenuRow emoji="👟" label="신발장 보기" desc="등록한 러닝화 목록" onPress={onGoCloset} />
        <MenuRow emoji="📸" label="사진으로 등록" desc="촬영 → 확인 → 자동 저장" onPress={onAddPress} />
      </View>
    </ScrollView>
  );
}

function MenuRow({
  emoji,
  label,
  desc,
  onPress,
}: {
  emoji: string;
  label: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && styles.menuPressed]} onPress={onPress}>
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuDesc}>{desc}</Text>
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: theme.space.xl },
  dashboard: {
    flexDirection: 'row',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    marginBottom: theme.space.sm,
  },
  dashCard: {
    flex: 1,
    alignItems: 'flex-start',
    paddingVertical: theme.space.md,
  },
  dashCardGreen: {
    backgroundColor: theme.greenLight,
    borderColor: '#bbf7d0',
  },
  dashEmoji: { fontSize: 28, marginBottom: 8 },
  dashLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  dashValue: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.orange,
    letterSpacing: -0.5,
  },
  dashValueSmall: {
    fontSize: 14,
    color: theme.greenDark,
  },
  dashLink: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: theme.orange,
  },
  tipBanner: {
    marginHorizontal: theme.space.md,
    marginBottom: theme.space.md,
    backgroundColor: theme.orangeLight,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tipBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.orangeDark,
    marginBottom: 6,
  },
  tipBannerBody: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    paddingHorizontal: theme.space.lg,
    marginBottom: theme.space.sm,
  },
  menuList: {
    marginHorizontal: theme.space.md,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  menuPressed: { backgroundColor: theme.cardMuted },
  menuEmoji: { fontSize: 24, marginRight: 12 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '800', color: theme.text },
  menuDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  menuChevron: { fontSize: 22, color: theme.textMuted, fontWeight: '300' },
});
