// 試験用: 画像の保存先（Vercel Blob）への HEAD を外へ出さず、200 を返す（node --import で先に読む）。
// URL に「missing」を含む画像だけ 404 にする。それ以外の通信は通常どおり
import { BLOB_IMAGE_HOST } from '../../src/app/constans/imageHosts.mjs';

const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === BLOB_IMAGE_HOST) {
    if (init.method !== 'HEAD') throw new Error(`stubImageHead: unexpected ${init.method ?? 'GET'} to the image host`);
    return new Response(null, { status: url.pathname.includes('missing') ? 404 : 200 });
  }
  return realFetch(input, init);
};
