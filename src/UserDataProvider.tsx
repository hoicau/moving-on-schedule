import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from './storage';
import { UserDataStore } from './userDataStore';

const Context = createContext<UserDataStore | null>(null);
export function UserDataProvider({
  store,
  children,
}: {
  store: UserDataStore;
  children: ReactNode;
}) {
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === null || STORAGE_KEYS.includes(event.key))
        void store.checkExternal();
    };
    const focus = () => {
      void store.checkExternal();
    };
    const visible = () => {
      if (document.visibilityState === 'visible') focus();
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (
        store.getSnapshot().dirty ||
        store.getSnapshot().status === 'saving'
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('storage', sync);
    window.addEventListener('focus', focus);
    window.addEventListener('beforeunload', unload);
    document.addEventListener('visibilitychange', visible);
    // Catch a change between the initial asynchronous read and mounting.
    focus();
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', focus);
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useUserData() {
  const store = useContext(Context);
  if (!store) throw new Error('useUserData requires UserDataProvider');
  return { ...useSyncExternalStore(store.subscribe, store.getSnapshot), store };
}
