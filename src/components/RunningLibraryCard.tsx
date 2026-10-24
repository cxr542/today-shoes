import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { confirmAction } from '../confirm';
import { formatDateRunDistance, getDateRunInfo } from '../dateRun/core';
import { parseWorkoutImportV1 } from '../import/workoutContractV1';
import { getRunResult, workoutKey } from '../running/core';
import type { RunRecord } from '../running/core';
import { pickWorkoutJson } from '../running/pickWorkoutJson';
import { runningErrorMessage, runningStore, useRunningLibrary } from '../running/useRunningLibrary';
import { theme } from '../theme';
import { Card, PrimaryButton } from '../ui';

type Preview = Readonly<{ raw: string; count: number }>;

export function RunningLibraryCard() {
  const { records, ready, pending, error, perform } = useRunningLibrary();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [draft, setDraft] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [page, setPage] = useState(0);
  const disabled = !ready || pending > 0 || picking;
  const lastPage = Math.max(0, Math.ceil(records.length / 10) - 1);
  const currentPage = Math.min(page, lastPage);

  function validate(raw: string): void {
    try {
      const parsed = parseWorkoutImportV1(raw);
      setPreview({ raw, count: parsed.workouts.length });
      setInputError(null);
      setNotice(null);
    } catch (reason) {
      setPreview(null);
      setInputError(runningErrorMessage(reason));
    }
  }

  async function chooseFile(): Promise<void> {
    setPicking(true);
    try {
      const raw = await pickWorkoutJson();
      if (raw !== null) validate(raw);
    } catch (reason) { setInputError(runningErrorMessage(reason)); }
    finally { setPicking(false); }
  }

  async function save(): Promise<void> {
    if (!preview) return;
    const result = await perform(() => runningStore.importJson(preview.raw));
    if (result) {
      setPreview(null);
      setDraft('');
      setNotice(`${result.added}개 저장 · 중복 ${result.duplicates}개 건너뜀`);
      setPage(0);
    }
  }

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>러닝 기록</Text>
        <Text style={styles.body}>HealthRunExporter에서 내보낸 Workout JSON을 가져오세요. 기록은 이 기기에만 저장됩니다.</Text>
        <View style={styles.actions}>
          <PrimaryButton label={picking ? '파일 여는 중…' : 'JSON 파일 선택'} disabled={disabled} onPress={() => { void chooseFile(); }} />
          <PrimaryButton label={showPaste ? '붙여넣기 닫기' : 'JSON 붙여넣기'} variant="outline" disabled={disabled} onPress={() => { setShowPaste(!showPaste); setInputError(null); }} />
        </View>
        {showPaste && <View style={styles.section}>
          <TextInput accessibilityLabel="Workout JSON" multiline value={draft} onChangeText={value => { setDraft(value); setPreview(null); }}
            style={styles.input} placeholder="Workout JSON을 붙여넣으세요" placeholderTextColor={theme.textSecondary} autoCapitalize="none" autoCorrect={false} maxLength={1048576} />
          <PrimaryButton label="가져올 기록 확인" variant="secondary" disabled={disabled || !draft.trim()} onPress={() => validate(draft)} />
        </View>}
        {preview && <View style={styles.preview}>
          <Text style={styles.body}>러닝 기록 {preview.count}개를 확인했습니다. 저장 전에는 기록이 변경되지 않습니다.</Text>
          <View style={styles.actions}>
            <PrimaryButton label="기록 저장" disabled={disabled} onPress={() => { void save(); }} />
            <PrimaryButton label="가져오기 취소" variant="outline" disabled={pending > 0} onPress={() => setPreview(null)} />
          </View>
        </View>}
        {!ready && !error && <Text style={styles.body}>기록을 불러오는 중…</Text>}
        {!ready && error && <PrimaryButton label="기록 다시 불러오기" disabled={pending > 0} onPress={() => { void perform(() => runningStore.load()); }} />}
        {(inputError || error) && <Text accessibilityRole="alert" style={styles.error}>{inputError || error}</Text>}
        {notice && <Text accessibilityLiveRegion="polite" style={styles.success}>{notice}</Text>}
        {ready && records.length === 0 && <Text style={styles.body}>아직 가져온 러닝 기록이 없습니다.</Text>}
        {records.slice(currentPage * 10, (currentPage + 1) * 10).map(record => <RunRow key={workoutKey(record.workout)} record={record} disabled={disabled}
          onLink={() => { void perform(() => runningStore.link(workoutKey(record.workout), !record.dateRunLinked)); }}
          onDelete={() => { void perform(async () => {
            if (await confirmAction('러닝 기록 삭제', '이 기기에 저장된 기록과 날짜런 연결을 삭제할까요? 원본 JSON은 변경되지 않습니다.')) {
              await runningStore.remove(workoutKey(record.workout));
            }
          }); }} />)}
        {lastPage > 0 && <View style={styles.actions}>
          <PrimaryButton label="이전 기록" variant="outline" disabled={disabled || currentPage === 0} onPress={() => setPage(currentPage - 1)} />
          <Text style={styles.body}>{currentPage + 1} / {lastPage + 1}</Text>
          <PrimaryButton label="다음 기록" variant="outline" disabled={disabled || currentPage === lastPage} onPress={() => setPage(currentPage + 1)} />
        </View>}
        <Text style={styles.note}>날짜런 연결은 직접 선택합니다. 러닝 시작 시각의 서울 날짜가 목표 기준이며, 여러 기록의 거리를 합산하지 않습니다.</Text>
      </Card>
    </View>
  );
}

function RunRow({ record, disabled, onLink, onDelete }: Readonly<{ record: RunRecord; disabled: boolean; onLink: () => void; onDelete: () => void }>) {
  const { workout } = record;
  const info = getDateRunInfo(new Date(workout.started_at));
  const result = getRunResult(record);
  return <View style={styles.record}>
    <Text style={styles.recordTitle}>{info.dateLabel} · {workout.source === 'healthkit' ? 'HealthKit' : '수동 기록'}</Text>
    <Text style={styles.body}>{workout.distance_meters === null ? '거리 정보 없음' : `${(workout.distance_meters / 1000).toFixed(3)} km (${workout.distance_meters.toLocaleString('ko-KR')} m)`} · {Math.floor(workout.duration_seconds / 60)}분 {Math.round(workout.duration_seconds % 60)}초</Text>
    {workout.source_app && <Text style={styles.note}>기록 출처: {workout.source_app}</Text>}
    {result && <View accessibilityLiveRegion="polite" style={styles.preview}>
      <Text style={styles.recordTitle}>날짜런 목표 {formatDateRunDistance(result.target.targetDistanceM)}</Text>
      <Text style={result.isCompleted ? styles.success : styles.body}>{result.isPerfect ? '🎯 PERFECT' : result.isCompleted ? '✅ COMPLETED' : '목표 거리 미달'}</Text>
      <Text style={styles.note}>Perfect: 목표 이상 ~ 목표 +50 m 이내. GPS 정확도를 보장하는 값은 아닙니다.</Text>
    </View>}
    <View style={styles.actions}>
      <PrimaryButton label={record.dateRunLinked ? '날짜런 연결 해제' : '날짜런에 연결'} variant="outline" disabled={disabled || workout.distance_meters === null} onPress={onLink} />
      <PrimaryButton label="기록 삭제" variant="outline" disabled={disabled} onPress={onDelete} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { marginHorizontal: theme.space.md, marginBottom: theme.space.md },
  title: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: theme.space.sm },
  recordTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
  body: { fontSize: 13, lineHeight: 21, color: theme.textSecondary },
  note: { fontSize: 12, lineHeight: 19, color: theme.textSecondary, marginTop: theme.space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space.sm, marginTop: theme.space.sm },
  section: { marginTop: theme.space.md },
  preview: { backgroundColor: theme.cardMuted, padding: theme.space.sm, borderRadius: theme.radius.sm, marginTop: theme.space.sm, gap: theme.space.xs },
  input: { minHeight: 120, maxHeight: 220, borderWidth: 1, borderColor: theme.textSecondary, borderRadius: theme.radius.sm, padding: theme.space.sm, color: theme.text, textAlignVertical: 'top', marginBottom: theme.space.sm },
  error: { color: theme.danger, fontSize: 13, lineHeight: 21, marginTop: theme.space.sm },
  success: { color: theme.greenDark, fontSize: 13, fontWeight: '700', marginTop: theme.space.sm },
  record: { marginTop: theme.space.md, borderTopWidth: 1, borderTopColor: theme.cardMuted, paddingTop: theme.space.md, gap: theme.space.xs },
});
