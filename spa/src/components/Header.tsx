import type { JSX } from "react";
import ThemeButton from "./ThemeButton";
import SignOutButton from "./SignOutButton";

/**
 * ヘッダーを表示するコンポーネント
 * @returns {JSX.Element} ヘッダーを表示するコンポーネント
 */
export default function Header(): JSX.Element {
  return (
    <header className="navbar bg-base-200 shadow-md sticky top-0 z-10">
      <div className="flex-1">
        <h1 className="text-xl font-bold px-4">Markdown Note Portal</h1>
      </div>
      <div className="flex-none gap-2">
        <ThemeButton />
        <SignOutButton />
      </div>
    </header>
  );
}
