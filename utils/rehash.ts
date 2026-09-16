import { Integrity, checksum } from '../src/integrity.ts';

type Config = Record<string, unknown> & { integrity: Integrity };

const src_path = Deno.args[0];
const src_text = Deno.readTextFileSync(src_path);
const src: Config = JSON.parse(src_text);
const { integrity: _, ...data } = src;
const integrity = await checksum(data);
console.log(integrity.value);
