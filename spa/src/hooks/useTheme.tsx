import { useCallback, useEffect, useState } from "react";
import type { Theme, UseThemeReturnType } from "../types/hooks";
import { applyTheme, getSavedTheme } from "../utils/theme";

/**
 * テーマ管理用のカスタムフック
 * @returns {UseThemeReturnType} テーマ管理用のカスタムフックの戻り値
 */
export default function useTheme(): UseThemeReturnType {
  const [theme, setTheme] = useState<Theme>(getSavedTheme());

  // 初回マウント時とテーマ変更時にHTMLに適用
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // システムのカラースキーム変更を監視
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem("theme");
      // 明示的にテーマが設定されていない場合のみシステム設定に従う
      if (!saved) {
        const newTheme = e.matches ? "dark" : "light";
        setTheme(newTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  }, [setTheme]);

  return { theme, toggleTheme };
}
