import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TabPageHeader } from '../components/TabPageHeader';
import { theme } from '../theme';
import { Card, SectionHeader } from '../ui';

type LinkItem = {
  emoji: string;
  title: string;
  desc: string;
  url: string;
};

const LINKS: LinkItem[] = [
  {
    emoji: '🌤️',
    title: '기상청 날씨',
    desc: '오늘 러닝 전 강수·기온 확인',
    url: 'https://www.weather.go.kr/w/index.do',
  },
  {
    emoji: '🏃',
    title: '런붕앱',
    desc: '러닝 정보·날씨·유용 링크 (레퍼런스 UI)',
    url: 'https://www.runbung.app/ko',
  },
  {
    emoji: '👟',
    title: '나이키 러닝화',
    desc: '러닝 라인업 참고',
    url: 'https://www.nike.com/kr/w/running-shoes-37v7jz',
  },
  {
    emoji: '📊',
    title: 'Strava',
    desc: '러닝 기록·통계',
    url: 'https://www.strava.com/',
  },
];

export function LinksTab() {
  const open = async (item: LinkItem) => {
    try {
      const ok = await Linking.canOpenURL(item.url);
      if (!ok) {
        Alert.alert('열기 실패', '이 링크를 열 수 없습니다.');
        return;
      }
      await Linking.openURL(item.url);
    } catch {
      Alert.alert('열기 실패', '브라우저에서 링크를 열지 못했습니다.');
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <TabPageHeader title="링크" subtitle="러닝에 도움 되는 외부 사이트" />

      <SectionHeader title="유용한 링크" subtitle="탭하면 브라우저에서 열어요" />

      <View style={styles.grid}>
        {LINKS.map((item) => (
          <Pressable
            key={item.url}
            style={({ pressed }) => [styles.linkWrap, pressed && styles.pressed]}
            onPress={() => open(item)}
          >
            <Card style={styles.linkCard}>
              <Text style={styles.linkEmoji}>{item.emoji}</Text>
              <Text style={styles.linkTitle}>{item.title}</Text>
              <Text style={styles.linkDesc} numberOfLines={2}>
                {item.desc}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: theme.space.xl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.space.md,
    gap: theme.space.sm,
  },
  linkCard: {
    width: '100%',
    minHeight: 118,
  },
  linkWrap: {
    width: '47%',
  },
  linkEmoji: { fontSize: 28, marginBottom: 8 },
  linkTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 4,
  },
  linkDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 17,
  },
  pressed: { opacity: 0.9 },
});
