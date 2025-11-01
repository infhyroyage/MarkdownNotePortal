import type { JSX } from "react";
import { useCallback } from "react";
import { getLogoutUrl } from "../utils/auth";

/**
 * ログアウトボタンを表示するコンポーネント
 * @returns {JSX.Element} ログアウトボタンを表示するコンポーネント
 */
export default function SignOutButton(): JSX.Element {
  // ログアウトボタン押下時に、Cognito Hosted UIのログアウトページにリダイレクト
  const onClickLogout = useCallback(() => {
    window.location.href = getLogoutUrl();
  }, []);

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={onClickLogout}
      aria-label="ログアウト"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
        />
      </svg>
    </button>
  );
}
