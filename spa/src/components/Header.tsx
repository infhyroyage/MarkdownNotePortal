import type { JSX } from "react";
import type { HeaderProps } from "../types/props";
import SignOutButton from "./SignOutButton";
import ThemeButton from "./ThemeButton";

/**
 * ヘッダーを表示するコンポーネント
 * @param {HeaderProps} props ヘッダーコンポーネントのProps
 * @returns {JSX.Element} ヘッダーを表示するコンポーネント
 */
export default function Header(props: HeaderProps): JSX.Element {
  return (
    <header className="navbar bg-base-200 shadow-md sticky top-0 z-10">
      <div className="flex-none">
        <button
          type="button"
          className="btn btn-square btn-ghost"
          onClick={props.onToggleDrawer}
          aria-label="Toggle memo drawer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block w-5 h-5 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1">
        <h1 className="text-xl font-bold px-4">{props.title}</h1>
      </div>
      <div className="flex-none gap-2">
        <ThemeButton />
        <SignOutButton />
      </div>
    </header>
  );
}
