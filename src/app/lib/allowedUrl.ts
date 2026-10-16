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

// 保存済み画像（Vercel Blob）の URL か。/api/monsters の検証と、画像を src・href に使う描画側で共有する
export function isBlobImageUrl(value: unknown): value is string {
  return parseHttpsUrlOnHost(value, BLOB_IMAGE_HOST) !== null;
}
