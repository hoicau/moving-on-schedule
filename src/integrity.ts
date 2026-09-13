export type Integrity = { algorithm: 'SHA-256'; value: string };

// Canonical JSON v1: sorted object keys (UTF-16 order), original array order,
// JSON.stringify primitives, no whitespace; UTF-8 bytes. JSON values only.
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  }
  throw new Error('Integrity checks require JSON values.');
}

export async function checksum(value: unknown): Promise<Integrity> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return {
    algorithm: 'SHA-256',
    value: [...new Uint8Array(digest)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join(''),
  };
}

export async function verifyIntegrity(
  value: unknown,
  integrity: Integrity,
): Promise<void> {
  if (
    integrity?.algorithm !== 'SHA-256' ||
    !/^[a-f0-9]{64}$/.test(integrity.value) ||
    (await checksum(value)).value !== integrity.value
  )
    throw new Error('Data integrity check failed.');
}
