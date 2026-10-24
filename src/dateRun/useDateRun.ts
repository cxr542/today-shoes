import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { getDateRunInfo, isTodaySelection, millisecondsUntilSeoulMidnight } from './core';
import { getDateRunStore } from './store';

const store = getDateRunStore(AsyncStorage);

export function useDateRun() {
  const [today, setToday] = useState(() => getDateRunInfo());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const hydrate = async () => {
      try {
        await store.load();
        if (!cancelled) { setHydrated(true); setError(null); }
      } catch (reason) {
        if (!cancelled) {
          setHydrated(false);
          setError(reason instanceof Error
            ? '선택을 불러오지 못했습니다. 다시 시도해주세요.' : '저장소에 접근할 수 없습니다. 다시 시도해주세요.');
        }
      }
    };
    const refresh = () => {
      const now = new Date();
      setToday(getDateRunInfo(now));
      clearTimeout(timer);
      timer = setTimeout(refresh, millisecondsUntilSeoulMidnight(now) + 10);
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') { refresh(); void hydrate(); }
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') { refresh(); void hydrate(); }
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    void hydrate();
    return () => {
      mounted.current = false;
      cancelled = true;
      clearTimeout(timer);
      subscription.remove();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  async function toggle(): Promise<void> {
    if (locked.current || store.getSnapshot().pending > 0) return;
    locked.current = true;
    setError(null);
    try {
      const currentSnapshot = store.getSnapshot();
      if (!hydrated || !currentSnapshot.ready) {
        await store.load();
        if (mounted.current) setHydrated(true);
      } else {
        const now = new Date();
        const current = getDateRunInfo(now);
        setToday(current);
        if (isTodaySelection(currentSnapshot.selection, current)) {
          await store.cancel();
        } else {
          await store.select(now);
        }
        if (mounted.current) { setToday(getDateRunInfo()); setError(null); }
      }
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error
        ? '저장하지 못했습니다. 다시 시도해주세요.' : '저장소에 접근할 수 없습니다. 다시 시도해주세요.');
    } finally {
      locked.current = false;
    }
  }

  return { today, selected: hydrated && isTodaySelection(snapshot.selection, today),
    ready: hydrated && snapshot.ready, busy: hydrated && snapshot.pending > 0, error, toggle };
}
