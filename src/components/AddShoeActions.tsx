import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isWebPlatform } from '../shoeImagePersist';
import { theme } from '../theme';

export function AddShoeActions({
  onCamera,
  onAlbum,
  compact,
}: {
  onCamera: () => void;
  onAlbum: () => void;
  compact?: boolean;
}) {
  const web = isWebPlatform();

  if (web) {
    return (
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Pressable
          style={({ pressed }) => [styles.btnWebPick, pressed && styles.pressed]}
          onPress={onAlbum}
        >
          <Text style={styles.btnIcon}>🖼️</Text>
          <Text style={styles.btnLabelWeb}>신발 등록 시작</Text>
          <Text style={styles.btnHintWeb}>
            정면·왼쪽·오른쪽 3장을 순서대로 추가합니다
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Pressable
        style={({ pressed }) => [styles.btnCamera, pressed && styles.pressed]}
        onPress={onCamera}
      >
        <Text style={styles.btnIcon}>📸</Text>
        <Text style={[styles.btnLabel, styles.btnLabelOnDark]}>카메라로 촬영</Text>
        <Text style={[styles.btnHint, styles.btnHintOnDark]}>러닝화 사진을 바로 찍어요</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.btnAlbum, pressed && styles.pressed]}
        onPress={onAlbum}
      >
        <Text style={styles.btnIcon}>🖼️</Text>
        <Text style={styles.btnLabel}>앨범에서 선택</Text>
        <Text style={styles.btnHint}>갤러리 사진을 가져와요</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    marginBottom: theme.space.md,
  },
  rowCompact: {
    marginBottom: theme.space.sm,
  },
  btnWebPick: {
    flex: 1,
    backgroundColor: theme.orange,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    alignItems: 'center',
  },
  btnLabelWeb: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  btnHintWeb: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 17,
  },
  btnCamera: {
    flex: 1,
    backgroundColor: theme.orange,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    alignItems: 'center',
  },
  btnAlbum: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  btnIcon: { fontSize: 28, marginBottom: 6 },
  btnLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text,
  },
  btnLabelOnDark: { color: '#fff' },
  btnHint: {
    marginTop: 4,
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  btnHintOnDark: { color: 'rgba(255,255,255,0.85)' },
  pressed: { opacity: 0.9 },
});
