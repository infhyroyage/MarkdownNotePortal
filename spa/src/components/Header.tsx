import type { JSX } from "react";
import { useCallback } from "react";
import { getLogoutUrl } from "../utils/auth";

/**
 * ヘッダーを表示するコンポーネント
 * @returns {JSX.Element} ヘッダーを表示するコンポーネント
 */
export default function Header(): JSX.Element {
  // ログアウトボタン押下時に、Cognito Hosted UIのログアウトページにリダイレクト
  const onClickLogout = useCallback(() => {
    window.location.href = getLogoutUrl();
  }, []);

  return (
    <header className="navbar bg-base-200 shadow-md sticky top-0 z-10">
      <div className="flex-1">
        <h1 className="text-xl font-bold px-4">Markdown Note Portal</h1>
      </div>
      <div className="flex-none">
        <button className="btn btn-ghost btn-sm" onClick={onClickLogout}>
          ログアウト
        </button>
      </div>
    </header>
  );
}
