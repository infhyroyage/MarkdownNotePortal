import type { JSX } from "react";
import type { HeaderProps } from "../types/props";
import HamburgerMenuButton from "./HamburgerMenuButton";
import LayoutToggleButton from "./LayoutToggleButton";
import SaveStatusIcon from "./SaveStatusIcon";
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
    layoutMode,
    onToggleDrawer,
    onToggleLayout,
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
      <div className="flex-none gap-2 flex items-center">
        {hasSelectedMemo && (
          <div className="flex items-center gap-1">
            <SaveStatusIcon saveStatus={saveStatus} />
          </div>
        )}
        <LayoutToggleButton
          layoutMode={layoutMode}
          onToggleLayout={onToggleLayout}
        />
        <ThemeButton />
        {import.meta.env.PROD && <SignOutButton />}
      </div>
    </header>
  );
}
