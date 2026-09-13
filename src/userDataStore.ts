import { type Locale } from './i18n';
import {
  loadUserData,
  readSnapshot,
  sameSnapshot,
  saveUserData,
  StorageFailure,
  type LoadedData,
  type StorageIssue,
  type StorageSource,
  type WithLock,
} from './storage';
import { type UserData } from './userData';

export type SaveStatus = 'local' | 'saving' | 'saved' | StorageIssue;
export type StoreState = {
  data: UserData;
  status: SaveStatus;
  dirty: boolean;
  canExport: boolean;
};

/** One queue per tab; the origin-wide lock in storage.ts coordinates tabs. */
export class UserDataStore {
  private state: StoreState;
  private baseline;
  private listeners = new Set<() => void>();
  private generation = 0;
  private pending?: Promise<void>;
  private blocked: boolean;
  private recoveringRead: boolean;

  constructor(
    private storage: StorageSource,
    private lock: WithLock,
    private locale: Locale,
    loaded: LoadedData,
  ) {
    this.baseline = loaded.baseline;
    this.blocked = loaded.issue === 'corrupt' || loaded.issue === 'unsupported';
    this.recoveringRead = loaded.issue === 'unavailable';
    this.state = {
      data: loaded.data,
      status: loaded.issue ?? (loaded.verified ? 'saved' : 'local'),
      dirty: false,
      canExport: !loaded.issue,
    };
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(next: Partial<StoreState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  }

  update = (change: (current: UserData) => UserData): Promise<void> => {
    this.generation++;
    this.publish({
      data: structuredClone(change(this.state.data)),
      dirty: true,
      canExport: true,
    });
    return this.flush();
  };

  retry = () => this.flush();

  private flush(): Promise<void> {
    if (this.pending) return this.pending;
    if (this.blocked || !this.state.dirty) return Promise.resolve();
    const run = async () => {
      while (this.state.dirty && !this.blocked) {
        const generation = this.generation;
        const data = this.state.data;
        this.publish({ status: 'saving' });
        try {
          if (this.recoveringRead) {
            const loaded = await loadUserData(this.storage, this.locale);
            if (loaded.issue) throw new StorageFailure(loaded.issue);
            // A previously unreadable browser may already contain user data.
            if (Object.values(loaded.baseline).some((raw) => raw !== null))
              throw new StorageFailure('conflict');
            this.baseline = loaded.baseline;
            this.recoveringRead = false;
          }
          this.baseline = await saveUserData(
            this.storage,
            this.lock,
            this.baseline,
            data,
          );
          if (generation === this.generation)
            this.publish({ status: 'saved', dirty: false });
        } catch (error) {
          const status =
            error instanceof StorageFailure ? error.issue : 'failed';
          this.blocked = status === 'conflict' || status === 'corrupt';
          this.publish({ status });
          break;
        }
      }
    };
    this.pending = run().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  checkExternal = async () => {
    if (this.pending) await this.pending;
    try {
      if (!sameSnapshot(readSnapshot(this.storage), this.baseline)) {
        this.blocked = true;
        this.publish({ status: 'conflict' });
      }
    } catch {
      this.publish({ status: 'unavailable' });
    }
  };

  /** Called only after the user confirms discarding this tab's current edits. */
  reload = async () => {
    if (this.pending) await this.pending;
    const generation = this.generation;
    const loaded = await loadUserData(this.storage, this.locale);
    if (generation !== this.generation) return;
    if (loaded.issue) {
      this.blocked = this.blocked || loaded.issue === 'corrupt';
      this.publish({ status: loaded.issue });
      return;
    }
    this.baseline = loaded.baseline;
    this.blocked = false;
    this.recoveringRead = false;
    this.publish({
      data: loaded.data,
      status: loaded.verified ? 'saved' : 'local',
      dirty: false,
      canExport: true,
    });
  };

  recoverySnapshot = () => ({ ...this.baseline });

  captureRestoreBaseline = () => readSnapshot(this.storage);

  restore = async (
    data: UserData,
    expected: typeof this.baseline,
  ): Promise<boolean> => {
    if (this.pending) await this.pending;
    const generation = this.generation;
    const wasBlocked = this.blocked;
    this.publish({ status: 'saving' });
    let restored = false;
    this.pending = (async () => {
      try {
        const baseline = await saveUserData(
          this.storage,
          this.lock,
          expected,
          data,
        );
        this.baseline = baseline;
        this.recoveringRead = false;
        if (generation !== this.generation) {
          this.blocked = true;
          this.publish({ status: 'conflict' });
          return;
        }
        this.blocked = false;
        this.publish({
          data: structuredClone(data),
          status: 'saved',
          dirty: false,
          canExport: true,
        });
        restored = true;
      } catch (error) {
        const status = error instanceof StorageFailure ? error.issue : 'failed';
        this.blocked =
          wasBlocked || status === 'conflict' || status === 'corrupt';
        this.publish({ status });
      }
    })().finally(() => {
      this.pending = undefined;
    });
    await this.pending;
    return restored;
  };
}
