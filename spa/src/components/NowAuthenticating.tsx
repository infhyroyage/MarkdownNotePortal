import type { JSX } from "react";

/**
 * 認証中を表示するコンポーネント
 * @returns {JSX.Element} 認証中を表示するコンポーネント
 */
export default function NowAuthenticating(): JSX.Element {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4 text-lg">認証中...</p>
      </div>
    </div>
  );
}
