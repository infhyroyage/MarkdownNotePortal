import type { LayoutMode } from "../types/state";

/**
 * ディスプレイの向きからデフォルトのレイアウトモードを取得
 * 正方形のディスプレイはCSSの向きの定義と同様に縦長として扱う
 * @returns {LayoutMode} 横長の長方形のディスプレイの場合はhorizontal、それ以外の縦長のディスプレイの場合はvertical
 */
export function getDefaultLayoutMode(): LayoutMode {
  return window.matchMedia("(orientation: landscape)").matches
    ? "horizontal"
    : "vertical";
}
