import type { ChangeEvent, JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const {
    onToggleDrawer,
    isDrawerOpen,
    title,
    onUpdateTitle,
    hasSelectedMemo,
  } = props;

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>(title);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // タイトルが変更されたら、編集中のタイトルも更新
  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  // 編集モードになったら、入力欄にフォーカス
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = useCallback((): void => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== title) {
      onUpdateTitle(trimmedTitle);
    } else if (!trimmedTitle) {
      // 空の場合は元に戻す
      setEditedTitle(title);
    }
    setIsEditing(false);
  }, [editedTitle, title, onUpdateTitle]);

  // 外部クリックを検知して編集モードを終了
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleSaveTitle();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, handleSaveTitle]);

  const handleTitleClick = useCallback((): void => {
    if (hasSelectedMemo) {
      setIsEditing(true);
    }
  }, [hasSelectedMemo]);

  const handleTitleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      setEditedTitle(e.target.value);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        handleSaveTitle();
      } else if (e.key === "Escape") {
        setEditedTitle(title);
        setIsEditing(false);
      }
    },
    [handleSaveTitle, title]
  );

  return (
    <header className="navbar bg-base-300 shadow-md sticky top-0 z-10">
      <div className="flex-none">
        <HamburgerMenuButton
          onToggleDrawer={onToggleDrawer}
          isDrawerOpen={isDrawerOpen}
        />
      </div>
      <div className="flex-1">
        {isEditing ? (
          <input
            ref={(node) => {
              inputRef.current = node;
              containerRef.current = node;
            }}
            type="text"
            value={editedTitle}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            className="input input-bordered input-sm w-full max-w-md text-xl font-bold mx-4"
          />
        ) : (
          <h1
            ref={(node) => {
              containerRef.current = node;
            }}
            className={`text-xl font-bold px-4 transition-colors ${
              hasSelectedMemo
                ? "cursor-pointer hover:text-primary"
                : "cursor-default"
            }`}
            onClick={handleTitleClick}
          >
            {title}
          </h1>
        )}
      </div>
      <div className="flex-none gap-2">
        <ThemeButton />
        <SignOutButton />
      </div>
    </header>
  );
}
