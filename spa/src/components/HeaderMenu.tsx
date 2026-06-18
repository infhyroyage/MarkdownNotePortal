import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import useTheme from "../hooks/useTheme";
import type { HeaderMenuProps } from "../types/props";

/**
 * ヘッダー右側の操作をまとめたドロップダウンメニューを表示するコンポーネント
 * @param {HeaderMenuProps} props ヘッダーメニューコンポーネントのProps
 * @returns {JSX.Element} ヘッダーメニューを表示するコンポーネント
 */
export default function HeaderMenu(props: HeaderMenuProps): JSX.Element {
  const {
    hasSelectedMemo,
    isFormatting = false,
    isExporting = false,
    layoutMode,
    onFormat,
    onExportPdf,
    onToggleLayout,
  } = props;
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    toggleButtonRef.current?.blur();
  }, []);

  // メニュー外のクリックとEscapeキーでメニューを閉じる
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // 以下の操作でメニューを閉じるようにイベントリスナーを設定する
    // * メニュー外クリックイベント
    // * Escapeキー入力イベント
    const onClickOutside = (event: MouseEvent) => {
      const dropdown = dropdownRef.current;
      if (dropdown && !dropdown.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };
    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMenu, isOpen]);

  const onToggleMenu = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        toggleButtonRef.current?.blur();
        return false;
      }
      return true;
    });
  }, []);

  const onClickFormat = useCallback(() => {
    closeMenu();
    onFormat();
  }, [closeMenu, onFormat]);

  const onClickExportPdf = useCallback(() => {
    closeMenu();
    onExportPdf();
  }, [closeMenu, onExportPdf]);

  const onClickToggleLayout = useCallback(() => {
    closeMenu();
    onToggleLayout();
  }, [closeMenu, onToggleLayout]);

  const onClickToggleTheme = useCallback(() => {
    closeMenu();
    toggleTheme();
  }, [closeMenu, toggleTheme]);

  // ログアウトメニュー押下時に、Lambda@Edgeのログアウト処理にリダイレクト
  const onClickLogout = useCallback(() => {
    window.location.href = `${window.location.origin}/?logout=true`;
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={`dropdown dropdown-end dropdown-bottom${isOpen ? " dropdown-open" : " dropdown-close"}`}
    >
      <button
        ref={toggleButtonRef}
        type="button"
        className="btn btn-square btn-ghost"
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Menu"
        onClick={onToggleMenu}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="inline-block h-5 w-5 stroke-current"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
          />
        </svg>
      </button>
      <ul className="menu text-md dropdown-content bg-base-100 rounded-box z-20 inset-e-0 top-full mt-1 w-max p-2 shadow [&_li>*]:w-auto [&_li>*]:whitespace-nowrap">
        {hasSelectedMemo && (
          <li>
            <button
              type="button"
              onClick={onClickFormat}
              disabled={isFormatting}
            >
              {isFormatting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.455 2.456Z"
                  />
                </svg>
              )}
              Format
            </button>
          </li>
        )}
        {hasSelectedMemo && (
          <li>
            <button
              type="button"
              onClick={onClickExportPdf}
              disabled={isExporting}
            >
              {isExporting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              )}
              Export PDF
            </button>
          </li>
        )}
        <li>
          <button type="button" onClick={onClickToggleLayout}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              {layoutMode === "horizontal" ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v12a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18V6z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 3.75A2.25 2.25 0 013.75 6v2.25A2.25 2.25 0 016 10.5h12a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75H6zM6 13.5a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25h12A2.25 2.25 0 0020.25 18v-2.25A2.25 2.25 0 0018 13.5H6z"
                />
              )}
            </svg>
            Switch layout
          </button>
        </li>
        <li>
          <button type="button" onClick={onClickToggleTheme}>
            {theme === "light" ? (
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
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
            ) : (
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
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            )}
            Switch theme
          </button>
        </li>
        {import.meta.env.PROD && (
          <li>
            <button type="button" onClick={onClickLogout}>
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
              Sign out
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
