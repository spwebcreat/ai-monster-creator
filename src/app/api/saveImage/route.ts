import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { GETIMG_IMAGE_HOST } from '@/app/constans/imageHosts.mjs';
import { parseHttpsUrlOnHost } from '@/app/lib/allowedUrl';

// 画像の取得と Blob への保存に余裕を持たせる
export const maxDuration = 30;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 取りに行ってよいのは getimg.ai の画像置き場だけ（任意の URL をサーバーに取得させない）
  const allowedUrl = parseHttpsUrlOnHost((body as Record<string, unknown>).imageUrl, GETIMG_IMAGE_HOST);
  if (!allowedUrl) {
    return NextResponse.json({ error: 'Invalid imageUrl' }, { status: 400 });
  }

  try {
    // 本画像をfetch（転送先へ付いて行くと許可リストを外れうるため、転送は失敗扱い）
    const response = await fetch(allowedUrl, { cache: 'no-store', redirect: 'error' });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();

    // vercel Blob に保存する
    // @vercel/blob v1 以降は addRandomSuffix の既定が false（同名パスへの put は失敗する）。
    // 旧版（0.x）と同じく接尾辞を付けて同名衝突を避ける
    const { url } = await put(`monsters/${Date.now()}.png`, blob, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({ url });
  } catch (error) {
    // 内部のエラー文はサーバーのログにだけ残し、応答には含めない
    console.error('Failed to save image:', error);
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
  }
}
