import {
  DEFAULT_EDITOR_WIDTH_PERCENT,
  LOCAL_STORAGE_KEY_EDITOR_WIDTH,
} from "./const";

/**
 * ローカルストレージからエディターの幅(画面幅のパーセンテージ)を読み込む
 * @returns {number} エディターの幅(画面幅のパーセンテージ)
 */
export function loadEditorWidthPercent(): number {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_EDITOR_WIDTH);
  if (!saved) return DEFAULT_EDITOR_WIDTH_PERCENT;

  // 有効な範囲(20-80%)内であればローカルストレージの値を使用、それ以外はデフォルト値を使用
  const widthPercent = Number.parseFloat(saved);
  return !Number.isNaN(widthPercent) && widthPercent >= 20 && widthPercent <= 80
    ? widthPercent
    : DEFAULT_EDITOR_WIDTH_PERCENT;
}
