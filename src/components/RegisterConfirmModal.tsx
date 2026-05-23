import { Image } from 'expo-image';
import type { Dispatch, SetStateAction } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { hasVisionRecommendation, type ShoePhotoAnalysis } from '../recommendation';
import {
  SHOE_ANGLE_IDS,
  SHOE_ANGLE_META,
  hasAllShoePhotos,
  type ShoeAngleId,
  type ShoeImages,
} from '../shoeAngles';
import type { ShoeSource } from '../shoeStore';
import { theme } from '../theme';

export type RegisterDraft = {
  visible: boolean;
  photos: ShoeImages;
  nickname: string;
  brand: string;
  model: string;
  traits: string;
  bestFor: string;
  caution: string;
  source: ShoeSource | null;
};

type Props = {
  draft: RegisterDraft;
  setDraft: Dispatch<SetStateAction<RegisterDraft>>;
  analysis: ShoePhotoAnalysis | null;
  analyzing: boolean;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onResetPhotos: () => void;
  onPickAngle: (angle: ShoeAngleId) => void;
  onRemoveAngle: (angle: ShoeAngleId) => void;
  onReanalyze: () => void;
};

const STEPS = [
  { n: 1, label: '3장 촬영' },
  { n: 2, label: 'AI 분석' },
  { n: 3, label: '등록 저장' },
];

export function RegisterConfirmModal({
  draft,
  setDraft,
  analysis,
  analyzing,
  saving,
  onConfirm,
  onCancel,
  onResetPhotos,
  onPickAngle,
  onRemoveAngle,
  onReanalyze,
}: Props) {
  const aiOn = hasVisionRecommendation();
  const allPhotos = hasAllShoePhotos(draft.photos);
  const canConfirm = allPhotos && !analyzing && !saving && !!analysis;
  const photoCount = SHOE_ANGLE_IDS.filter((id) => draft.photos[id]).length;

  return (
    <Modal visible={draft.visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>신발 등록</Text>
              <Pressable onPress={onCancel} style={styles.closeBtn} disabled={saving}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.steps}>
              {STEPS.map((step, i) => {
                const done =
                  (i === 0 && allPhotos) || (i === 1 && analysis && !analyzing && allPhotos);
                const active =
                  (i === 0 && !allPhotos) ||
                  (i === 1 && allPhotos && (analyzing || !analysis)) ||
                  (i === 2 && analysis && !analyzing);
                return (
                  <View key={step.n} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        done && styles.stepDotDone,
                        active && styles.stepDotActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNum,
                          done && styles.stepNumDone,
                          active && styles.stepNumActive,
                        ]}
                      >
                        {done ? '✓' : step.n}
                      </Text>
                    </View>
                    <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                      {step.label}
                    </Text>
                    {i < STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
                  </View>
                );
              })}
            </View>

            <Text style={styles.lead}>
              <Text style={styles.leadBold}>정면 · 왼쪽 · 오른쪽</Text> 3장을 올리면 AI가 이름과
              특징을 분석합니다.
            </Text>

            <Text style={styles.photoProgress}>
              사진 {photoCount}/3{allPhotos ? ' · 분석 준비 완료' : ''}
            </Text>

            <View style={styles.photoGrid}>
              {SHOE_ANGLE_IDS.map((angle) => {
                const uri = draft.photos[angle];
                const meta = SHOE_ANGLE_META[angle];
                return (
                  <View key={angle} style={styles.photoSlot}>
                    <Text style={styles.photoSlotLabel}>{meta.label}</Text>
                    <Pressable
                      style={[styles.photoBox, uri && styles.photoBoxFilled]}
                      onPress={() => onPickAngle(angle)}
                      disabled={saving || analyzing}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Text style={styles.photoPlus}>+</Text>
                          <Text style={styles.photoHint}>{meta.hint}</Text>
                        </View>
                      )}
                    </Pressable>
                    {uri ? (
                      <Pressable
                        onPress={() => onRemoveAngle(angle)}
                        disabled={saving || analyzing}
                      >
                        <Text style={styles.photoRemove}>다시 선택</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {analyzing ? (
              <View style={styles.analyzeBox}>
                <ActivityIndicator color={theme.orange} />
                <Text style={styles.analyzeTitle}>3장 사진 AI 분석 중…</Text>
                <Text style={styles.analyzeSub}>정면·왼쪽·오른쪽을 함께 참고합니다</Text>
              </View>
            ) : analysis && allPhotos ? (
              <View style={styles.resultBox}>
                <Text style={styles.resultTitle}>
                  {analysis.fromVision ? 'AI 추정 · 아래에서 수정 가능' : '기본 안내'}
                </Text>
                {aiOn ? (
                  <Pressable style={styles.reanalyzeBtn} onPress={onReanalyze} disabled={saving}>
                    <Text style={styles.reanalyzeText}>↻ AI 분석 다시 하기</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : allPhotos ? null : (
              <Text style={styles.waitPhotos}>3장 모두 추가하면 자동으로 분석을 시작합니다.</Text>
            )}

            {analysis && allPhotos ? (
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>저장할 내용</Text>

                <Text style={styles.inputLabel}>표시 이름</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: 나이키 페가수스 40"
                  placeholderTextColor={theme.textMuted}
                  value={draft.nickname}
                  onChangeText={(t) => setDraft((m) => ({ ...m, nickname: t }))}
                  editable={!saving}
                />

                <Text style={styles.inputLabel}>브랜드</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: Nike"
                  placeholderTextColor={theme.textMuted}
                  value={draft.brand}
                  onChangeText={(t) => setDraft((m) => ({ ...m, brand: t }))}
                  editable={!saving}
                />

                <Text style={styles.inputLabel}>모델</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: Pegasus 40"
                  placeholderTextColor={theme.textMuted}
                  value={draft.model}
                  onChangeText={(t) => setDraft((m) => ({ ...m, model: t }))}
                  editable={!saving}
                />

                <Text style={styles.inputLabel}>특징</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="쿠션·어퍼·트레드 등"
                  placeholderTextColor={theme.textMuted}
                  value={draft.traits}
                  onChangeText={(t) => setDraft((m) => ({ ...m, traits: t }))}
                  editable={!saving}
                  multiline
                />

                <Text style={styles.inputLabel}>추천 용도</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="이지런·템포·LSD 등"
                  placeholderTextColor={theme.textMuted}
                  value={draft.bestFor}
                  onChangeText={(t) => setDraft((m) => ({ ...m, bestFor: t }))}
                  editable={!saving}
                  multiline
                />

                <Text style={styles.inputLabel}>참고 (선택)</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="한 줄 주의사항"
                  placeholderTextColor={theme.textMuted}
                  value={draft.caution}
                  onChangeText={(t) => setDraft((m) => ({ ...m, caution: t }))}
                  editable={!saving}
                  multiline
                />
              </View>
            ) : null}

            <Pressable
              style={styles.retakeBtn}
              onPress={onResetPhotos}
              disabled={saving || analyzing}
            >
              <Text style={styles.retakeText}>↻ 3장 모두 다시 선택</Text>
            </Pressable>

            <View style={styles.actions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={onCancel}
                disabled={saving || analyzing}
              >
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, (!canConfirm || saving) && styles.disabled]}
                onPress={onConfirm}
                disabled={!canConfirm || saving}
              >
                {saving ? (
                  <View style={styles.savingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.confirmText}>저장 중…</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmText}>
                    {!allPhotos ? `${3 - photoCount}장 더` : analyzing ? '분석 중…' : '등록하기'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: { maxHeight: '92%' },
  sheetContent: { paddingHorizontal: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16 },
  card: {
    backgroundColor: theme.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.space.md,
  },
  title: { fontSize: 20, fontWeight: '900', color: theme.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: theme.textSecondary, fontWeight: '600' },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.md,
    paddingHorizontal: 4,
  },
  stepItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.cardMuted,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: theme.green, borderColor: theme.green },
  stepDotActive: { backgroundColor: theme.orangeLight, borderColor: theme.orange },
  stepNum: { fontSize: 12, fontWeight: '800', color: theme.textMuted },
  stepNumDone: { color: '#fff' },
  stepNumActive: { color: theme.orange },
  stepLabel: { marginTop: 6, fontSize: 10, fontWeight: '700', color: theme.textMuted },
  stepLabelActive: { color: theme.orange, fontWeight: '800' },
  stepLine: {
    position: 'absolute',
    top: 14,
    left: '55%',
    right: '-45%',
    height: 2,
    backgroundColor: theme.border,
    zIndex: -1,
  },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.textSecondary,
    marginBottom: theme.space.sm,
    fontWeight: '500',
  },
  leadBold: { fontWeight: '800', color: theme.text },
  photoProgress: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.orangeDark,
    marginBottom: theme.space.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: theme.space.sm,
    marginBottom: theme.space.md,
  },
  photoSlot: { flex: 1, minWidth: 0 },
  photoSlotLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  photoBox: {
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: theme.cardMuted,
  },
  photoBoxFilled: {
    borderStyle: 'solid',
    borderColor: theme.orange,
  },
  photoThumb: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  photoPlus: {
    fontSize: 28,
    fontWeight: '300',
    color: theme.orange,
    marginBottom: 4,
  },
  photoHint: {
    fontSize: 10,
    lineHeight: 14,
    color: theme.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  photoRemove: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: theme.orange,
    textAlign: 'center',
  },
  waitPhotos: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: theme.space.md,
    fontWeight: '500',
  },
  analyzeBox: {
    alignItems: 'center',
    padding: theme.space.lg,
    marginBottom: theme.space.md,
    backgroundColor: theme.cardMuted,
    borderRadius: theme.radius.md,
    gap: 8,
  },
  analyzeTitle: { fontSize: 15, fontWeight: '800', color: theme.text },
  analyzeSub: { fontSize: 13, color: theme.textSecondary, textAlign: 'center' },
  resultBox: {
    backgroundColor: theme.greenLight,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.greenDark,
    marginBottom: 6,
  },
  editSection: {
    marginBottom: theme.space.md,
    padding: theme.space.md,
    backgroundColor: theme.cardMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  editSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 12,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  reanalyzeBtn: { alignItems: 'center', paddingTop: 4 },
  reanalyzeText: { fontSize: 13, fontWeight: '700', color: theme.orange },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.card,
    marginBottom: theme.space.sm,
  },
  retakeBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: theme.space.md },
  retakeText: { fontSize: 14, fontWeight: '700', color: theme.orange },
  actions: { flexDirection: 'row', gap: theme.space.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '800', color: theme.textSecondary },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.orange,
    alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  disabled: { opacity: 0.55 },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
