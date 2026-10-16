import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { GETIMG_IMAGE_HOST } from '@/app/constans/imageHosts.mjs';

// 取りに行ってよいのは getimg.ai の画像置き場だけ（任意の URL をサーバーに取得させない）
function parseAllowedImageUrl(imageUrl: unknown): URL | null {
  if (typeof imageUrl !== 'string') return null;
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== GETIMG_IMAGE_HOST || url.port !== '' || url.username || url.password) {
    return null;
  }
  return url;
}

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();
    // console.log('Received imageUrl:', imageUrl); // デバッグ用ログ

    const allowedUrl = parseAllowedImageUrl(imageUrl);
    if (!allowedUrl) {
      return NextResponse.json({ error: 'Invalid imageUrl' }, { status: 400 });
    }

    // 本画像をfetch
    const response = await fetch(allowedUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();

    // vercel Blob に保存する
    // @vercel/blob v1 以降は addRandomSuffix の既定が false（同名パスへの put は失敗する）。
    // 旧版（0.x）と同じく接尾辞を付けて同名衝突を避ける
    const { url } = await put(`monsters/${Date.now()}.png`, blob, {
      access: 'public',
      addRandomSuffix: true,
    });
    // console.log('Saved image URL:', url); // デバッグ用ログ

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Failed to save image:', error);
    // エラーオブジェクトの型を確認し、適切に処理します
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to save image', details: error.message }, { status: 500 });
    } else {
      // エラーがErrorインスタンスでない場合の処理
      return NextResponse.json({ error: 'Failed to save image', details: 'Unknown error occurred' }, { status: 500 });
    }
  }
}