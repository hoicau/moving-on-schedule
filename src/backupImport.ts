import { decodeSaved } from './schedule';
import { validatePreferences } from './userData';
import { verifyIntegrity } from './integrity';
import type { BackupV1 } from './backup';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '../public/schemas/backup-v1.schema.json';

const ajv = new Ajv2020();
addFormats(ajv);
const validateSchema = ajv.compile<BackupV1>(schema);

export class BackupError extends Error {
  constructor(public key: string) {
    super(key);
  }
}

export async function verifyBackup(backup: unknown): Promise<BackupV1> {
  if (
    backup &&
    typeof backup === 'object' &&
    'format' in backup &&
    backup.format === 'moving-on-schedule' &&
    'version' in backup &&
    backup.version !== 1
  )
    throw new BackupError('backup.unsupported');
  if (!validateSchema(backup)) throw new BackupError('backup.invalid');
  const { integrity, ...content } = backup;
  try {
    await verifyIntegrity(content, integrity);
  } catch {
    throw new BackupError('backup.integrityFailed');
  }
  try {
    decodeSaved(JSON.stringify({ ...backup.schedule, version: 1 }));
    validatePreferences(backup.preferences);
  } catch {
    throw new BackupError('backup.invalid');
  }
  return backup;
}

export async function readBackup(file: File): Promise<BackupV1> {
  if (file.size >= 50 * 1024 * 1024) throw new BackupError('backup.tooLarge');
  let value: unknown;
  try {
    value = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
  } catch {
    throw new BackupError('backup.invalid');
  }
  return verifyBackup(value);
}
