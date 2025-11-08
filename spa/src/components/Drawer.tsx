import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import type { DrawerProps } from "../types/props";
import type { Memo } from "../types/state";
import DeleteMemoModal from "./DeleteMemoModal";
import DrawerMemoButton from "./DrawerMemoButton";

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

  const [deleteMemoId, setDeleteMemoId] = useState<string | null>(null);

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

  const deleteMemoTitle: string | null = useMemo(() => {
    if (!deleteMemoId) return null;
    return memos.find((memo: Memo) => memo.id === deleteMemoId)?.title ?? null;
  }, [deleteMemoId, memos]);

  const handleDeleteClick = useCallback((memoId: string): void => {
    setDeleteMemoId(memoId);
  }, []);

  const handleDeleteModal = useCallback((): void => {
    if (deleteMemoId) {
      onDeleteMemo(deleteMemoId);
      setDeleteMemoId(null);
    }
  }, [deleteMemoId, onDeleteMemo]);

  const handleCancelModal = useCallback((): void => {
    setDeleteMemoId(null);
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
              {memos.map((memo: Memo) => (
                <DrawerMemoButton
                  key={memo.id}
                  memoId={memo.id}
                  isSelected={selectedMemoId === memo.id}
                  memoTitle={memo.title}
                  onDeleteClick={handleDeleteClick}
                  onSelectMemo={onSelectMemo}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
      {deleteMemoTitle && (
        <DeleteMemoModal
          title={deleteMemoTitle}
          onCancel={handleCancelModal}
          onDelete={handleDeleteModal}
        />
      )}
    </>
  );
}
