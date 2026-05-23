import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabs, TabId } from './src/components/BottomTabs';
import {
  WebHiddenFileInput,
  type WebHiddenFileInputHandle,
} from './src/components/WebHiddenFileInput';
import { WebAppFrame } from './src/components/WebAppFrame';
import { isWebPlatform } from './src/shoeImagePersist';
import {
  RegisterConfirmModal,
  type RegisterDraft,
} from './src/components/RegisterConfirmModal';
import { ShoeDetailModal } from './src/components/ShoeModals';
import { analyzeShoePhotos, type ShoePhotoAnalysis } from './src/recommendation';
import {
  SHOE_ANGLE_IDS,
  filledPhotoUris,
  hasAllShoePhotos,
  type ShoeAngleId,
} from './src/shoeAngles';
import { launchCamera, launchPhotoLibrary } from './src/pickImage';
import {
  fieldsFromAnalysis,
  fieldsFromShoe,
  recommendationFromFields,
  type ShoeAnalysisFields,
} from './src/shoeAnalysisForm';
import {
  addShoe,
  clearAllShoes,
  loadShoes,
  removeShoe,
  Shoe,
  ShoeSource,
  updateShoeFromAnalysis,
} from './src/shoeStore';
import { ClosetTab } from './src/screens/ClosetTab';
import { GuideTab } from './src/screens/GuideTab';
import { HomeTab } from './src/screens/HomeTab';
import { LinksTab } from './src/screens/LinksTab';
import { confirmAction } from './src/confirm';
import { registerDefaultSampleIfEmpty } from './src/registerDefaultSample';
import { registerFolderSeedsIfNeeded } from './src/registerFolderSeeds';
import { isAutoSeedEnabled } from './src/seedRegistry';
import { theme } from './src/theme';

const EMPTY_PHOTOS = { front: '', left: '', right: '' } as const;

function emptyRegisterDraft(visible = false): RegisterDraft {
  return {
    visible,
    photos: { ...EMPTY_PHOTOS },
    nickname: '',
    brand: '',
    model: '',
    traits: '',
    bestFor: '',
    caution: '',
    source: null,
  };
}

function applyAnalysisToDraft(d: RegisterDraft, a: ShoePhotoAnalysis): RegisterDraft {
  const f = fieldsFromAnalysis(a);
  return {
    ...d,
    nickname: f.displayName || d.nickname,
    brand: f.brand,
    model: f.model,
    traits: f.traits,
    bestFor: f.bestFor,
    caution: f.caution,
  };
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const webFileInputRef = useRef<WebHiddenFileInputHandle>(null);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>('closet');

  const [registerDraft, setRegisterDraft] = useState<RegisterDraft>(emptyRegisterDraft());
  const pendingAngleRef = useRef<ShoeAngleId>('front');
  const [registerAnalysis, setRegisterAnalysis] = useState<ShoePhotoAnalysis | null>(null);
  const [registerAnalyzing, setRegisterAnalyzing] = useState(false);

  const [detailModal, setDetailModal] = useState<Shoe | null>(null);
  const [detailEdit, setDetailEdit] = useState<ShoeAnalysisFields>({
    displayName: '',
    brand: '',
    model: '',
    traits: '',
    bestFor: '',
    caution: '',
  });
  const [recLoading, setRecLoading] = useState(false);

  const refresh = useCallback(async () => {
    setShoes(await loadShoes());
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      try {
        if (await registerDefaultSampleIfEmpty()) {
          await refresh();
        } else if (isAutoSeedEnabled()) {
          const added = await registerFolderSeedsIfNeeded();
          if (added > 0) await refresh();
        }
      } catch (e) {
        console.warn('샘플/시드 등록 실패', e);
      }
      setLoading(false);
    })();
  }, [refresh]);

  const setPhotoForAngle = (angle: ShoeAngleId, uri: string, source: ShoeSource) => {
    setRegisterAnalysis(null);
    setRegisterDraft((d) => ({
      ...d,
      visible: true,
      source: d.source ?? source,
      photos: { ...d.photos, [angle]: uri },
    }));
  };

  const applyPickerToAngle = (
    angle: ShoeAngleId,
    result: ImagePicker.ImagePickerResult,
    source: ShoeSource,
  ) => {
    if (result.canceled || !result.assets?.[0]) return;
    setPhotoForAngle(angle, result.assets[0].uri, source);
  };

  useEffect(() => {
    if (!registerDraft.visible || !hasAllShoePhotos(registerDraft.photos)) return;
    const uris = filledPhotoUris(registerDraft.photos);
    let cancelled = false;
    (async () => {
      setRegisterAnalyzing(true);
      setRegisterAnalysis(null);
      try {
        const a = await analyzeShoePhotos(uris, registerDraft.nickname);
        if (!cancelled) {
          setRegisterAnalysis(a);
          setRegisterDraft((d) => applyAnalysisToDraft(d, a));
        }
      } catch (e) {
        console.warn('등록 전 AI 분석 실패', e);
      } finally {
        if (!cancelled) setRegisterAnalyzing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    registerDraft.visible,
    registerDraft.photos.front,
    registerDraft.photos.left,
    registerDraft.photos.right,
  ]);

  const pickPhotoForAngle = async (angle: ShoeAngleId, useCamera: boolean) => {
    try {
      const result = useCamera ? await launchCamera() : await launchPhotoLibrary();
      applyPickerToAngle(angle, result, useCamera ? 'camera' : 'album');
    } catch (e) {
      if (e instanceof Error && e.message === 'CAMERA_PERMISSION_DENIED') {
        Alert.alert('권한 필요', '카메라를 사용하려면 권한이 필요합니다.');
        return;
      }
      if (e instanceof Error && e.message === 'PHOTO_PERMISSION_DENIED') {
        Alert.alert('권한 필요', '사진을 불러오려면 사진 라이브러리 권한이 필요합니다.');
        return;
      }
      console.warn('사진 선택 실패', e);
    }
  };

  const onPickRegisterAngle = (angle: ShoeAngleId) => {
    pendingAngleRef.current = angle;
    if (isWebPlatform()) {
      webFileInputRef.current?.pick();
      return;
    }
    Alert.alert(
      `${angle === 'front' ? '정면' : angle === 'left' ? '왼쪽' : '오른쪽'} 사진`,
      '러닝화 사진을 추가합니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '📸 촬영', onPress: () => void pickPhotoForAngle(angle, true) },
        { text: '🖼️ 앨범', onPress: () => void pickPhotoForAngle(angle, false) },
      ],
    );
  };

  const onWebFileSelected = (uri: string) => {
    setPhotoForAngle(pendingAngleRef.current, uri, 'album');
  };

  const pickFromLibrary = () => onPickRegisterAngle('front');

  const pickFromCamera = () => void pickPhotoForAngle('front', true);

  const showAddSheet = () => {
    setRegisterAnalysis(null);
    setRegisterDraft(emptyRegisterDraft(true));
  };

  const onTabChange = (id: TabId) => {
    if (id === 'add') {
      showAddSheet();
      return;
    }
    setTab(id);
  };

  const closeRegisterDraft = () => {
    setRegisterDraft(emptyRegisterDraft());
    setRegisterAnalysis(null);
    setRegisterAnalyzing(false);
  };

  const resetRegisterPhotos = () => {
    setRegisterAnalysis(null);
    setRegisterDraft((d) => ({
      ...emptyRegisterDraft(true),
      source: d.source,
    }));
  };

  const removeRegisterAngle = (angle: ShoeAngleId) => {
    setRegisterAnalysis(null);
    setRegisterDraft((d) => ({
      ...d,
      photos: { ...d.photos, [angle]: '' },
    }));
  };

  const reanalyzeRegister = async () => {
    if (!hasAllShoePhotos(registerDraft.photos)) return;
    setRegisterAnalyzing(true);
    try {
      const uris = filledPhotoUris(registerDraft.photos);
      const a = await analyzeShoePhotos(uris, registerDraft.nickname);
      setRegisterAnalysis(a);
      setRegisterDraft((d) => applyAnalysisToDraft(d, a));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('분석 실패', msg);
    } finally {
      setRegisterAnalyzing(false);
    }
  };

  const confirmRegister = async () => {
    if (!registerAnalysis) return;
    setSaving(true);
    try {
      const fields: ShoeAnalysisFields = {
        displayName: registerDraft.nickname.trim(),
        brand: registerDraft.brand.trim(),
        model: registerDraft.model.trim(),
        traits: registerDraft.traits.trim(),
        bestFor: registerDraft.bestFor.trim(),
        caution: registerDraft.caution.trim(),
      };
      const nick = fields.displayName || '러닝화';
      await addShoe(
        registerDraft.photos,
        nick,
        recommendationFromFields(fields, registerAnalysis.fromVision),
        registerDraft.source ?? undefined,
        {
          brand: fields.brand,
          model: fields.model,
          traits: fields.traits,
          geminiAnalyzed: registerAnalysis.fromVision,
        },
      );
      closeRegisterDraft();
      await refresh();
      setTab('closet');
      Alert.alert('등록 완료', 'AI 분석 결과와 함께 신발장에 추가했습니다.');
    } catch (e) {
      Alert.alert('저장 실패', '이미지를 저장하지 못했습니다. 다시 시도해 주세요.');
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  const refreshRecommendationForDetail = async () => {
    if (!detailModal) return;
    setRecLoading(true);
    try {
      const multi = SHOE_ANGLE_IDS.map((id) => detailModal.imageUris?.[id] ?? '').filter(Boolean);
      const uris = multi.length >= 3 ? multi : [detailModal.imageUri];
      const a = await analyzeShoePhotos(uris, detailEdit.displayName);
      const fields = fieldsFromAnalysis(a);
      await updateShoeFromAnalysis(detailModal.id, {
        nickname: fields.displayName || '러닝화',
        recommendation: recommendationFromFields(fields, a.fromVision),
        brand: fields.brand,
        model: fields.model,
        traits: fields.traits,
        geminiAnalyzed: a.fromVision,
      });
      await refresh();
      const next = (await loadShoes()).find((s) => s.id === detailModal.id);
      if (next) {
        setDetailModal(next);
        setDetailEdit(fieldsFromShoe(next));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('분석 실패', msg);
    } finally {
      setRecLoading(false);
    }
  };

  const openDetail = (shoe: Shoe) => {
    setDetailModal(shoe);
    setDetailEdit(fieldsFromShoe(shoe));
  };

  const saveDetailEdits = async () => {
    if (!detailModal) return;
    const fields = { ...detailEdit, displayName: detailEdit.displayName.trim() };
    const nick = fields.displayName || '러닝화';
    const gemini = detailModal.geminiAnalyzed === true;
    await updateShoeFromAnalysis(detailModal.id, {
      nickname: nick,
      recommendation: recommendationFromFields(fields, gemini),
      brand: fields.brand,
      model: fields.model,
      traits: fields.traits,
      geminiAnalyzed: gemini,
    });
    setDetailModal(null);
    await refresh();
  };

  const confirmClearCloset = async () => {
    const ok = await confirmAction(
      '신발장 비우기',
      `저장된 신발 ${shoes.length}켤레를 모두 삭제할까요?\n(브라우저에 저장된 데이터가 초기화됩니다)`,
    );
    if (!ok) return;
    await clearAllShoes();
    setDetailModal(null);
    await refresh();
  };

  const confirmDelete = async (shoe: Shoe) => {
    const ok = await confirmAction(
      '삭제',
      `「${shoe.nickname || '러닝화'}」을 신발장에서 삭제할까요?`,
    );
    if (!ok) return;
    await removeShoe(shoe.id);
    setDetailModal(null);
    await refresh();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.orange} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <WebAppFrame>
    <WebHiddenFileInput ref={webFileInputRef} onFile={onWebFileSelected} />
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      {isWebPlatform() ? (
        <View style={styles.webBanner}>
          <Text style={styles.webBannerText}>웹 미리보기 · 데이터는 이 브라우저에 저장됩니다</Text>
        </View>
      ) : null}
      <View style={styles.body}>
        {tab === 'home' && (
          <HomeTab
            shoes={shoes}
            onGoCloset={() => setTab('closet')}
            onAddPress={showAddSheet}
          />
        )}
        {tab === 'closet' && (
          <ClosetTab
            shoes={shoes}
            onOpenDetail={openDetail}
            onDelete={confirmDelete}
            onClearAll={shoes.length > 0 ? confirmClearCloset : undefined}
            onCamera={pickFromCamera}
            onAlbum={pickFromLibrary}
          />
        )}
        {tab === 'guide' && <GuideTab />}
        {tab === 'links' && <LinksTab />}
      </View>

      <SafeAreaView edges={['bottom']} style={[styles.tabBar, isWebPlatform() && styles.tabBarWeb]}>
        <BottomTabs active={tab} onChange={onTabChange} onAddPress={showAddSheet} />
      </SafeAreaView>

      <RegisterConfirmModal
        draft={registerDraft}
        setDraft={setRegisterDraft}
        analysis={registerAnalysis}
        analyzing={registerAnalyzing}
        saving={saving}
        onConfirm={confirmRegister}
        onCancel={closeRegisterDraft}
        onResetPhotos={resetRegisterPhotos}
        onPickAngle={onPickRegisterAngle}
        onRemoveAngle={removeRegisterAngle}
        onReanalyze={reanalyzeRegister}
      />

      <ShoeDetailModal
        detailModal={detailModal}
        setDetailModal={setDetailModal}
        detailEdit={detailEdit}
        setDetailEdit={setDetailEdit}
        recLoading={recLoading}
        onSaveDetailEdits={saveDetailEdits}
        onRefreshRecommendation={refreshRecommendationForDetail}
        onConfirmDelete={confirmDelete}
      />

      {isWebPlatform() ? (
        <Text style={styles.webHint} pointerEvents="none">
          모바일(Expo Go)에서는 카메라 촬영도 사용할 수 있어요.
        </Text>
      ) : null}
    </SafeAreaView>
    </WebAppFrame>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
  body: {
    flex: 1,
    zIndex: 0,
  },
  tabBar: {
    backgroundColor: theme.card,
  },
  tabBarWeb: {
    zIndex: 200,
    overflow: 'visible',
  },
  webBanner: {
    backgroundColor: theme.orangeLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  webBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.orangeDark,
    textAlign: 'center',
  },
  webHint: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.textMuted,
    paddingHorizontal: 24,
    paddingBottom: 8,
    fontWeight: '500',
  },
});
