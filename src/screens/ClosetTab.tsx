import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AddShoeActions } from '../components/AddShoeActions';
import { TabPageHeader } from '../components/TabPageHeader';
import { hasVisionRecommendation } from '../recommendation';
import { geminiStatusLabel, shoeUsesGemini } from '../shoeAnalysisStatus';
import { photoCount, primaryImageUri } from '../shoeAngles';
import { Shoe } from '../shoeStore';
import { cardShadow, theme } from '../theme';

export function ClosetTab({
  shoes,
  onOpenDetail,
  onDelete,
  onClearAll,
  onCamera,
  onAlbum,
}: {
  shoes: Shoe[];
  onOpenDetail: (shoe: Shoe) => void;
  onDelete: (shoe: Shoe) => void;
  onClearAll?: () => void;
  onCamera: () => void;
  onAlbum: () => void;
}) {
  const geminiCount = shoes.filter((s) => shoeUsesGemini(s)).length;
  const aiKeyOn = hasVisionRecommendation();

  return (
    <FlatList
      data={shoes}
      keyExtractor={(item) => item.id}
      numColumns={2}
      ListHeaderComponent={
        <>
          <TabPageHeader
            title="신발장"
            subtitle="정면·왼쪽·오른쪽 3장 → AI 분석 → 확인 후 저장"
          />

          <View style={styles.flowCard}>
            <Text style={styles.flowTitle}>등록 방법</Text>
            <View style={styles.flowRow}>
              <FlowChip n="1" label="3장 촬영" />
              <Text style={styles.flowArrow}>→</Text>
              <FlowChip n="2" label="AI 분석" highlight />
              <Text style={styles.flowArrow}>→</Text>
              <FlowChip n="3" label="자동 저장" />
            </View>
            <Text style={styles.flowNote}>
              AI가 브랜드·모델·쿠션 특징·추천 용도를 분석해 저장합니다. 확인 화면에서 수정할 수 있어요.
            </Text>
          </View>

          <AddShoeActions onCamera={onCamera} onAlbum={onAlbum} />

          {shoes.length > 0 ? (
            <View style={styles.statsRow}>
              <View style={styles.statsTop}>
                <Text style={styles.statsText}>
                  총 {shoes.length}켤레 · Gemini {geminiCount}건
                  {!aiKeyOn ? ' · API 키 필요' : ''}
                </Text>
                {onClearAll ? (
                  <Pressable style={styles.clearAllBtn} onPress={onClearAll}>
                    <Text style={styles.clearAllText}>전체 삭제</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.statsHint}>
                처음엔 샘플 1켤레만 보입니다. 「전체 삭제」 후 새로고침하면 샘플만 다시
                채워져요.
              </Text>
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📷</Text>
          <Text style={styles.emptyTitle}>사진으로 첫 신발을 등록해 보세요</Text>
          <Text style={styles.emptyBody}>
            위 버튼으로 촬영하거나 앨범에서 고르면{'\n'}
            확인 화면이 뜬 뒤 신발장에 자동으로 추가됩니다.
          </Text>
        </View>
      }
      contentContainerStyle={styles.grid}
      columnWrapperStyle={shoes.length > 0 ? styles.row : undefined}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.shoeCard, pressed && styles.shoeCardPressed]}
          onPress={() => onOpenDetail(item)}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: primaryImageUri(item) }}
              style={styles.thumb}
              contentFit="cover"
            />
            {photoCount(item) >= 3 ? (
              <View style={styles.threeBadge}>
                <Text style={styles.threeBadgeText}>3각</Text>
              </View>
            ) : null}
            <Pressable
              style={styles.cardDeleteBtn}
              onPress={() => onDelete(item)}
              accessibilityLabel="신발 삭제"
            >
              <Text style={styles.cardDeleteText}>✕</Text>
            </Pressable>
            <View
              style={[
                styles.aiBadge,
                shoeUsesGemini(item) ? styles.aiBadgeGemini : styles.aiBadgeFallback,
              ]}
            >
              <Text
                style={[
                  styles.aiBadgeText,
                  shoeUsesGemini(item) ? styles.aiBadgeTextGemini : styles.aiBadgeTextFallback,
                ]}
              >
                {geminiStatusLabel(item)}
              </Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>
                {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            {item.source ? (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>
                  {item.source === 'camera' ? '📸' : '🖼️'}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardLabel} numberOfLines={1}>
            {item.nickname || '러닝화 (이름 없음)'}
          </Text>
          {item.brand || item.model ? (
            <Text style={styles.cardMeta} numberOfLines={1}>
              {[item.brand, item.model].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {item.traits?.trim() ? (
            <View style={styles.recChip}>
              <Text style={styles.recChipTag}>AI</Text>
              <Text style={styles.recChipText} numberOfLines={2}>
                {item.traits}
              </Text>
            </View>
          ) : item.recommendation?.trim() ? (
            <View style={styles.recChip}>
              <Text style={styles.recChipTag}>AI</Text>
              <Text style={styles.recChipText} numberOfLines={2}>
                {item.recommendation.replace(/\n+/g, ' ').replace(/【.*?】/g, '').trim()}
              </Text>
            </View>
          ) : (
            <View style={styles.recChipEmpty}>
              <Text style={styles.recChipEmptyText}>분석 대기 · 탭하여 상세</Text>
            </View>
          )}
        </Pressable>
      )}
    />
  );
}

function FlowChip({
  n,
  label,
  highlight,
}: {
  n: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.chip, highlight && styles.chipHighlight]}>
      <Text style={[styles.chipN, highlight && styles.chipNOn]}>{n}</Text>
      <Text style={[styles.chipLabel, highlight && styles.chipLabelOn]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flowCard: {
    marginHorizontal: theme.space.md,
    marginBottom: theme.space.sm,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...cardShadow,
  },
  flowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 10,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  flowArrow: { fontSize: 12, color: theme.textMuted, fontWeight: '700' },
  flowNote: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: theme.cardMuted,
  },
  chipHighlight: {
    backgroundColor: theme.orangeLight,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  chipN: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textMuted,
  },
  chipNOn: { color: theme.orange },
  chipLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  chipLabelOn: { color: theme.orangeDark, fontWeight: '800' },
  statsRow: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  statsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: theme.dangerBg,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.danger,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
  },
  statsHint: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: theme.textMuted,
    fontWeight: '500',
  },
  cardDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  aiBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    zIndex: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiBadgeGemini: {
    backgroundColor: 'rgba(22, 163, 74, 0.92)',
  },
  aiBadgeFallback: {
    backgroundColor: 'rgba(107, 114, 128, 0.88)',
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  aiBadgeTextGemini: { color: '#fff' },
  aiBadgeTextFallback: { color: '#fff' },
  grid: {
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  row: { gap: theme.space.sm },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 28,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  shoeCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...cardShadow,
  },
  shoeCardPressed: { opacity: 0.94, transform: [{ scale: 0.98 }] },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: theme.border,
  },
  thumb: { width: '100%', height: '100%' },
  threeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.orange,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  threeBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  dateBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dateBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  sourceBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeText: { fontSize: 12 },
  cardLabel: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 14,
    fontWeight: '800',
    color: theme.text,
  },
  cardMeta: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    fontSize: 11,
    fontWeight: '600',
    color: theme.textMuted,
  },
  recChip: {
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 8,
    backgroundColor: theme.greenLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  recChipTag: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.greenDark,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  recChipText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: theme.greenDark,
    fontWeight: '500',
  },
  recChipEmpty: {
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    alignItems: 'center',
  },
  recChipEmptyText: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: '600',
  },
});
