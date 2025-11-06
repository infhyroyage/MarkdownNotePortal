import type { JSX } from "react";
import type { HeaderProps } from "../types/props";
import HamburgerMenuButton from "./HamburgerMenuButton";
import SignOutButton from "./SignOutButton";
import ThemeButton from "./ThemeButton";
import TitleEditor from "./TitleEditor";

/**
 * ヘッダーを表示するコンポーネント
 * @param {HeaderProps} props ヘッダーコンポーネントのProps
 * @returns {JSX.Element} ヘッダーを表示するコンポーネント
 */
export default function Header(props: HeaderProps): JSX.Element {
  const {
    hasSelectedMemo,
    isDrawerOpen,
    onToggleDrawer,
    onUpdateTitle,
    saveStatus,
    title,
  } = props;

  return (
    <header className="navbar bg-base-300 shadow-md sticky top-0 z-10">
      <div className="flex-none">
        <HamburgerMenuButton
          onToggleDrawer={onToggleDrawer}
          isDrawerOpen={isDrawerOpen}
        />
      </div>
      <div className="flex-1">
        <TitleEditor
          title={title}
          hasSelectedMemo={hasSelectedMemo}
          onUpdateTitle={onUpdateTitle}
        />
      </div>
      <div className="flex-none gap-2">
        {hasSelectedMemo && (
          <div className="flex items-center gap-1">
            {saveStatus === "saving" && (
              <span className="loading loading-spinner loading-xs"></span>
            )}
            {saveStatus === "saved" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-success"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        )}
        <ThemeButton />
        {import.meta.env.PROD && <SignOutButton />}
      </div>
    </header>
  );
}
