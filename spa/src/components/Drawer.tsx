import { useEffect, type JSX } from "react";
import type { DrawerProps } from "../types/props";

/**
 * メモのリストを表示するドロワーコンポーネント
 * @param {DrawerProps} props メモのリストを表示するドロワーコンポーネントのProps
 * @returns {JSX.Element} メモのリストを表示するドロワーコンポーネント
 */
export default function Drawer(props: DrawerProps): JSX.Element {
  const { isOpen, onCloseDrawer, memos, selectedMemoId, onSelectMemo } = props;

  // ドロワーが開いている時のみEscapeキーでドロワーを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCloseDrawer]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 z-10 top-16 transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onCloseDrawer}
        aria-hidden="true"
      />
      <div
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-base-100 shadow-lg transition-transform duration-300 z-20 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "250px" }}
      >
        <div className="h-full overflow-y-auto">
          <ul className="menu w-full p-0">
            {memos.map((memo) => (
              <li key={memo.id} className="w-full">
                <button
                  type="button"
                  className={`w-full text-left px-4 py-3 rounded-none ${
                    selectedMemoId === memo.id ? "active" : ""
                  }`}
                  onClick={() => onSelectMemo(memo.id)}
                >
                  {memo.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
