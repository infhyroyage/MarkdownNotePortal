/**
 * テーマ(ライトモードの場合は"light"、ダークモードの場合は"dark")
 */
export type Theme = "light" | "dark";

/**
 * テーマ管理用のカスタムフックの戻り値の型
 */
export interface UseThemeReturnType {
  /**
   * 現在のテーマ
   */
  theme: Theme;

  /**
   * テーマを切り替える関数
   */
  toggleTheme: () => void;
}
