// URL が「https かつ指定のホスト」かを判定する（取得先・保存・描画の許可リスト）
import { BLOB_IMAGE_HOST } from '@/app/constans/imageHosts.mjs';

export function parseHttpsUrlOnHost(value: unknown, host: string): URL | null {
  if (typeof value !== 'string') return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== host || url.port !== '' || url.username || url.password) {
    return null;
  }
  return url;
}

const BLOB_IMAGE_URL_MAX_LENGTH = 512;
const BLOB_IMAGE_PATH_PREFIX = '/monsters/';

// 保存済み画像（Vercel Blob）の URL か。/api/monsters の検証と、画像を src・href に使う描画側で共有する
export function isBlobImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > BLOB_IMAGE_URL_MAX_LENGTH) return false;
  // 末尾が「?」「#」だけでも URL の search・hash は空になるため、元の文字列で確かめる
  if (value.includes('?') || value.includes('#')) return false;
  const url = parseHttpsUrlOnHost(value, BLOB_IMAGE_HOST);
  return url !== null && url.pathname.startsWith(BLOB_IMAGE_PATH_PREFIX);
}
