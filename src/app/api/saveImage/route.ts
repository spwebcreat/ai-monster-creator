import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();
    // console.log('Received imageUrl:', imageUrl); // デバッグ用ログ

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid or missing imageUrl');
    }

    // 本画像をfetch
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();

    // vercel Blob に保存する
    const { url } = await put(`monsters/${Date.now()}.png`, blob, {
      access: 'public',
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