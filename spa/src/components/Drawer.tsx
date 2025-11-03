import { useCallback, useEffect, useState, type JSX } from "react";
import type { DrawerProps } from "../types/props";

/**
 * メモのリストを表示するドロワーコンポーネント
 * @param {DrawerProps} props メモのリストを表示するドロワーコンポーネントのProps
 * @returns {JSX.Element} メモのリストを表示するドロワーコンポーネント
 */
export default function Drawer(props: DrawerProps): JSX.Element {
  const {
    isOpen,
    memos,
    onAddMemo,
    onCloseDrawer,
    onDeleteMemo,
    onSelectMemo,
    selectedMemoId,
  } = props;

  const [memoToDelete, setMemoToDelete] = useState<string | null>(null);

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

  const handleDeleteClick = useCallback((memoId: string): void => {
    setMemoToDelete(memoId);
  }, []);

  const handleConfirmDelete = useCallback((): void => {
    if (memoToDelete) {
      onDeleteMemo(memoToDelete);
      setMemoToDelete(null);
    }
  }, [memoToDelete, onDeleteMemo]);

  const handleCancelDelete = useCallback((): void => {
    setMemoToDelete(null);
  }, []);

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
        <div className="flex flex-col h-full">
          <div className="p-2 border-b border-base-300">
            <button
              type="button"
              className="btn btn-primary btn-sm w-full"
              onClick={onAddMemo}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Memo
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ul className="menu w-full p-0">
              {memos.map((memo) => {
                const isSelected = selectedMemoId === memo.id;
                return (
                  <li key={memo.id} className="w-full">
                    <div
                      className={`flex items-center w-full p-0 ${
                        isSelected
                          ? "border-l-4 border-primary bg-primary/10"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        className={`flex-1 text-left px-4 py-3 rounded-none ${
                          isSelected
                            ? "active font-bold"
                            : "font-normal hover:bg-base-200"
                        }`}
                        onClick={() => onSelectMemo(memo.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-primary"
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
                          <span className={isSelected ? "text-primary" : ""}>
                            {memo.title}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-error btn-sm btn-square mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(memo.id);
                        }}
                      >
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
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      <dialog
        className={`modal ${memoToDelete ? "modal-open" : ""}`}
        aria-labelledby="delete-modal-title"
      >
        <div className="modal-box">
          <p className="py-4">Are you sure you want to delete this memo?</p>
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleCancelDelete}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-error"
              onClick={handleConfirmDelete}
            >
              Delete
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={handleCancelDelete}>
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
