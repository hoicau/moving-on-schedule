export type BuildInfo = {
  version: string;
  commit: string | null;
  dirty: boolean | null;
  builtAt: string;
  backupFormatVersion: number;
  storageFormatVersion: number;
};

// Vite embeds the same snapshot in the client and build-info.json.
declare const __APP_BUILD__: BuildInfo;
export const buildInfo = __APP_BUILD__;
