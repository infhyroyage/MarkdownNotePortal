import type { JSX } from "react";

/**
 * ErrorAlertコンポーネントのプロパティ
 */
interface ErrorAlertProps {
  /**
   * エラーメッセージ
   */
  message: string;
  /**
   * Alertを閉じる処理
   */
  onClose: () => void;
}

/**
 * エラーメッセージを表示するAlertコンポーネント
 * @param {ErrorAlertProps} props プロパティ
 * @returns {JSX.Element} エラーアラート
 */
export default function ErrorAlert({
  message,
  onClose,
}: ErrorAlertProps): JSX.Element {
  return (
    <div className="toast toast-top toast-center z-50">
      <div className="alert alert-error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{message}</span>
        <button
          type="button"
          className="btn btn-sm btn-circle btn-ghost"
          onClick={onClose}
          aria-label="Close error message"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
