import { Alert, Platform } from 'react-native';

/** 웹에서 Alert.alert 확인이 동작하지 않을 때를 대비한 확인 대화상자 */
export function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`),
    );
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel', onPress: () => resolve(false) },
      { text: '확인', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
