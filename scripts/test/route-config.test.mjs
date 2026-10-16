// API の窓口の設定の試験。Next 14 は GET だけの窓口で、外への問い合わせ（KV への fetch）の応答を既定で保存する
// （export const dynamic = 'force-dynamic' では止まらない）。保存されると古い値（ログアウト前の世代など）を返すため、
// KV を使う窓口が fetchCache = 'force-no-store' を持つことを確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = fileURLToPath(new URL('../../src/app/api/', import.meta.url));

async function findRoutes(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return findRoutes(fullPath);
    return entry.name === 'route.ts' ? [fullPath] : [];
  }));
  return nested.flat();
}

test('KV を使い GET を持つ窓口は、問い合わせの応答を保存させない', async () => {
  const checked = [];
  for (const file of await findRoutes(API_DIR)) {
    const source = await readFile(file, 'utf8');
    const usesKv = source.includes("from '@vercel/kv'") || source.includes("from '@/app/lib/adminAuth'");
    const hasGet = /export async function GET\b/.test(source);
    if (!usesKv || !hasGet) continue;
    checked.push(path.relative(API_DIR, file));
    assert.match(source, /export const fetchCache = 'force-no-store';/, path.relative(API_DIR, file));
  }
  assert.deepEqual(checked.sort(), ['admin/session/route.ts', 'monsters/route.ts']);
});
