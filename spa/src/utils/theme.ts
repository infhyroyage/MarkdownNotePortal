import type { Theme } from "../types/hooks";

/**
 * システムのカラースキームを取得
 * @returns {Theme} テーマ
 */
export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * 保存されているテーマを取得、なければシステムのテーマを返す
 * @returns {Theme} テーマ
 */
export function getSavedTheme(): Theme {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return getSystemTheme();
}

/**
 * テーマをHTMLに適用
 * @param {Theme} theme テーマ
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}
