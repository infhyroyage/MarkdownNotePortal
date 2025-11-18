import type { JSX } from "react";
import type { HeaderProps } from "../types/props";
import FormatButton from "./FormatButton";
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
    isFormatting = false,
    layoutMode,
    onFormatMarkdown,
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
      <div className="flex-none flex items-center">
        {hasSelectedMemo && (
          <>
            <div className="flex-2 items-center px-3">
              <SaveStatusIcon saveStatus={saveStatus} />
            </div>
            <FormatButton
              onFormat={onFormatMarkdown}
              isFormatting={isFormatting}
            />
          </>
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
