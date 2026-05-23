import { Image } from 'expo-image';
import type { Dispatch, SetStateAction } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { hasVisionRecommendation } from '../recommendation';
import type { ShoeAnalysisFields } from '../shoeAnalysisForm';
import { geminiStatusLabel, shoeUsesGemini } from '../shoeAnalysisStatus';
import { SHOE_ANGLE_IDS, SHOE_ANGLE_META, primaryImageUri } from '../shoeAngles';
import { Shoe } from '../shoeStore';
import { theme } from '../theme';

type ShoeDetailModalProps = {
  detailModal: Shoe | null;
  setDetailModal: (shoe: Shoe | null) => void;
  detailEdit: ShoeAnalysisFields;
  setDetailEdit: Dispatch<SetStateAction<ShoeAnalysisFields>>;
  recLoading: boolean;
  onSaveDetailEdits: () => void;
  onRefreshRecommendation: () => void;
  onConfirmDelete: (shoe: Shoe) => void;
};

function setField(
  setDetailEdit: Dispatch<SetStateAction<ShoeAnalysisFields>>,
  key: keyof ShoeAnalysisFields,
  value: string,
) {
  setDetailEdit((prev) => ({ ...prev, [key]: value }));
}

export function ShoeDetailModal({
  detailModal,
  setDetailModal,
  detailEdit,
  setDetailEdit,
  recLoading,
  onSaveDetailEdits,
  onRefreshRecommendation,
  onConfirmDelete,
}: ShoeDetailModalProps) {
  const sourceLabel =
    detailModal?.source === 'camera'
      ? '카메라로 등록'
      : detailModal?.source === 'album'
        ? '앨범에서 등록'
        : null;

  return (
    <Modal visible={!!detailModal} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <ScrollView
          style={[
            styles.modalScroll,
            { maxHeight: Math.min(Dimensions.get('window').height * 0.88, 720) },
          ]}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>러닝화 상세</Text>
              <Pressable onPress={() => setDetailModal(null)} style={styles.modalCloseIconBtn}>
                <Text style={styles.modalCloseIconText}>✕</Text>
              </Pressable>
            </View>

            {detailModal ? (
              <View style={styles.analysisStatusRow}>
                <View
                  style={[
                    styles.analysisPill,
                    shoeUsesGemini(detailModal)
                      ? styles.analysisPillGemini
                      : styles.analysisPillFallback,
                  ]}
                >
                  <Text style={styles.analysisPillText}>{geminiStatusLabel(detailModal)}</Text>
                </View>
                <Text style={styles.analysisHint}>
                  AI 추정이 틀리면 아래 항목을 고친 뒤 「수정 내용 저장」을 눌러 주세요.
                </Text>
              </View>
            ) : null}

            {sourceLabel ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaBadge}>{sourceLabel}</Text>
                {detailModal ? (
                  <Text style={styles.metaDate}>
                    {new Date(detailModal.createdAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {detailModal ? (
              <View style={styles.photoRow}>
                {SHOE_ANGLE_IDS.map((angle) => {
                  const uri = detailModal.imageUris?.[angle] ?? (angle === 'front' ? primaryImageUri(detailModal) : undefined);
                  if (!uri) return null;
                  return (
                    <View key={angle} style={styles.photoCol}>
                      <Text style={styles.photoColLabel}>{SHOE_ANGLE_META[angle].label}</Text>
                      <Image source={{ uri }} style={styles.photoColImg} contentFit="cover" />
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>AI 추정 수정</Text>

              <Text style={styles.inputLabel}>표시 이름</Text>
              <TextInput
                style={styles.input}
                placeholder="신발장에 보이는 이름"
                placeholderTextColor={theme.textMuted}
                value={detailEdit.displayName}
                onChangeText={(t) => setField(setDetailEdit, 'displayName', t)}
              />

              <Text style={styles.inputLabel}>브랜드</Text>
              <TextInput
                style={styles.input}
                placeholder="예: Nike"
                placeholderTextColor={theme.textMuted}
                value={detailEdit.brand}
                onChangeText={(t) => setField(setDetailEdit, 'brand', t)}
              />

              <Text style={styles.inputLabel}>모델</Text>
              <TextInput
                style={styles.input}
                placeholder="예: Pegasus 40"
                placeholderTextColor={theme.textMuted}
                value={detailEdit.model}
                onChangeText={(t) => setField(setDetailEdit, 'model', t)}
              />

              <Text style={styles.inputLabel}>특징</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="쿠션·어퍼·트레드 등"
                placeholderTextColor={theme.textMuted}
                value={detailEdit.traits}
                onChangeText={(t) => setField(setDetailEdit, 'traits', t)}
                multiline
              />

              <Text style={styles.inputLabel}>추천 용도</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="이지런·템포·LSD 등"
                placeholderTextColor={theme.textMuted}
                value={detailEdit.bestFor}
                onChangeText={(t) => setField(setDetailEdit, 'bestFor', t)}
                multiline
              />

              <Text style={styles.inputLabel}>참고 (선택)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="한 줄 주의사항"
                placeholderTextColor={theme.textMuted}
                value={detailEdit.caution}
                onChangeText={(t) => setField(setDetailEdit, 'caution', t)}
                multiline
              />
            </View>

            <Pressable
              style={[styles.modalOkWide, recLoading && styles.modalDisabled]}
              onPress={onSaveDetailEdits}
              disabled={recLoading}
            >
              <Text style={styles.modalOkText}>수정 내용 저장</Text>
            </Pressable>

            {hasVisionRecommendation() ? (
              <Pressable
                style={[styles.recRefresh, recLoading && styles.modalDisabled]}
                onPress={onRefreshRecommendation}
                disabled={recLoading}
              >
                {recLoading ? (
                  <ActivityIndicator color={theme.greenDark} />
                ) : (
                  <Text style={styles.recRefreshText}>3장으로 AI 다시 분석 (입력값 덮어씀)</Text>
                )}
              </Pressable>
            ) : (
              <Text style={styles.recKeyHint}>
                `.env`에 EXPO_PUBLIC_GOOGLE_AI_API_KEY를 넣으면 Gemini 분석을 씁니다.
              </Text>
            )}

            <View style={styles.modalBottomActions}>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => detailModal && onConfirmDelete(detailModal)}
              >
                <Text style={styles.deleteBtnText}>신발장에서 삭제</Text>
              </Pressable>
              <Pressable style={styles.modalGhostWide} onPress={() => setDetailModal(null)}>
                <Text style={styles.modalGhostText}>닫기</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalScroll: {
    backgroundColor: theme.card,
    borderRadius: theme.radius.xl,
    width: '100%',
  },
  modalScrollContent: { padding: 0 },
  modalCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius.xl,
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  analysisStatusRow: {
    marginBottom: 12,
    gap: 6,
  },
  analysisPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  analysisPillGemini: { backgroundColor: theme.green },
  analysisPillFallback: { backgroundColor: theme.textMuted },
  analysisPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  analysisHint: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.orangeDark,
    backgroundColor: theme.orangeLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaDate: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  modalCloseIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseIconText: { fontSize: 16, fontWeight: '600', color: theme.textSecondary },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  photoCol: { flex: 1, minWidth: 0 },
  photoColLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  photoColImg: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.border,
  },
  editSection: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: theme.cardMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: theme.text,
    marginBottom: 12,
    fontWeight: '600',
    backgroundColor: theme.card,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalOkWide: {
    backgroundColor: theme.orange,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalOkText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  recRefresh: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 16,
    borderRadius: theme.radius.md,
    backgroundColor: theme.greenLight,
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  recRefreshText: { fontSize: 14, fontWeight: '800', color: theme.greenDark },
  recKeyHint: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.textMuted,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBottomActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  deleteBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.dangerBg,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  deleteBtnText: { color: theme.danger, fontSize: 15, fontWeight: '800' },
  modalGhostWide: {
    flex: 1.2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  modalGhostText: { fontSize: 15, fontWeight: '800', color: theme.textSecondary },
  modalDisabled: { opacity: 0.6 },
});
