type Theme = "light" | "dark";

export const STORAGE_KEY = "theme";

/**
 * システムのカラースキームを取得
 * @returns {Theme} システムのカラースキーム
 */
export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * 保存されているテーマを取得、なければシステムのテーマを返す
 * @returns {Theme} 現在のテーマ
 */
export function getSavedTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return getSystemTheme();
}

/**
 * テーマをHTMLに適用
 * @param {Theme} theme - 適用するテーマ
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}
