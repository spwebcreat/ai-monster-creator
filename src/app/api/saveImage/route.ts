import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

// 画像をvercel Blob に保存する
export async function POST(request: Request) {

  const { imageUrl } = await request.json();
  // console.log('imageUrl', imageUrl); // 画像URL デバッグ用
  try {
  
    //本画像をfetch
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    //vercel Blob に保存する
    const { url } = await put(`monsters/${Date.now()}.png`, blob, {
      access: 'public',
    })
    // console.log('url', url); // 保存した画像のURL デバック用

    return NextResponse.json({ url });


  } catch(error) {
    console.error('Failed to save image:', error);
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
  }
  
}