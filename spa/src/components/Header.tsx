import type { JSX } from "react";
import type { HeaderProps } from "../types/props";
import HamburgerMenuButton from "./HamburgerMenuButton";
import SignOutButton from "./SignOutButton";
import ThemeButton from "./ThemeButton";

/**
 * ヘッダーを表示するコンポーネント
 * @param {HeaderProps} props ヘッダーコンポーネントのProps
 * @returns {JSX.Element} ヘッダーを表示するコンポーネント
 */
export default function Header(props: HeaderProps): JSX.Element {
  const { onToggleDrawer, isDrawerOpen, title } = props;

  return (
    <header className="navbar bg-base-300 shadow-md sticky top-0 z-10">
      <div className="flex-none">
        <HamburgerMenuButton
          onToggleDrawer={onToggleDrawer}
          isDrawerOpen={isDrawerOpen}
        />
      </div>
      <div className="flex-1">
        <h1 className="text-xl font-bold px-4">{title}</h1>
      </div>
      <div className="flex-none gap-2">
        <ThemeButton />
        <SignOutButton />
      </div>
    </header>
  );
}
