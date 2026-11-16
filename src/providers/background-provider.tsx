import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  BACKGROUNDS,
  BACKGROUND_IDS,
  DEFAULT_BACKGROUND_ID,
  type BackgroundId,
  type BackgroundTheme,
} from '@/constants/backgrounds';

const STORAGE_KEY = 'wordjam.background';

type BackgroundContextValue = BackgroundTheme & {
  setBackground: (id: BackgroundId) => void;
};

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

function isBackgroundId(value: string | null): value is BackgroundId {
  return value !== null && (BACKGROUND_IDS as string[]).includes(value);
}

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<BackgroundId>(DEFAULT_BACKGROUND_ID);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (active && isBackgroundId(stored)) setId(stored);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setBackground = useCallback((next: BackgroundId) => {
    setId(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ ...BACKGROUNDS[id], setBackground }), [id, setBackground]);

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground() {
  const value = useContext(BackgroundContext);
  if (!value) throw new Error('useBackground must be used within BackgroundProvider');
  return value;
}
