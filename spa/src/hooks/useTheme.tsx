import { useEffect, useState } from "react";
import {
  applyTheme,
  getSavedTheme,
  STORAGE_KEY,
} from "../utils/theme";

type Theme = "light" | "dark";

/**
 * テーマ管理用のカスタムフック
 * @returns {{ theme: Theme, toggleTheme: () => void }} 現在のテーマとトグル関数
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(getSavedTheme);

  // 初回マウント時とテーマ変更時にHTMLに適用
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // システムのカラースキーム変更を監視
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(STORAGE_KEY);
      // 明示的にテーマが設定されていない場合のみシステム設定に従う
      if (!saved) {
        const newTheme = e.matches ? "dark" : "light";
        setTheme(newTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return { theme, toggleTheme };
}
