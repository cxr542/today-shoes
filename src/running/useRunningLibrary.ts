import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { WorkoutValidationError } from '../import/workoutContractV1';
import { RunningLibraryError } from './core';
import { getRunningStore } from './store';

export const runningStore = getRunningStore(AsyncStorage);

export function runningErrorMessage(error: unknown): string {
  if (error instanceof WorkoutValidationError) return `Workout 파일 형식이 맞지 않습니다: ${error.path} (${error.code})`;
  if (error instanceof RunningLibraryError) {
    switch (error.code) {
      case 'conflicting_workout': return '같은 ID의 기록에 다른 값이 있습니다. 기존 기록은 변경하지 않았습니다.';
      case 'corrupt_storage': return '저장된 러닝 기록을 읽을 수 없습니다. 원본을 보존했습니다.';
      case 'library_full': return '파일 또는 저장 용량 한도를 초과했습니다. JSON은 최대 1 MB입니다.';
      case 'missing_workout': return '기록을 찾지 못했습니다. 다시 불러와주세요.';
      case 'missing_distance': return '거리 정보가 없는 기록은 날짜런에 연결할 수 없습니다.';
      case 'not_loaded': return '저장된 기록을 먼저 불러와주세요.';
      case 'unsupported_date': return '서울 날짜로 표시할 수 없는 기록입니다. 러닝 시작 날짜를 확인해주세요.';
      default: { const exhaustive: never = error.code; return exhaustive; }
    }
  }
  return '기록을 처리하지 못했습니다. 저장 공간과 파일을 확인하고 다시 시도해주세요.';
}

export function useRunningLibrary() {
  const snapshot = useSyncExternalStore(runningStore.subscribe, runningStore.getSnapshot, runningStore.getSnapshot);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  async function perform<T>(action: () => Promise<T>): Promise<T | undefined> {
    try {
      const result = await action();
      if (mounted.current) setError(null);
      return result;
    } catch (reason) {
      if (mounted.current) setError(runningErrorMessage(reason));
      return undefined;
    }
  }
  useEffect(() => {
    mounted.current = true;
    void perform(() => runningStore.load());
    return () => { mounted.current = false; };
  }, []);
  return { ...snapshot, error, perform };
}
