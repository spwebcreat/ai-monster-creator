'use server';

import { revalidatePath } from 'next/cache';

// 再検証を行うサーバーアクションを定義
export async function revalidateRoot() {
  revalidatePath('/');
}