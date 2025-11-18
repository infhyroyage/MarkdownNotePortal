import type { JSX } from "react";

/**
 * フォーマットボタンを表示するコンポーネントのProps
 */
export interface FormatButtonProps {
  /**
   * フォーマット中である場合はtrue、それ以外はfalse
   */
  isFormatting?: boolean;

  /**
   * フォーマットボタンをクリックした時の処理
   */
  onFormat: () => void;
}

/**
 * Markdownをフォーマットするボタンを表示するコンポーネント
 * @param {FormatButtonProps} props フォーマットボタンコンポーネントのProps
 * @returns {JSX.Element} フォーマットボタンを表示するコンポーネント
 */
export default function FormatButton(props: FormatButtonProps): JSX.Element {
  const { isFormatting = false, onFormat } = props;

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={onFormat}
      disabled={isFormatting}
      aria-label="Format Markdown"
      title="Format Markdown"
    >
      {isFormatting ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      )}
    </button>
  );
}
