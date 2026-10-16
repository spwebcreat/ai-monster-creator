// 画像の置き場のホスト。next.config.mjs（next/image の許可先）と /api/saveImage（取得先の許可リスト）で共有する

// getimg.ai が生成画像を一時的に置く場所
export const GETIMG_IMAGE_HOST = 'api-images-getimg.b74c4cef8e39fc0d1de2c7604852a487.r2.cloudflarestorage.com';

// Vercel Blob（保存後の画像）
export const BLOB_IMAGE_HOST = 'byc8tublolbhhpzq.public.blob.vercel-storage.com';
