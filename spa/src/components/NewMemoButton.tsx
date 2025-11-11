import type { JSX } from "react";
import type { NewMemoButtonProps } from "../types/props";

/**
 * New Memoボタンを表示するコンポーネント
 * @param {NewMemoButtonProps} props New Memoボタンを表示するコンポーネントのProps
 * @returns {JSX.Element} New Memoボタンを表示するコンポーネント
 */
export default function NewMemoButton(props: NewMemoButtonProps): JSX.Element {
  const { className, isLoading = false, onClick } = props;

  return (
    <button
      type="button"
      className={`btn btn-primary btn-sm ${className ?? ""}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <span className="loading loading-spinner loading-sm"></span>
          Creating...
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Memo
        </>
      )}
    </button>
  );
}
