import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TabPageHeader } from '../components/TabPageHeader';
import { theme } from '../theme';
import { Card, SectionHeader } from '../ui';

const GUIDES = [
  {
    emoji: '🏃',
    title: '러닝화 고르는 기준',
    body: '발볼·아치·주행 거리(5K/10K/하프)에 맞는 쿠션·안정·속도 타입을 먼저 정한 뒤, 실제 착화감으로 최종 결정하세요.',
  },
  {
    emoji: '🌧️',
    title: '날씨별 페어',
    body: '비·눈에는 그립 강한 아웃솔, 더운 날에는 통풍 좋은 어퍼, 추운 날에는 방풍·두꺼운 미드솔을 고려해 보세요.',
  },
  {
    emoji: '🔄',
    title: '로테이션',
    body: '같은 신발만 매일 신으면 쿠션이 빨리 눌립니다. 2켤레 이상 번갈아 신으면 수명과 부상 예방에 도움이 됩니다.',
  },
  {
    emoji: '📏',
    title: '마일리지 체크',
    body: '대략 500~800km마다 밑창 마모·미드솔 눌림을 확인하세요. 이 앱 신발장에 등록해 두면 페어별로 관리하기 쉬워요.',
  },
];

export function GuideTab() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <TabPageHeader title="가이드" subtitle="러닝화·러닝 준비 팁" />

      <SectionHeader title="러닝 가이드" subtitle="카드로 정리한 팁" />

      {GUIDES.map((g) => (
        <Card key={g.title} style={styles.guideCard}>
          <Text style={styles.guideEmoji}>{g.emoji}</Text>
          <Text style={styles.guideTitle}>{g.title}</Text>
          <Text style={styles.guideBody}>{g.body}</Text>
        </Card>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          사진 등록 시 Gemini가 신발 특징을 분석해 맞춤 문구를 만들어 줍니다. (Google AI Studio API 키 설정 시)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingBottom: theme.space.xl,
  },
  guideCard: {
    marginHorizontal: theme.space.md,
    marginBottom: theme.space.sm,
  },
  guideEmoji: { fontSize: 32, marginBottom: 10 },
  guideTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  guideBody: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  footer: {
    marginHorizontal: theme.space.md,
    marginTop: theme.space.md,
    padding: theme.space.md,
    backgroundColor: theme.cardMuted,
    borderRadius: theme.radius.md,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
