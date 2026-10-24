import { StyleSheet, Text, View } from 'react-native';
import { formatDateRunDistance } from '../dateRun/core';
import { useDateRun } from '../dateRun/useDateRun';
import { theme } from '../theme';
import { Card, PrimaryButton } from '../ui';

export function DateRunCard() {
  const { today, selected, ready, busy, error, toggle } = useDateRun();
  const distance = formatDateRunDistance(today.targetDistanceM);
  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>📅 오늘의 날짜런</Text>
        <Text style={styles.distance}>{distance.replace(' km', '')}<Text style={styles.unit}> KM</Text></Text>
        <Text style={styles.date}>{today.dateLabel}</Text>
        <View accessibilityLiveRegion="polite" style={styles.message}>
          <Text style={[styles.body, selected && styles.selected]}>
            {selected ? '오늘 날짜런을 선택했습니다.' : '오늘 날짜만큼 달려볼까요?'}
          </Text>
          {selected && (
            <View style={styles.instructions}>
              <Text style={styles.device}>Amazfit Cheetah Round</Text>
              <Text style={styles.body}>야외 달리기 → 목표 → 거리</Text>
              <Text style={styles.body}>시계에서 직접 {distance}로 설정해주세요.</Text>
            </View>
          )}
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            label={busy ? '저장 중…' : !ready ? (error ? '다시 불러오기' : '불러오는 중…') : selected ? '선택 취소' : '날짜런 선택'}
            variant={selected ? 'outline' : 'primary'}
            disabled={busy || (!ready && !error)}
            onPress={() => { void toggle(); }}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: theme.space.md, marginBottom: theme.space.md },
  title: { fontSize: 15, fontWeight: '800', color: theme.text },
  distance: { fontSize: 40, fontWeight: '900', color: theme.orange, marginTop: theme.space.sm, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 18, fontWeight: '800' },
  date: { fontSize: 13, color: theme.textSecondary, marginTop: theme.space.xs },
  message: { marginVertical: theme.space.md, gap: theme.space.sm },
  body: { fontSize: 13, lineHeight: 21, color: theme.textSecondary },
  selected: { color: theme.greenDark, fontWeight: '700' },
  instructions: { backgroundColor: theme.cardMuted, padding: theme.space.sm, borderRadius: theme.radius.sm, gap: theme.space.xs },
  device: { fontSize: 13, fontWeight: '700', color: theme.text },
  error: { color: theme.danger, fontSize: 13, lineHeight: 21 },
  actions: { flexDirection: 'row' },
});
