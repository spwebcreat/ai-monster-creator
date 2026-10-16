// 生成画像の大きさ（縦長 2:3。全身が足先まで収まるように）。getimg.ai への指定と、生成結果の表示で共有する。
// getimg.ai の flux-schnell は幅・高さとも 256〜1280 の 8 の倍数（FLUX の公式実装は 16 の倍数に丸める）。
// 料金は幅×高さ×steps に比例するため、これまでの 1024×1024（1,048,576 画素）を超えない 832×1248（1,038,336 画素）
export const MONSTER_IMAGE_WIDTH = 832;
export const MONSTER_IMAGE_HEIGHT = 1248;
